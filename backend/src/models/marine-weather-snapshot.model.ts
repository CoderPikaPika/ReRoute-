import { Schema, Types, model, type HydratedDocument } from 'mongoose';

export interface MarineWeatherSnapshot {
  portId: Types.ObjectId;
  waveHeightMeters?: number;
  waveDirectionDegrees?: number;
  wavePeriodSeconds?: number;
  windWaveHeightMeters?: number;
  swellWaveHeightMeters?: number;
  seaSurfaceTemperatureCelsius?: number;
  oceanCurrentVelocityKnots?: number;
  oceanCurrentDirectionDegrees?: number;
  source: 'OPEN_METEO';
  sourceReference: string;
  observedAt: Date;
  ingestedAt: Date;
}

export type MarineWeatherSnapshotDocument = HydratedDocument<MarineWeatherSnapshot>;

const marineWeatherSnapshotSchema = new Schema<MarineWeatherSnapshot>(
  {
    portId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', required: true, index: true },
    waveHeightMeters: { type: Number, min: 0 },
    waveDirectionDegrees: { type: Number, min: 0, max: 360 },
    wavePeriodSeconds: { type: Number, min: 0 },
    windWaveHeightMeters: { type: Number, min: 0 },
    swellWaveHeightMeters: { type: Number, min: 0 },
    seaSurfaceTemperatureCelsius: { type: Number, min: -10, max: 60 },
    oceanCurrentVelocityKnots: { type: Number, min: 0 },
    oceanCurrentDirectionDegrees: { type: Number, min: 0, max: 360 },
    source: { type: String, enum: ['OPEN_METEO'], required: true },
    sourceReference: { type: String, required: true, trim: true, maxlength: 500 },
    observedAt: { type: Date, required: true, index: true },
    ingestedAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);

marineWeatherSnapshotSchema.index({ portId: 1, observedAt: -1 });

export const MarineWeatherSnapshotModel = model<MarineWeatherSnapshot>('MarineWeatherSnapshot', marineWeatherSnapshotSchema);
