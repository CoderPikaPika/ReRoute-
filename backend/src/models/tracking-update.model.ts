import { Schema, Types, model, type HydratedDocument } from 'mongoose';

export interface TrackingUpdate {
  shipmentId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  latitude: number;
  longitude: number;
  label: string;
  source: 'SIMULATION' | 'TRANSPORTER_UPDATE' | 'GPS';
  timestamp: Date;
}

export type TrackingUpdateDocument = HydratedDocument<TrackingUpdate>;

const trackingUpdateSchema = new Schema<TrackingUpdate>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    label: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ['SIMULATION', 'TRANSPORTER_UPDATE', 'GPS'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  {
    versionKey: false,
  },
);

trackingUpdateSchema.index({ shipmentId: 1, timestamp: -1 });

export const TrackingUpdateModel = model<TrackingUpdate>('TrackingUpdate', trackingUpdateSchema);
