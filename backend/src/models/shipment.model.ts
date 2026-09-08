import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  ASSIGNMENT_STATUSES,
  SHIPMENT_STATUSES,
  VEHICLE_TYPES,
  type AssignmentStatus,
  type LocationPoint,
  type RoutePoint,
  type ShipmentStatus,
  type VehicleType,
} from '../types/domain';

export interface Shipment {
  shipperId: Types.ObjectId;
  assignedTransporterId?: Types.ObjectId;
  assignedVehicleId?: Types.ObjectId;
  assignmentStatus?: AssignmentStatus;
  source: LocationPoint;
  destination: LocationPoint;
  cargoType: string;
  weight: number;
  volume?: number;
  vehicleTypeRequired: VehicleType;
  pickupDate: Date;
  deliveryDeadline: Date;
  estimatedDistance?: number;
  estimatedCost?: number;
  route: RoutePoint[];
  currentRouteIndex: number;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ShipmentDocument = HydratedDocument<Shipment>;

const locationSchema = new Schema<LocationPoint>(
  {
    label: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const routePointSchema = new Schema<RoutePoint>(
  {
    label: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    sequence: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shipmentSchema = new Schema<Shipment>(
  {
    shipperId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTransporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    assignmentStatus: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
    },
    source: {
      type: locationSchema,
      required: true,
    },
    destination: {
      type: locationSchema,
      required: true,
    },
    cargoType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    weight: {
      type: Number,
      required: true,
      min: 1,
    },
    volume: {
      type: Number,
      min: 0,
    },
    vehicleTypeRequired: {
      type: String,
      enum: VEHICLE_TYPES,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    deliveryDeadline: {
      type: Date,
      required: true,
    },
    estimatedDistance: {
      type: Number,
      min: 0,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    route: {
      type: [routePointSchema],
      default: [],
    },
    currentRouteIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: 'CREATED',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

shipmentSchema.index({ shipperId: 1, createdAt: -1 });
shipmentSchema.index({ assignedTransporterId: 1, status: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 });

export const ShipmentModel = model<Shipment>('Shipment', shipmentSchema);
