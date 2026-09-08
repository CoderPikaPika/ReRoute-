import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import type { ShipmentDocument } from '../../models/shipment.model';
import { shipmentEventRepository } from '../../repositories/shipment-event.repository';
import { shipmentRepository, type ShipmentListOptions } from '../../repositories/shipment.repository';
import { userRepository } from '../../repositories/user.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import type { AuthenticatedUser } from '../../types/auth';
import type { ShipmentStatus, VehicleType } from '../../types/domain';
import { createRoute, resolveLocation, routeDistanceKm } from '../map/mock-map.service';
import { estimateCost } from '../pricing/pricing.service';
import { assertShipmentTransition } from './shipment.state-machine';

export interface CreateShipmentInput {
  source: string;
  destination: string;
  cargoType: string;
  weight: number;
  volume?: number;
  vehicleTypeRequired: VehicleType;
  pickupDate: string;
  deliveryDeadline: string;
}

export interface ShipmentView {
  id: string;
  shipperId: string;
  assignedTransporterId?: string;
  assignedVehicleId?: string;
  assignmentStatus?: string;
  source: ShipmentDocument['source'];
  destination: ShipmentDocument['destination'];
  cargoType: string;
  weight: number;
  volume?: number;
  vehicleTypeRequired: VehicleType;
  pickupDate: Date;
  deliveryDeadline: Date;
  estimatedDistance?: number;
  estimatedCost?: number;
  route: ShipmentDocument['route'];
  currentRouteIndex: number;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
  shipper?: { name: string; phone: string };
  assignedTransporter?: { name: string; phone: string };
  assignedVehicle?: { registrationNumber: string; vehicleType: string; capacityWeight: number };
}

export class ShipmentService {
  public async create(shipperId: string, input: CreateShipmentInput): Promise<ShipmentView> {
    const pickupDate = new Date(input.pickupDate);
    const deliveryDeadline = new Date(input.deliveryDeadline);

    if (deliveryDeadline <= pickupDate) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Delivery deadline must be after pickup date');
    }

    const source = resolveLocation(input.source);
    const destination = resolveLocation(input.destination);
    const route = createRoute(source, destination);
    const estimatedDistance = routeDistanceKm(route);
    const shipment = await shipmentRepository.create({
      shipperId: new Types.ObjectId(shipperId),
      source,
      destination,
      cargoType: input.cargoType,
      weight: input.weight,
      volume: input.volume,
      vehicleTypeRequired: input.vehicleTypeRequired,
      pickupDate,
      deliveryDeadline,
      estimatedDistance,
      estimatedCost: estimateCost(estimatedDistance, input.weight),
      route,
      currentRouteIndex: 0,
      status: 'CREATED',
    });

    await shipmentEventRepository.create({
      shipmentId: shipment._id,
      type: 'SHIPMENT_CREATED',
      status: 'CREATED',
      message: 'Shipment request created',
      location: source,
      actorId: new Types.ObjectId(shipperId),
      actorType: 'USER',
      timestamp: new Date(),
    });

