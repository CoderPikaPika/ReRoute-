import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import { shipmentEventRepository } from '../../repositories/shipment-event.repository';
import { shipmentRepository } from '../../repositories/shipment.repository';
import { trackingRepository } from '../../repositories/tracking.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import type { AuthenticatedUser } from '../../types/auth';
import { shipmentService } from '../shipment/shipment.service';

export class TrackingService {
  public async get(shipmentId: string, actor: AuthenticatedUser) {
    const shipment = await shipmentService.getDocumentForActor(shipmentId, actor);
    const [events, updates, vehicle] = await Promise.all([
      shipmentEventRepository.listForShipment(shipmentId),
      trackingRepository.listForShipment(shipmentId),
      shipment.assignedVehicleId
        ? vehicleRepository.findById(shipment.assignedVehicleId.toString())
        : Promise.resolve(null),
    ]);
    const currentLocation =
      updates.at(-1) ??
      (vehicle
        ? {
            label: vehicle.currentLocation.label,
            latitude: vehicle.currentLocation.latitude,
            longitude: vehicle.currentLocation.longitude,
            timestamp: vehicle.currentLocation.updatedAt,
          }
        : shipment.route[shipment.currentRouteIndex]);

    return {
      shipment: await shipmentService.toView(shipment),
      route: shipment.route,
      currentLocation,
      updates,
      events,
      simulation: true,
    };
  }

  public async simulateNextPoint(shipmentId: string, transporterId: string) {
    const shipment = await shipmentService.getDocumentForActor(shipmentId, {
      id: transporterId,
      role: 'TRANSPORTER',
    });

    if (
      shipment.assignedTransporterId?.toString() !== transporterId ||
      !shipment.assignedVehicleId ||
      !['PICKED_UP', 'IN_TRANSIT'].includes(shipment.status)
    ) {
      throw new AppError(403, 'FORBIDDEN', 'Only the assigned transporter can simulate this active shipment');
    }

    const nextIndex = Math.min(shipment.currentRouteIndex + 1, shipment.route.length - 1);
    if (nextIndex === shipment.currentRouteIndex) {
      throw new AppError(409, 'CONFLICT', 'Vehicle is already at the final route point');
    }

    const nextPoint = shipment.route[nextIndex];
    const updatedShipment = await shipmentRepository.update(shipment.id, {
      currentRouteIndex: nextIndex,
    });

    if (!updatedShipment) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    await Promise.all([
      vehicleRepository.updateLocation(shipment.assignedVehicleId.toString(), {
        ...nextPoint,
        updatedAt: new Date(),
      }),
      trackingRepository.create({
        shipmentId: new Types.ObjectId(shipment.id),
        vehicleId: shipment.assignedVehicleId,
        latitude: nextPoint.latitude,
        longitude: nextPoint.longitude,
        label: nextPoint.label,
        source: 'SIMULATION',
        timestamp: new Date(),
      }),
      shipmentEventRepository.create({
        shipmentId: new Types.ObjectId(shipment.id),
        type: 'LOCATION_UPDATED',
        status: updatedShipment.status,
        location: nextPoint,
        message: 'Prototype simulation moved vehicle to ' + nextPoint.label,
        actorId: new Types.ObjectId(transporterId),
        actorType: 'USER',
        timestamp: new Date(),
      }),
    ]);

    return this.get(shipment.id, { id: transporterId, role: 'TRANSPORTER' });
  }
}

export const trackingService = new TrackingService();
