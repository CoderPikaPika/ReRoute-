import { Schema, model, type HydratedDocument } from 'mongoose';

import {
  MARITIME_DATA_SOURCES,
  PORT_OPERATIONAL_STATUSES,
  type MaritimeDataSource,
  type PortOperationalStatus,
} from '../types/maritime';

export interface MaritimePort {
  name: string;
  unlocode: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
  maxDraftMeters?: number;
  maxLoaMeters?: number;
  maxBeamMeters?: number;
  channelDepthMeters?: number;
  berthCount?: number;
  handlingCapabilities: string[];
  operationalStatus: PortOperationalStatus;
  source: MaritimeDataSource;
  sourceReference?: string;
  observedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MaritimePortDocument = HydratedDocument<MaritimePort>;

const maritimePortSchema = new Schema<MaritimePort>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    unlocode: { type: String, required: true, trim: true, uppercase: true, unique: true },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 100 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    maxDraftMeters: { type: Number, min: 0 },
    maxLoaMeters: { type: Number, min: 0 },
    maxBeamMeters: { type: Number, min: 0 },
    channelDepthMeters: { type: Number, min: 0 },
    berthCount: { type: Number, min: 0 },
    handlingCapabilities: { type: [String], default: [] },
    operationalStatus: { type: String, enum: PORT_OPERATIONAL_STATUSES, default: 'UNKNOWN', index: true },
    source: { type: String, enum: MARITIME_DATA_SOURCES, required: true },
    sourceReference: { type: String, trim: true, maxlength: 500 },
    observedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

maritimePortSchema.index({ country: 1, name: 1 });
maritimePortSchema.index({ latitude: 1, longitude: 1 });

export const MaritimePortModel = model<MaritimePort>('MaritimePort', maritimePortSchema);