    return this.toView(shipment);
  }

  public async getForActor(shipmentId: string, actor: AuthenticatedUser): Promise<ShipmentView> {
    const shipment = await this.getDocumentForActor(shipmentId, actor);
    return this.toView(shipment);
  }

  public async getDocumentForActor(
    shipmentId: string,
    actor: AuthenticatedUser,
  ): Promise<ShipmentDocument> {
    const shipment = await shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    const isOwner = shipment.shipperId.toString() === actor.id;
    const isAssignedTransporter = shipment.assignedTransporterId?.toString() === actor.id;

    if (actor.role !== 'ADMIN' && !isOwner && !isAssignedTransporter) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this shipment');
    }

    return shipment;
  }

  public async getForShipper(shipmentId: string, shipperId: string): Promise<ShipmentDocument> {
    const shipment = await shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    if (shipment.shipperId.toString() !== shipperId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this shipment');
    }

    return shipment;
  }

  public async listForActor(
    actor: AuthenticatedUser,
    options: ShipmentListOptions,
  ): Promise<ShipmentView[]> {
    const shipments =
      actor.role === 'SHIPPER'
        ? await shipmentRepository.findForShipper(actor.id, options)
        : actor.role === 'TRANSPORTER'
          ? await shipmentRepository.findForTransporter(actor.id, options)
          : await shipmentRepository.findAll(options);

    return Promise.all(shipments.map((shipment) => this.toView(shipment)));
  }

  public async transition(
    shipment: ShipmentDocument,
    nextStatus: ShipmentStatus,
    eventType: Parameters<typeof shipmentEventRepository.createSystemEvent>[1],
    message: string,
    actorId?: string,
  ): Promise<ShipmentDocument> {
    assertShipmentTransition(shipment.status, nextStatus);
    const updated = await shipmentRepository.update(shipment.id, { status: nextStatus });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Shipment was not found');
    }

    await shipmentEventRepository.create({
      shipmentId: updated._id,
      type: eventType,
      status: nextStatus,
      message,
      actorId: actorId ? new Types.ObjectId(actorId) : undefined,
      actorType: actorId ? 'USER' : 'SYSTEM',
      timestamp: new Date(),
    });

    return updated;
  }

  public async cancel(shipmentId: string, shipperId: string): Promise<ShipmentView> {
    const shipment = await this.getForShipper(shipmentId, shipperId);

    if (!['CREATED', 'MATCHED', 'ASSIGNED'].includes(shipment.status)) {
      throw new AppError(409, 'INVALID_SHIPMENT_TRANSITION', 'This shipment can no longer be cancelled');
    }

    const cancelled = await this.transition(
      shipment,
      'CANCELLED',
      'CANCELLED',
      'Shipment cancelled by shipper',
      shipperId,
    );

    if (shipment.assignedVehicleId) {
      await vehicleRepository.releaseFromShipment(shipment.assignedVehicleId.toString(), shipment.id);
    }

    return this.toView(cancelled);
  }

  public async toView(shipment: ShipmentDocument): Promise<ShipmentView> {
    const [shipper, transporter, vehicle] = await Promise.all([
      userRepository.findById(shipment.shipperId.toString()),
      shipment.assignedTransporterId
        ? userRepository.findById(shipment.assignedTransporterId.toString())
        : Promise.resolve(null),
      shipment.assignedVehicleId
        ? vehicleRepository.findById(shipment.assignedVehicleId.toString())
        : Promise.resolve(null),
    ]);

    return {
      id: shipment.id,
      shipperId: shipment.shipperId.toString(),
      assignedTransporterId: shipment.assignedTransporterId?.toString(),
      assignedVehicleId: shipment.assignedVehicleId?.toString(),
      assignmentStatus: shipment.assignmentStatus,
      source: shipment.source,
      destination: shipment.destination,
      cargoType: shipment.cargoType,
      weight: shipment.weight,
      volume: shipment.volume,
      vehicleTypeRequired: shipment.vehicleTypeRequired,
      pickupDate: shipment.pickupDate,
      deliveryDeadline: shipment.deliveryDeadline,
      estimatedDistance: shipment.estimatedDistance,
      estimatedCost: shipment.estimatedCost,
      route: shipment.route,
      currentRouteIndex: shipment.currentRouteIndex,
      status: shipment.status,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      shipper: shipper ? { name: shipper.name, phone: shipper.phone } : undefined,
      assignedTransporter: transporter
        ? { name: transporter.name, phone: transporter.phone }
        : undefined,
      assignedVehicle: vehicle
        ? {
            registrationNumber: vehicle.registrationNumber,
            vehicleType: vehicle.vehicleType,
            capacityWeight: vehicle.capacityWeight,
          }
        : undefined,
    };
  }
}

export const shipmentService = new ShipmentService();
