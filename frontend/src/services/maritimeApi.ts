import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';

export type VesselClass = 'HANDYSIZE' | 'SUPRAMAX' | 'PANAMAX' | 'CAPESIZE' | 'OTHER';
export type VesselNavigationStatus = 'UNDER_WAY' | 'AT_ANCHOR' | 'MOORED' | 'AT_PORT' | 'UNKNOWN';
export type MarketRateType = 'SPOT' | 'TIME_CHARTER' | 'FORWARD' | 'BUNKER';
export type CongestionLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
export type PortOperationalStatus = 'OPERATIONAL' | 'RESTRICTED' | 'CLOSED' | 'UNKNOWN';

export interface MaritimeVessel {
  id: string;
  name: string;
  imo: string | null;
  mmsi: string | null;
  vesselClass: VesselClass;
  deadweightTonnes: number | null;
  dimensions: { lengthOverallMeters: number | null; beamMeters: number | null; maxDraftMeters: number | null };
  flag: string | null;
  operator: string | null;
  source: string;
  observedAt: string;
  position: {
    longitude: number;
    latitude: number;
    speedKnots: number | null;
    courseDegrees: number | null;
    headingDegrees: number | null;
    navigationStatus: VesselNavigationStatus;
    observedAt: string;
    source: string;
    isEstimated: boolean;
    qualityStatus: string;
  } | null;
}

export interface PaginatedResponse<T> extends ApiSuccess<T> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface MaritimeVesselTrackPoint {
  longitude: number;
  latitude: number;
  observedAt: string;
  speedKnots: number | null;
  courseDegrees: number | null;
  headingDegrees: number | null;
  navigationStatus: VesselNavigationStatus;
  source: string;
  isEstimated: boolean;
  qualityStatus: string;
}

export interface MaritimeMarketObservation {
  id: string;
  market: string;
  cargoType: string;
  vesselClass: VesselClass;
  rateType: MarketRateType;
  value: number;
  currency: string;
  unit: 'USD_PER_DAY' | 'USD_PER_MT';
  asOf: string;
  availableAt: string;
  source: string;
  sourceReference: string | null;
  isEstimated: boolean;
  qualityStatus: string;
}

export interface MaritimePortObservation {
  congestionLevel: CongestionLevel;
  waitingVessels: number | null;
  anchoredVessels: number | null;
  berthOccupancyPercent: number | null;
  averageWaitDays: number | null;
  averageTurnaroundDays: number | null;
  windSpeedKnots: number | null;
  visibilityKm: number | null;
  source: string;
  observedAt: string;
  isEstimated: boolean;
  qualityStatus: string;
}

export interface MaritimePort {
  id: string;
  name: string;
  unlocode: string;
  country: string;
  region: string | null;
  latitude: number;
  longitude: number;
  constraints: {
    maxDraftMeters: number | null;
    maxLoaMeters: number | null;
    maxBeamMeters: number | null;
    channelDepthMeters: number | null;
    berthCount: number | null;
  };
  handlingCapabilities: string[];
  operationalStatus: PortOperationalStatus;
  observation: MaritimePortObservation | null;
  source: string;
  observedAt: string;
}

export interface MaritimePortHistoryPoint {
  observedAt: string;
  congestionLevel: CongestionLevel;
  waitingVessels: number | null;
  anchoredVessels: number | null;
  berthOccupancyPercent: number | null;
  averageWaitDays: number | null;
  averageTurnaroundDays: number | null;
  source: string;
  isEstimated: boolean;
  qualityStatus: string;
}

export interface MaritimeWeather {
  portId: string;
  waveHeightMeters: number | null;
  waveDirectionDegrees: number | null;
  wavePeriodSeconds: number | null;
  windWaveHeightMeters: number | null;
  swellWaveHeightMeters: number | null;
  seaSurfaceTemperatureCelsius: number | null;
  oceanCurrentVelocityKnots: number | null;
  oceanCurrentDirectionDegrees: number | null;
  source: string;
  sourceReference: string | null;
  observedAt: string;
  ingestedAt: string;
  fromCache: boolean;
  qualityStatus: string;
  warning: string | null;
}

export interface MaritimeForecastRun {
  id: string;
  cargoType: string;
  vesselClass: VesselClass;
  currentRateUsdMt: number;
  bunkerPriceUsdMt: number;
  source: { rate: string; bunker: string; model: string };
  forecast: Array<{ forecast_days: number; predicted_freight_rate_usd_mt: number; current_freight_rate_usd_mt: number; change_usd_mt: number; change_percent: number; direction: 'Increase' | 'Decrease' | 'Stable' }>;
  qualityStatus: string;
  warnings: string[];
  createdAt: string;
}

export interface MaritimeCharterOption {
  vesselId: string;
  vesselName: string;
  vesselClass: VesselClass;
  deadweightTonnes: number;
  navigationStatus: VesselNavigationStatus;
  availabilityDays: number;
  eligible: boolean;
  score: number;
  reasons: string[];
  estimatedTransitDays: number;
  estimatedDailyRateUsd: number;
  estimatedCharterCostUsd: number;
  marketRateSource: string;
  isEstimated: boolean;
}

