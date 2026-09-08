import { Types } from 'mongoose';

import { VehicleModel, type Vehicle, type VehicleDocument } from '../models/vehicle.model';
import type { StoredLocation, VehicleStatus } from '../types/domain';

export class VehicleRepository {
  public create(vehicle: Omit<Vehicle, 'createdAt' | 'updatedAt' | 'activeShipmentId'>): Promise<VehicleDocument> {
    return VehicleModel.create(vehicle);
  }

  public findById(id: string): Promise<VehicleDocument | null> {
    return VehicleModel.findById(id).exec();
  }

  public findByTransporter(
    transporterId: string,
    options: { page: number; limit: number; status?: VehicleStatus },
  ): Promise<VehicleDocument[]> {
    const filter: { transporterId: string; status?: VehicleStatus } = { transporterId };

    if (options.status) {
      filter.status = options.status;
    }

    return VehicleModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .exec();
  }

  public findAllAvailable(weight: number, volume?: number): Promise<VehicleDocument[]> {
    const filter: Record<string, unknown> = {
      status: 'AVAILABLE',
      isAvailable: true,
      capacityWeight: { $gte: weight },
    };

    if (volume !== undefined) {
      filter.capacityVolume = { $gte: volume };
    }

    return VehicleModel.find(filter).exec();
  }

  public async reserveForShipment(
    vehicleId: string,
    shipmentId: string,
  ): Promise<VehicleDocument | null> {
    return VehicleModel.findOneAndUpdate(
      {
        _id: vehicleId,
        status: 'AVAILABLE',
        isAvailable: true,
        activeShipmentId: { $exists: false },
      },
      {
        $set: {
          status: 'ASSIGNED',
          isAvailable: false,
          activeShipmentId: new Types.ObjectId(shipmentId),
        },
      },
      { new: true },
    ).exec();
  }

  public releaseFromShipment(vehicleId: string, shipmentId: string): Promise<VehicleDocument | null> {
    return VehicleModel.findOneAndUpdate(
      { _id: vehicleId, activeShipmentId: shipmentId },
      {
        $set: { status: 'AVAILABLE', isAvailable: true },
        $unset: { activeShipmentId: 1 },
      },
      { new: true },
    ).exec();
  }

  public setTransitStatus(vehicleId: string, shipmentId: string): Promise<VehicleDocument | null> {
    return VehicleModel.findOneAndUpdate(
      { _id: vehicleId, activeShipmentId: shipmentId },
      { $set: { status: 'IN_TRANSIT', isAvailable: false } },
      { new: true },
    ).exec();
  }

  public update(
    vehicleId: string,
    update: Partial<Pick<Vehicle, 'registrationNumber' | 'vehicleType' | 'capacityWeight' | 'capacityVolume' | 'isAvailable' | 'status' | 'currentLocation'>>,
  ): Promise<VehicleDocument | null> {
    return VehicleModel.findByIdAndUpdate(vehicleId, { $set: update }, { new: true, runValidators: true }).exec();
  }

  public updateLocation(
    vehicleId: string,
    location: StoredLocation,
  ): Promise<VehicleDocument | null> {
    return VehicleModel.findByIdAndUpdate(
      vehicleId,
      { $set: { currentLocation: location } },
      { new: true },
    ).exec();
  }

  public countForTransporter(transporterId: string): Promise<number> {
    return VehicleModel.countDocuments({ transporterId }).exec();
  }

  public countAvailableForTransporter(transporterId: string): Promise<number> {
    return VehicleModel.countDocuments({ transporterId, status: 'AVAILABLE', isAvailable: true }).exec();
  }
}

export const vehicleRepository = new VehicleRepository();
