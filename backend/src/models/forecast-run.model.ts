import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import { VESSEL_CLASSES, type VesselClass } from '../types/maritime';

export interface ForecastPoint {
  targetAt: Date;
  p10?: number;
  p50: number;
  p90?: number;
  confidence?: number;
}

export interface ForecastRun {
  requestedBy: Types.ObjectId;
  originPortId?: Types.ObjectId;
  destinationPortId?: Types.ObjectId;
  cargoType: string;
  vesselClass: VesselClass;
  horizonDays: number;
  model: { name: string; version: string; trainedAt?: Date; featureSchemaHash?: string };
  inputObservedAt: Date;
  historical: Array<{ observedAt: Date; value: number }>;
  forecast: ForecastPoint[];
  qualityStatus: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNVERIFIED';
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ForecastRunDocument = HydratedDocument<ForecastRun>;

const forecastPointSchema = new Schema<ForecastPoint>(
  {
    targetAt: { type: Date, required: true },
    p10: { type: Number, min: 0 },
    p50: { type: Number, required: true, min: 0 },
    p90: { type: Number, min: 0 },
    confidence: { type: Number, min: 0, max: 1 },
  },
  { _id: false },
);

const forecastRunSchema = new Schema<ForecastRun>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', index: true },
    destinationPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', index: true },
    cargoType: { type: String, required: true, trim: true, maxlength: 100 },
    vesselClass: { type: String, enum: VESSEL_CLASSES, required: true },
    horizonDays: { type: Number, required: true, min: 1, max: 730 },
    model: {
      name: { type: String, required: true, trim: true },
      version: { type: String, required: true, trim: true },
      trainedAt: { type: Date },
      featureSchemaHash: { type: String, trim: true },
    },
    inputObservedAt: { type: Date, required: true },
    historical: {
      type: [new Schema({ observedAt: { type: Date, required: true }, value: { type: Number, required: true, min: 0 } }, { _id: false })],
      default: [],
    },
    forecast: { type: [forecastPointSchema], required: true, validate: [(items: ForecastPoint[]) => items.length > 0, 'at least one forecast point is required'] },
    qualityStatus: { type: String, enum: ['FRESH', 'STALE', 'PARTIAL', 'UNVERIFIED'], default: 'UNVERIFIED' },
    warnings: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

forecastRunSchema.index({ requestedBy: 1, createdAt: -1 });
forecastRunSchema.index({ originPortId: 1, destinationPortId: 1, vesselClass: 1, cargoType: 1, createdAt: -1 });

export const ForecastRunModel = model<ForecastRun>('ForecastRun', forecastRunSchema);