export interface MaritimeCharterOptions {
  generatedAt: string;
  forecast: {
    id: string;
    cargoType: string;
    vesselClass: VesselClass;
    createdAt: string;
    model: string;
    qualityStatus: string;
    rateUsdMt: number;
  };
  route: {
    origin: MaritimeCharterPort;
    destination: MaritimeCharterPort;
    distanceNm: number;
    estimatedTransitDays: number;
  };
  options: MaritimeCharterOption[];
  warnings: string[];
}

export interface MaritimeCharterPort {
  id: string;
  name: string;
  country: string;
  maxDraftMeters: number | null;
  maxLoaMeters: number | null;
  handlingCapabilities: string[];
  averageWaitDays: number | null;
  congestionLevel: CongestionLevel;
  source: string;
  isEstimated: boolean;
}

export interface SavedMaritimeCharterPlan {
  id: string;
  status: 'DRAFT' | 'READY_FOR_CONTRACT';
  cargoType: string;
  quantityMt: number;
  originPortId: string;
  destinationPortId: string;
  preferredVesselClass: VesselClass;
  selectedVesselId: string;
  targetLoadingDate: string;
  estimatedTransitDays: number;
  estimatedDailyRateUsd: number;
  estimatedCharterCostUsd: number;
  createdAt: string;
  updatedAt?: string;
}

export async function getMaritimeVessels(params?: { search?: string; vesselClass?: VesselClass; status?: VesselNavigationStatus; page?: number; limit?: number }) {
  const response = await apiClient.get<PaginatedResponse<MaritimeVessel[]>>('/maritime/vessels', { params: { limit: 2000, ...params } });
  return { items: response.data.data, pagination: response.data.pagination };
}

export async function getMaritimeVesselTrack(vesselId: string) {
  const response = await apiClient.get<ApiSuccess<{ points: MaritimeVesselTrackPoint[] }>>(`/maritime/vessels/${vesselId}/track`);
  return response.data.data;
}

export async function getMaritimePorts(params?: { search?: string; limit?: number }) {
  const response = await apiClient.get<ApiSuccess<MaritimePort[]>>('/maritime/ports', { params: { limit: 100, ...params } });
  return response.data.data;
}

export async function getMaritimePortHistory(portId: string, params?: { from?: Date; to?: Date; limit?: number }) {
  const response = await apiClient.get<ApiSuccess<MaritimePortHistoryPoint[]>>(`/maritime/ports/${portId}/history`, {
    params: { from: params?.from?.toISOString(), to: params?.to?.toISOString(), limit: params?.limit ?? 1000 },
  });
  return response.data.data;
}

export async function getMaritimePortWeather(portId: string) {
  const response = await apiClient.get<ApiSuccess<MaritimeWeather>>(`/maritime/ports/${portId}/weather`);
  return response.data.data;
}

export async function getMaritimeMarketObservations(params: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT'; from?: Date; to?: Date }) {
  const response = await apiClient.get<ApiSuccess<MaritimeMarketObservation[]>>('/maritime/market/observations', {
    params: {
      ...params,
      from: params.from?.toISOString(),
      to: params.to?.toISOString(),
      limit: 365,
    },
  });
  return response.data.data;
}

export async function createMaritimeForecastRun(input: { cargoType: string; vesselClass: VesselClass; originPortId?: string; destinationPortId?: string; cargoQuantityMt?: number }) {
  const response = await apiClient.post<ApiSuccess<MaritimeForecastRun>>('/maritime/forecast-runs', input);
  return response.data.data;
}

export async function getLatestMaritimeForecastRun() {
  const response = await apiClient.get<ApiSuccess<MaritimeForecastRun | null>>('/maritime/forecast-runs/latest');
  return response.data.data;
}

export async function getMaritimeCharterOptions(input: { cargoType: string; quantityMt: number; originPortId: string; destinationPortId: string; preferredVesselClass: VesselClass; targetLoadingDate: string }) {
  const response = await apiClient.post<ApiSuccess<MaritimeCharterOptions>>('/maritime/charter-options', input);
  return response.data.data;
}

export async function saveMaritimeCharterPlan(input: { cargoType: string; quantityMt: number; originPortId: string; destinationPortId: string; preferredVesselClass: VesselClass; targetLoadingDate: string; selectedVesselId: string; status: 'DRAFT' | 'READY_FOR_CONTRACT' }) {
  const response = await apiClient.post<ApiSuccess<SavedMaritimeCharterPlan>>('/maritime/charter-plans', input);
  return response.data.data;
}

export async function getMaritimeCharterPlans(limit = 20) {
  const response = await apiClient.get<ApiSuccess<SavedMaritimeCharterPlan[]>>('/maritime/charter-plans', { params: { limit } });
  return response.data.data;
}
