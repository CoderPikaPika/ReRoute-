import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import type { VehicleDocument } from '../../models/vehicle.model';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import type { VehicleStatus, VehicleType } from '../../types/domain';
import { resolveLocation } from '../map/mock-map.service';

export interface CreateVehicleInput {
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityWeight: number;
  capacityVolume?: number;
  currentLocation: string;
  isAvailable?: boolean;
}

export interface UpdateVehicleInput {
  registrationNumber?: string;
  vehicleType?: VehicleType;
  capacityWeight?: number;
  capacityVolume?: number;
  currentLocation?: string;
  isAvailable?: boolean;
  status?: VehicleStatus;
}

export interface VehicleView {
  id: string;
  transporterId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityWeight: number;
  capacityVolume?: number;
  currentLocation: VehicleDocument['currentLocation'];
  isAvailable: boolean;
  status: VehicleStatus;
  activeShipmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class VehicleService {
  public async create(transporterId: string, input: CreateVehicleInput): Promise<VehicleView> {
    const isAvailable = input.isAvailable ?? true;
    const vehicle = await vehicleRepository.create({
      transporterId: new Types.ObjectId(transporterId),
      registrationNumber: input.registrationNumber,
      vehicleType: input.vehicleType,
      capacityWeight: input.capacityWeight,
      capacityVolume: input.capacityVolume,
      currentLocation: {
        ...resolveLocation(input.currentLocation),
        updatedAt: new Date(),
      },
      isAvailable,
      status: isAvailable ? 'AVAILABLE' : 'OFFLINE',
    });

    return this.toView(vehicle);
  }

  public async get(vehicleId: string, actorId: string, isAdmin = false): Promise<VehicleView> {
    const vehicle = await this.getOwnedDocument(vehicleId, actorId, isAdmin);
    return this.toView(vehicle);
  }

  public async list(
    transporterId: string,
    options: { page: number; limit: number; status?: VehicleStatus },
  ): Promise<VehicleView[]> {
    const vehicles = await vehicleRepository.findByTransporter(transporterId, options);
    return vehicles.map((vehicle) => this.toView(vehicle));
  }

  public async getOwnedDocument(
    vehicleId: string,
    actorId: string,
    isAdmin = false,
  ): Promise<VehicleDocument> {
    const vehicle = await vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle was not found');
    }

    if (!isAdmin && vehicle.transporterId.toString() !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this vehicle');
    }

    return vehicle;
  }

  public async update(
    vehicleId: string,
    transporterId: string,
    input: UpdateVehicleInput,
  ): Promise<VehicleView> {
    const vehicle = await this.getOwnedDocument(vehicleId, transporterId);

    if (vehicle.activeShipmentId && (input.isAvailable === true || input.status === 'AVAILABLE')) {
      throw new AppError(409, 'CONFLICT', 'Vehicle has an active shipment and cannot be made available');
    }

    const updated = await vehicleRepository.update(vehicleId, {
      ...input,
      currentLocation: input.currentLocation
        ? { ...resolveLocation(input.currentLocation), updatedAt: new Date() }
        : undefined,
    });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle was not found');
    }

    return this.toView(updated);
  }

  public toView(vehicle: VehicleDocument): VehicleView {
    return {
      id: vehicle.id,
      transporterId: vehicle.transporterId.toString(),
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      capacityWeight: vehicle.capacityWeight,
      capacityVolume: vehicle.capacityVolume,
      currentLocation: vehicle.currentLocation,
      isAvailable: vehicle.isAvailable,
      status: vehicle.status,
      activeShipmentId: vehicle.activeShipmentId?.toString(),
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}

export const vehicleService = new VehicleService();
