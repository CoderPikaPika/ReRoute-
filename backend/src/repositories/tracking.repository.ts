import {
  TrackingUpdateModel,
  type TrackingUpdate,
  type TrackingUpdateDocument,
} from '../models/tracking-update.model';

export class TrackingRepository {
  public create(update: Omit<TrackingUpdate, '_id'>): Promise<TrackingUpdateDocument> {
    return TrackingUpdateModel.create(update);
  }

  public listForShipment(shipmentId: string): Promise<TrackingUpdateDocument[]> {
    return TrackingUpdateModel.find({ shipmentId }).sort({ timestamp: 1 }).exec();
  }

  public latestForShipment(shipmentId: string): Promise<TrackingUpdateDocument | null> {
    return TrackingUpdateModel.findOne({ shipmentId }).sort({ timestamp: -1 }).exec();
  }
}

export const trackingRepository = new TrackingRepository();
