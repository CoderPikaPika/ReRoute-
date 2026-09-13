import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  MARITIME_DATA_SOURCES,
  VESSEL_NAVIGATION_STATUSES,
  type GeoPoint,
  type MaritimeDataSource,
  type VesselNavigationStatus,
} from '../types/maritime';

export interface VesselPosition {
  vesselId: Types.ObjectId;
  location: GeoPoint;
  speedKnots?: number;
  courseDegrees?: number;
  headingDegrees?: number;
  navigationStatus: VesselNavigationStatus;
  source: MaritimeDataSource;
  isEstimated: boolean;
  qualityStatus: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNVERIFIED';
  sourceReceivedAt?: Date;
  observedAt: Date;
  ingestedAt: Date;
}

export type VesselPositionDocument = HydratedDocument<VesselPosition>;

const locationSchema = new Schema<GeoPoint>(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
        },
        message: 'location must contain a valid [longitude, latitude] pair',
      },
    },
  },
  { _id: false },
);

const vesselPositionSchema = new Schema<VesselPosition>(
  {
    vesselId: { type: Schema.Types.ObjectId, ref: 'MaritimeVessel', required: true, index: true },
    location: { type: locationSchema, required: true },
    speedKnots: { type: Number, min: 0, max: 100 },
    courseDegrees: { type: Number, min: 0, max: 360 },
    headingDegrees: { type: Number, min: 0, max: 360 },
    navigationStatus: { type: String, enum: VESSEL_NAVIGATION_STATUSES, default: 'UNKNOWN', index: true },
    source: { type: String, enum: MARITIME_DATA_SOURCES, required: true },
    isEstimated: { type: Boolean, default: false },
    qualityStatus: { type: String, enum: ['FRESH', 'STALE', 'PARTIAL', 'UNVERIFIED'], default: 'UNVERIFIED' },
    sourceReceivedAt: { type: Date },
    observedAt: { type: Date, required: true, index: true },
    ingestedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

vesselPositionSchema.index({ vesselId: 1, observedAt: -1 });
vesselPositionSchema.index({ location: '2dsphere' });

export const VesselPositionModel = model<VesselPosition>('VesselPosition', vesselPositionSchema);
