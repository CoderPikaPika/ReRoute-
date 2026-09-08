import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  SHIPMENT_EVENT_TYPES,
  SHIPMENT_STATUSES,
  type LocationPoint,
  type ShipmentEventType,
  type ShipmentStatus,
} from '../types/domain';

export interface ShipmentEvent {
  shipmentId: Types.ObjectId;
  type: ShipmentEventType;
  status: ShipmentStatus;
  location?: LocationPoint;
  message: string;
  actorId?: Types.ObjectId;
  actorType: 'USER' | 'SYSTEM';
  timestamp: Date;
}

export type ShipmentEventDocument = HydratedDocument<ShipmentEvent>;

const locationSchema = new Schema<LocationPoint>(
  {
    label: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const shipmentEventSchema = new Schema<ShipmentEvent>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: SHIPMENT_EVENT_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      required: true,
    },
    location: {
      type: locationSchema,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorType: {
      type: String,
      enum: ['USER', 'SYSTEM'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

shipmentEventSchema.index({ shipmentId: 1, timestamp: 1 });

export const ShipmentEventModel = model<ShipmentEvent>('ShipmentEvent', shipmentEventSchema);
