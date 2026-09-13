import { Schema, model, type HydratedDocument } from 'mongoose';

import { MARITIME_DATA_SOURCES, VESSEL_CLASSES, type MaritimeDataSource, type VesselClass } from '../types/maritime';

export interface MaritimeVessel {
  name: string;
  imo?: string;
  mmsi?: string;
  vesselClass: VesselClass;
  deadweightTonnes?: number;
  lengthOverallMeters?: number;
  beamMeters?: number;
  maxDraftMeters?: number;
  flag?: string;
  operator?: string;
  source: MaritimeDataSource;
  sourceReference?: string;
  observedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MaritimeVesselDocument = HydratedDocument<MaritimeVessel>;

const maritimeVesselSchema = new Schema<MaritimeVessel>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    imo: { type: String, trim: true, unique: true, sparse: true, match: /^\d{7}$/ },
    mmsi: { type: String, trim: true, unique: true, sparse: true, match: /^\d{9}$/ },
    vesselClass: { type: String, enum: VESSEL_CLASSES, required: true, index: true },
    deadweightTonnes: { type: Number, min: 0 },
    lengthOverallMeters: { type: Number, min: 0 },
    beamMeters: { type: Number, min: 0 },
    maxDraftMeters: { type: Number, min: 0 },
    flag: { type: String, trim: true, maxlength: 80 },
    operator: { type: String, trim: true, maxlength: 120 },
    source: { type: String, enum: MARITIME_DATA_SOURCES, required: true },
    sourceReference: { type: String, trim: true, maxlength: 500 },
    observedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

maritimeVesselSchema.index({ name: 'text', imo: 'text', mmsi: 'text' });

export const MaritimeVesselModel = model<MaritimeVessel>('MaritimeVessel', maritimeVesselSchema);
