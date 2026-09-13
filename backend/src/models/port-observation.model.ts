import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import {
  CONGESTION_LEVELS,
  MARITIME_DATA_SOURCES,
  PORT_OPERATIONAL_STATUSES,
  type CongestionLevel,
  type MaritimeDataSource,
  type PortOperationalStatus,
} from '../types/maritime';

export interface PortObservation {
  portId: Types.ObjectId;
  operationalStatus: PortOperationalStatus;
  congestionLevel: CongestionLevel;
  waitingVessels?: number;
  anchoredVessels?: number;
  berthOccupancyPercent?: number;
  averageWaitDays?: number;
  averageTurnaroundDays?: number;
  windSpeedKnots?: number;
  visibilityKm?: number;
  source: MaritimeDataSource;
  sourceReference?: string;
  isEstimated: boolean;
  qualityStatus: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNVERIFIED';
  observedAt: Date;
  ingestedAt: Date;
}

export type PortObservationDocument = HydratedDocument<PortObservation>;

const portObservationSchema = new Schema<PortObservation>(
  {
    portId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', required: true, index: true },
    operationalStatus: { type: String, enum: PORT_OPERATIONAL_STATUSES, default: 'UNKNOWN' },
    congestionLevel: { type: String, enum: CONGESTION_LEVELS, default: 'UNKNOWN', index: true },
    waitingVessels: { type: Number, min: 0 },
    anchoredVessels: { type: Number, min: 0 },
    berthOccupancyPercent: { type: Number, min: 0, max: 100 },
    averageWaitDays: { type: Number, min: 0 },
    averageTurnaroundDays: { type: Number, min: 0 },
    windSpeedKnots: { type: Number, min: 0 },
    visibilityKm: { type: Number, min: 0 },
    source: { type: String, enum: MARITIME_DATA_SOURCES, required: true },
    sourceReference: { type: String, trim: true, maxlength: 500 },
    isEstimated: { type: Boolean, default: false },
    qualityStatus: { type: String, enum: ['FRESH', 'STALE', 'PARTIAL', 'UNVERIFIED'], default: 'UNVERIFIED' },
    observedAt: { type: Date, required: true, index: true },
    ingestedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

portObservationSchema.index({ portId: 1, observedAt: -1 });

export const PortObservationModel = model<PortObservation>('PortObservation', portObservationSchema);
