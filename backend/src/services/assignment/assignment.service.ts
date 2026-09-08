import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import { shipmentEventRepository } from '../../repositories/shipment-event.repository';
import { shipmentRepository } from '../../repositories/shipment.repository';
import { userRepository } from '../../repositories/user.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import type { ShipmentStatus } from '../../types/domain';
import { isVehicleTypeCompatible } from '../matching/matching.service';
import { shipmentService, type ShipmentView } from '../shipment/shipment.service';
import { assertShipmentTransition } from '../shipment/shipment.state-machine';

const statusEvent = {
  PICKED_UP: { type: 'PICKED_UP', message: 'Shipment picked up by transporter' },
  IN_TRANSIT: { type: 'DEPARTED', message: 'Shipment is in transit' },
  DELIVERED: { type: 'DELIVERED', message: 'Shipment delivered successfully' },
} as const;

export class AssignmentService {
  public async assign(
    shipmentId: string,
    shipperId: string,
    vehicleId: string,
  ): Promise<ShipmentView> {
    let shipment = await shipmentService.getForShipper(shipmentId, shipperId);

    if (!['CREATED', 'MATCHED'].includes(shipment.status)) {
      throw new AppError(409, 'CONFLICT', 'This shipment cannot be assigned in its current state');
    }

    const vehicle = await vehicleRepository.findById(vehicleId);

    if (!vehicle || vehicle.status !== 'AVAILABLE' || !vehicle.isAvailable || vehicle.activeShipmentId) {
      throw new AppError(409, 'CONFLICT', 'This vehicle is no longer available');
    }

    if (
      vehicle.capacityWeight < shipment.weight ||
      (shipment.volume !== undefined && (vehicle.capacityVolume ?? 0) < shipment.volume) ||
      !isVehicleTypeCompatible(shipment.vehicleTypeRequired, vehicle.vehicleType)
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Vehicle is not eligible for this shipment');
    }

    const transporter = await userRepository.findActiveById(vehicle.transporterId.toString());

    if (!transporter || transporter.role !== 'TRANSPORTER') {
      throw new AppError(409, 'CONFLICT', 'Vehicle transporter is not eligible');
    }

    const reservedVehicle = await vehicleRepository.reserveForShipment(vehicleId, shipmentId);

    if (!reservedVehicle) {
      throw new AppError(409, 'CONFLICT', 'This vehicle was just assigned to another shipment');
    }

    try {
      if (shipment.status === 'CREATED') {
        assertShipmentTransition('CREATED', 'MATCHED');
        const matchedShipment = await shipmentRepository.update(shipment.id, { status: 'MATCHED' });
        if (!matchedShipment) {
          throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
        }
        await shipmentEventRepository.createSystemEvent(
          shipment.id,
          'MATCH_FOUND',
          'MATCHED',
          'Matching candidates are available',
        );
        shipment = matchedShipment;
      }

      assertShipmentTransition(shipment.status, 'ASSIGNED');
      const assignedShipment = await shipmentRepository.update(shipment.id, {
        status: 'ASSIGNED',
        assignedTransporterId: transporter._id,
        assignedVehicleId: reservedVehicle._id,
        assignmentStatus: 'PENDING',
      });

      if (!assignedShipment) {
        throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
      }

      await shipmentEventRepository.create({
        shipmentId: assignedShipment._id,
        type: 'VEHICLE_ASSIGNED',
        status: 'ASSIGNED',
        message: 'Vehicle ' + reservedVehicle.registrationNumber + ' assigned; awaiting transporter acceptance',
        actorId: new Types.ObjectId(shipperId),
        actorType: 'USER',
        timestamp: new Date(),
      });

      return shipmentService.toView(assignedShipment);
    } catch (error) {
      await vehicleRepository.releaseFromShipment(vehicleId, shipmentId);
      throw error;
    }
  }

  public async accept(shipmentId: string, transporterId: string): Promise<ShipmentView> {
    const shipment = await shipmentService.getDocumentForActor(shipmentId, {
      id: transporterId,
      role: 'TRANSPORTER',
    });

    if (shipment.assignedTransporterId?.toString() !== transporterId || shipment.status !== 'ASSIGNED') {
      throw new AppError(403, 'FORBIDDEN', 'You are not allowed to accept this assignment');
    }

    const updated = await shipmentRepository.update(shipment.id, { assignmentStatus: 'ACCEPTED' });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    await shipmentEventRepository.create({
      shipmentId: updated._id,
      type: 'ASSIGNMENT_ACCEPTED',
      status: 'ASSIGNED',
      message: 'Transporter accepted the assignment',
      actorId: new Types.ObjectId(transporterId),
      actorType: 'USER',
      timestamp: new Date(),
    });

    return shipmentService.toView(updated);
  }

  public async reject(shipmentId: string, transporterId: string): Promise<ShipmentView> {
    const shipment = await shipmentService.getDocumentForActor(shipmentId, {
      id: transporterId,
      role: 'TRANSPORTER',
    });

    if (
      shipment.assignedTransporterId?.toString() !== transporterId ||
      shipment.status !== 'ASSIGNED' ||
      !shipment.assignedVehicleId
    ) {
      throw new AppError(403, 'FORBIDDEN', 'You are not allowed to reject this assignment');
    }

    const releasedVehicleId = shipment.assignedVehicleId.toString();
    const updated = await shipmentRepository.clearAssignmentAndSetMatched(shipment.id);

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    await vehicleRepository.releaseFromShipment(releasedVehicleId, shipment.id);
    await shipmentEventRepository.create({
      shipmentId: updated._id,
      type: 'ASSIGNMENT_REJECTED',
      status: 'MATCHED',
      message: 'Transporter rejected the assignment; vehicle released',
      actorId: new Types.ObjectId(transporterId),
      actorType: 'USER',
      timestamp: new Date(),
    });

    return shipmentService.toView(updated);
  }

  public async updateStatus(
    shipmentId: string,
    transporterId: string,
    nextStatus: Extract<ShipmentStatus, 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'>,
  ): Promise<ShipmentView> {
    const shipment = await shipmentService.getDocumentForActor(shipmentId, {
      id: transporterId,
      role: 'TRANSPORTER',
    });

    if (
      shipment.assignedTransporterId?.toString() !== transporterId ||
      !shipment.assignedVehicleId ||
      shipment.assignmentStatus !== 'ACCEPTED'
    ) {
      throw new AppError(403, 'FORBIDDEN', 'Accept the assignment before updating shipment status');
    }

    assertShipmentTransition(shipment.status, nextStatus);
    const metadata = statusEvent[nextStatus];
    const updated = await shipmentRepository.update(shipment.id, { status: nextStatus });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    if (nextStatus === 'PICKED_UP' || nextStatus === 'IN_TRANSIT') {
      await vehicleRepository.setTransitStatus(shipment.assignedVehicleId.toString(), shipment.id);
    }

    if (nextStatus === 'DELIVERED') {
      await vehicleRepository.releaseFromShipment(shipment.assignedVehicleId.toString(), shipment.id);
    }

    await shipmentEventRepository.create({
      shipmentId: updated._id,
      type: metadata.type,
      status: nextStatus,
      message: metadata.message,
      actorId: new Types.ObjectId(transporterId),
      actorType: 'USER',
      timestamp: new Date(),
    });

    return shipmentService.toView(updated);
  }
}

export const assignmentService = new AssignmentService();
