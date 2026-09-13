import { Schema, Types, model, type HydratedDocument } from 'mongoose';

import { VESSEL_CLASSES, type VesselClass } from '../types/maritime';

export const CHARTER_PLAN_STATUSES = ['DRAFT', 'READY_FOR_CONTRACT'] as const;
export type CharterPlanStatus = (typeof CHARTER_PLAN_STATUSES)[number];

export interface CharterPlan {
  requestedBy: Types.ObjectId;
  cargoType: string;
  quantityMt: number;
  originPortId: Types.ObjectId;
  destinationPortId: Types.ObjectId;
  preferredVesselClass: VesselClass;
  selectedVesselId: Types.ObjectId;
  targetLoadingDate: Date;
  forecastRunId: Types.ObjectId;
  estimatedTransitDays: number;
  estimatedDailyRateUsd: number;
  estimatedCharterCostUsd: number;
  status: CharterPlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CharterPlanDocument = HydratedDocument<CharterPlan>;

const charterPlanSchema = new Schema<CharterPlan>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cargoType: { type: String, required: true, trim: true, maxlength: 100 },
    quantityMt: { type: Number, required: true, min: 1, max: 1_000_000 },
    originPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', required: true },
    destinationPortId: { type: Schema.Types.ObjectId, ref: 'MaritimePort', required: true },
    preferredVesselClass: { type: String, enum: VESSEL_CLASSES, required: true },
    selectedVesselId: { type: Schema.Types.ObjectId, ref: 'MaritimeVessel', required: true },
    targetLoadingDate: { type: Date, required: true },
    forecastRunId: { type: Schema.Types.ObjectId, ref: 'ForecastRun', required: true },
    estimatedTransitDays: { type: Number, required: true, min: 0 },
    estimatedDailyRateUsd: { type: Number, required: true, min: 0 },
    estimatedCharterCostUsd: { type: Number, required: true, min: 0 },
    status: { type: String, enum: CHARTER_PLAN_STATUSES, required: true, default: 'DRAFT' },
  },
  { timestamps: true, versionKey: false },
);

charterPlanSchema.index({ requestedBy: 1, status: 1, updatedAt: -1 });

export const CharterPlanModel = model<CharterPlan>('CharterPlan', charterPlanSchema);
