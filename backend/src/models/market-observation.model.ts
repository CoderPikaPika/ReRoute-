import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  MARITIME_DATA_SOURCES,
  MARKET_RATE_TYPES,
  VESSEL_CLASSES,
  type MaritimeDataSource,
  type MarketRateType,
  type VesselClass,
} from '../types/maritime';

export interface MarketObservation {
  market: string;
  originPortId?: Types.ObjectId;
  destinationPortId?: Types.ObjectId;
  cargoType: string;
  vesselClass: VesselClass;
  rateType: MarketRateType;
  value: number;
  currency: string;
  unit: 'USD_PER_DAY' | 'USD_PER_MT';
  source: MaritimeDataSource;
  sourceReference?: string;
  isEstimated: boolean;
  qualityStatus: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNVERIFIED';
  asOf: Date;
  availableAt: Date;
  ingestedAt: Date;
}

export type MarketObservationDocument = HydratedDocument<MarketObservation>;

const marketObservationSchema = new Schema<MarketObservation>(
  {
    market: { type: String, required: true, trim: true, maxlength: 120, index: true },
    originPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', index: true },
    destinationPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', index: true },
    cargoType: { type: String, required: true, trim: true, maxlength: 100, index: true },
    vesselClass: { type: String, enum: VESSEL_CLASSES, required: true, index: true },
    rateType: { type: String, enum: MARKET_RATE_TYPES, required: true, index: true },
    value: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    unit: { type: String, enum: ['USD_PER_DAY', 'USD_PER_MT'], required: true },
    source: { type: String, enum: MARITIME_DATA_SOURCES, required: true },
    sourceReference: { type: String, trim: true, maxlength: 500 },
    isEstimated: { type: Boolean, default: false },
    qualityStatus: { type: String, enum: ['FRESH', 'STALE', 'PARTIAL', 'UNVERIFIED'], default: 'UNVERIFIED' },
    asOf: { type: Date, required: true, index: true },
    availableAt: { type: Date, required: true },
    ingestedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

marketObservationSchema.index({ originPortId: 1, destinationPortId: 1, vesselClass: 1, cargoType: 1, asOf: -1 });
marketObservationSchema.index({ market: 1, asOf: -1 });

export const MarketObservationModel = model<MarketObservation>('MarketObservation', marketObservationSchema);
