import { Types } from 'mongoose';

import {
  ShipmentEventModel,
  type ShipmentEvent,
  type ShipmentEventDocument,
} from '../models/shipment-event.model';

export class ShipmentEventRepository {
  public create(event: Omit<ShipmentEvent, '_id'>): Promise<ShipmentEventDocument> {
    return ShipmentEventModel.create(event);
  }

  public listForShipment(shipmentId: string): Promise<ShipmentEventDocument[]> {
    return ShipmentEventModel.find({ shipmentId }).sort({ timestamp: 1 }).exec();
  }

  public createSystemEvent(
    shipmentId: string,
    type: ShipmentEvent['type'],
    status: ShipmentEvent['status'],
    message: string,
    location?: ShipmentEvent['location'],
  ): Promise<ShipmentEventDocument> {
    return this.create({
      shipmentId: new Types.ObjectId(shipmentId),
      type,
      status,
      message,
      location,
      actorType: 'SYSTEM',
      timestamp: new Date(),
    });
  }
}

export const shipmentEventRepository = new ShipmentEventRepository();
