import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  type StoredLocation,
  type VehicleStatus,
  type VehicleType,
} from '../types/domain';

export interface Vehicle {
  transporterId: Types.ObjectId;
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityWeight: number;
  capacityVolume?: number;
  currentLocation: StoredLocation;
  isAvailable: boolean;
  status: VehicleStatus;
  activeShipmentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleDocument = HydratedDocument<Vehicle>;

const locationSchema = new Schema<StoredLocation>(
  {
    label: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const vehicleSchema = new Schema<Vehicle>(
  {
    transporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      required: true,
    },
    capacityWeight: {
      type: Number,
      required: true,
      min: 1,
    },
    capacityVolume: {
      type: Number,
      min: 0,
    },
    currentLocation: {
      type: locationSchema,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: VEHICLE_STATUSES,
      default: 'AVAILABLE',
      index: true,
    },
    activeShipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

vehicleSchema.index({ status: 1, isAvailable: 1 });

export const VehicleModel = model<Vehicle>('Vehicle', vehicleSchema);
