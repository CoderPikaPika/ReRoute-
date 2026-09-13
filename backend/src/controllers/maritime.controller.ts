import type { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';

import { AppError } from '../errors/app-error';
import { maritimeIntelligenceService } from '../services/maritime/maritime-intelligence.service';
import { maritimeForecastService } from '../services/maritime/maritime-forecast.service';
import { marineWeatherService } from '../services/maritime/marine-weather.service';
import { charterPlanningService } from '../services/maritime/charter-planning.service';
import { CHARTER_PLAN_STATUSES } from '../models/charter-plan.model';
import { VESSEL_CLASSES, VESSEL_NAVIGATION_STATUSES } from '../types/maritime';
import type { AuthenticatedRequest } from '../types/auth';

const vesselListQuery = z.object({
  search: z.string().trim().max(80).optional(),
  vesselClass: z.enum(VESSEL_CLASSES).optional(),
  status: z.enum(VESSEL_NAVIGATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(2000).default(100),
});

const portListQuery = z.object({
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const historyQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
});

const marketSeriesQuery = z.object({
  cargoType: z.string().trim().max(100).optional(),
  vesselClass: z.enum(VESSEL_CLASSES).optional(),
  rateType: z.enum(['SPOT', 'TIME_CHARTER', 'FORWARD', 'BUNKER']).optional(),
  unit: z.enum(['USD_PER_DAY', 'USD_PER_MT']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(365),
});

const weatherQuery = z.object({
  refresh: z.enum(['true', 'false']).optional().default('false'),
});

const marketImportSchema = z.object({
  records: z.array(z.object({
    market: z.string().trim().min(1).max(120),
    originPortId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    destinationPortId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    cargoType: z.string().trim().min(1).max(100),
    vesselClass: z.enum(VESSEL_CLASSES),
    rateType: z.enum(['SPOT', 'TIME_CHARTER', 'FORWARD', 'BUNKER']),
    value: z.number().positive(),
    currency: z.string().trim().length(3),
    unit: z.enum(['USD_PER_DAY', 'USD_PER_MT']),
    asOf: z.coerce.date(),
    availableAt: z.coerce.date().optional(),
    sourceReference: z.string().trim().url().max(500).optional(),
    isEstimated: z.boolean().default(false),
    qualityStatus: z.enum(['FRESH', 'STALE', 'PARTIAL', 'UNVERIFIED']).default('UNVERIFIED'),
  })).min(1).max(5000),
});

const forecastRunSchema = z.object({
  cargoType: z.string().trim().min(1).max(100),
  vesselClass: z.enum(VESSEL_CLASSES),
  originPortId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  destinationPortId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  cargoQuantityMt: z.number().positive().max(1_000_000).optional(),
});

const charterInputSchema = z.object({
  cargoType: z.string().trim().min(1).max(100),
  quantityMt: z.coerce.number().positive().max(1_000_000),
  originPortId: z.string().regex(/^[a-f\d]{24}$/i),
  destinationPortId: z.string().regex(/^[a-f\d]{24}$/i),
  preferredVesselClass: z.enum(VESSEL_CLASSES),
  targetLoadingDate: z.coerce.date(),
});

const saveCharterPlanSchema = charterInputSchema.extend({
  selectedVesselId: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum(CHARTER_PLAN_STATUSES),
});

const charterPlanListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters.', parsed.error.flatten());
  }
  return parsed.data;
}

function dateRange(input: { from?: Date; to?: Date }) {
  const now = new Date();
  const from = input.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = input.to ?? now;
  if (from > to) throw new AppError(400, 'VALIDATION_ERROR', 'The start date must be before the end date.');
  return { from, to };
}

function routeId(value: string | string[] | undefined, label: string): string {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Enter a valid ${label} identifier.`);
  }
  return id;
}

export async function getMaritimeDashboard(_request: AuthenticatedRequest, response: Response): Promise<void> {
  const data = await maritimeIntelligenceService.dashboard();
  response.status(200).json({ success: true, data, message: 'Maritime dashboard data retrieved successfully.' });
}

export async function listMaritimeVessels(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(vesselListQuery, request.query);
  const data = await maritimeIntelligenceService.listVessels(query);
  response.status(200).json({ success: true, data: data.items, pagination: data.pagination, message: 'Vessels retrieved successfully.' });
}

export async function getMaritimeVessel(request: AuthenticatedRequest, response: Response): Promise<void> {
  const data = await maritimeIntelligenceService.getVessel(routeId(request.params.id, 'vessel'));
  response.status(200).json({ success: true, data, message: 'Vessel retrieved successfully.' });
}

export async function getMaritimeVesselTrack(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(historyQuery, request.query);
  const range = dateRange(query);
  const data = await maritimeIntelligenceService.vesselTrack(routeId(request.params.id, 'vessel'), range.from, range.to, query.limit);
  response.status(200).json({ success: true, data, message: 'Vessel track retrieved successfully.' });
}

export async function listMaritimePorts(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(portListQuery, request.query);
  const data = await maritimeIntelligenceService.listPorts(query.search, query.limit);
  response.status(200).json({ success: true, data, message: 'Ports retrieved successfully.' });
}

export async function getMaritimePort(request: AuthenticatedRequest, response: Response): Promise<void> {
  const data = await maritimeIntelligenceService.getPort(routeId(request.params.id, 'port'));
  response.status(200).json({ success: true, data, message: 'Port retrieved successfully.' });
}

export async function getMaritimePortHistory(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(historyQuery, request.query);
  const range = dateRange(query);
  const data = await maritimeIntelligenceService.portHistory(routeId(request.params.id, 'port'), range.from, range.to);
  response.status(200).json({ success: true, data, message: 'Port observation history retrieved successfully.' });
}

export async function getMaritimePortWeather(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(weatherQuery, request.query);
  const data = await marineWeatherService.forPort(routeId(request.params.id, 'port'), query.refresh === 'true');
  response.status(200).json({ success: true, data, message: 'Marine weather retrieved successfully.' });
}

export async function getMarketSeries(request: AuthenticatedRequest, response: Response): Promise<void> {
  const query = parseOrThrow(marketSeriesQuery, request.query);
  const range = dateRange(query);
  const data = await maritimeIntelligenceService.marketSeries({ ...query, ...range });
  response.status(200).json({ success: true, data, message: 'Market observation series retrieved successfully.' });
}

export async function importMarketObservations(request: AuthenticatedRequest, response: Response): Promise<void> {
  const parsed = marketImportSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Enter valid market-observation records.', parsed.error.flatten());
  }
  const importedAt = new Date();
  const data = await maritimeIntelligenceService.importMarketObservations(
    parsed.data.records.map((record) => ({
      market: record.market,
      originPortId: record.originPortId ? new Types.ObjectId(record.originPortId) : undefined,
      destinationPortId: record.destinationPortId ? new Types.ObjectId(record.destinationPortId) : undefined,
      cargoType: record.cargoType,
      vesselClass: record.vesselClass,
      rateType: record.rateType,
      value: record.value,
      currency: record.currency.toUpperCase(),
      unit: record.unit,
      source: 'ADMIN_IMPORT',
      sourceReference: record.sourceReference,
      isEstimated: record.isEstimated,
      qualityStatus: record.qualityStatus,
      asOf: record.asOf,
      availableAt: record.availableAt ?? record.asOf,
      ingestedAt: importedAt,
    })),
  );
  response.status(201).json({ success: true, data, message: 'Market observations imported successfully.' });
}

export async function createMaritimeForecastRun(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  const parsed = forecastRunSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Enter valid cargo, vessel, and route inputs.', parsed.error.flatten());
  }
  const data = await maritimeForecastService.createRun({ requestedBy: request.user.id, ...parsed.data });
  response.status(201).json({ success: true, data, message: 'Maritime forecast run generated successfully.' });
}

export async function getLatestMaritimeForecastRun(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  const data = await maritimeForecastService.getLatestRun(request.user.id);
  response.status(200).json({ success: true, data, message: data ? 'Latest maritime forecast run retrieved successfully.' : 'No maritime forecast run exists yet.' });
}

export async function getMaritimeCharterOptions(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  const parsed = charterInputSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Enter valid charter planning inputs.', parsed.error.flatten());
  const data = await charterPlanningService.getOptions({ requestedBy: request.user.id, ...parsed.data });
  response.status(200).json({ success: true, data, message: 'Charter options generated successfully.' });
}

export async function saveMaritimeCharterPlan(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  const parsed = saveCharterPlanSchema.safeParse(request.body);
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Enter a valid charter plan.', parsed.error.flatten());
  const data = await charterPlanningService.savePlan({ requestedBy: request.user.id, ...parsed.data });
  response.status(201).json({ success: true, data, message: parsed.data.status === 'DRAFT' ? 'Charter plan saved as draft.' : 'Charter plan is ready for contract creation.' });
}

export async function listMaritimeCharterPlans(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!request.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  const query = parseOrThrow(charterPlanListQuery, request.query);
  const data = await charterPlanningService.listPlans(request.user.id, query.limit);
  response.status(200).json({ success: true, data, message: 'Saved charter plans retrieved successfully.' });
}
