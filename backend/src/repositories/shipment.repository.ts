import { ShipmentModel, type Shipment, type ShipmentDocument } from '../models/shipment.model';
import type { ShipmentStatus } from '../types/domain';

export interface ShipmentListOptions {
  page: number;
  limit: number;
  status?: ShipmentStatus;
}

export class ShipmentRepository {
  public create(
    shipment: Omit<
      Shipment,
      | 'createdAt'
      | 'updatedAt'
      | 'assignedTransporterId'
      | 'assignedVehicleId'
      | 'assignmentStatus'
    >,
  ): Promise<ShipmentDocument> {
    return ShipmentModel.create(shipment);
  }

  public findById(id: string): Promise<ShipmentDocument | null> {
    return ShipmentModel.findById(id).exec();
  }

  public findForShipper(shipperId: string, options: ShipmentListOptions): Promise<ShipmentDocument[]> {
    const filter: { shipperId: string; status?: ShipmentStatus } = { shipperId };

    if (options.status) {
      filter.status = options.status;
    }

    return ShipmentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .exec();
  }

  public findForTransporter(
    transporterId: string,
    options: ShipmentListOptions,
  ): Promise<ShipmentDocument[]> {
    const filter: { assignedTransporterId: string; status?: ShipmentStatus } = {
      assignedTransporterId: transporterId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    return ShipmentModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .exec();
  }

  public findAll(options: ShipmentListOptions): Promise<ShipmentDocument[]> {
    const filter: { status?: ShipmentStatus } = {};

    if (options.status) {
      filter.status = options.status;
    }

    return ShipmentModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .exec();
  }

  public countForShipper(shipperId: string): Promise<number> {
    return ShipmentModel.countDocuments({ shipperId }).exec();
  }

  public countForShipperByStatus(
    shipperId: string,
    status: ShipmentStatus | ShipmentStatus[],
  ): Promise<number> {
    const normalizedStatus = Array.isArray(status) ? { $in: status } : status;
    return ShipmentModel.countDocuments({ shipperId, status: normalizedStatus }).exec();
  }

  public countForTransporter(transporterId: string, statuses?: ShipmentStatus[]): Promise<number> {
    const filter: Record<string, unknown> = { assignedTransporterId: transporterId };

    if (statuses) {
      filter.status = { $in: statuses };
    }

    return ShipmentModel.countDocuments(filter).exec();
  }

  public update(shipmentId: string, update: Partial<Shipment>): Promise<ShipmentDocument | null> {
    return ShipmentModel.findByIdAndUpdate(
      shipmentId,
      { $set: update },
      { new: true, runValidators: true },
    ).exec();
  }

  public clearAssignmentAndSetMatched(shipmentId: string): Promise<ShipmentDocument | null> {
    return ShipmentModel.findByIdAndUpdate(
      shipmentId,
      {
        $set: { status: 'MATCHED' },
        $unset: {
          assignedTransporterId: 1,
          assignedVehicleId: 1,
          assignmentStatus: 1,
        },
      },
      { new: true },
    ).exec();
  }
}

export const shipmentRepository = new ShipmentRepository();
