import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';

export type VesselClass = 'HANDYSIZE' | 'SUPRAMAX' | 'PANAMAX' | 'CAPESIZE' | 'OTHER';
export type VesselNavigationStatus = 'UNDER_WAY' | 'AT_ANCHOR' | 'MOORED' | 'AT_PORT' | 'UNKNOWN';
export type MarketRateType = 'SPOT' | 'TIME_CHARTER' | 'FORWARD' | 'BUNKER';

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

export async function getMaritimeVessels(params?: { search?: string; vesselClass?: VesselClass; status?: VesselNavigationStatus; page?: number; limit?: number }) {
  const response = await apiClient.get<PaginatedResponse<MaritimeVessel[]>>('/maritime/vessels', { params: { limit: 2000, ...params } });
  return { items: response.data.data, pagination: response.data.pagination };
}

export async function getMaritimeVesselTrack(vesselId: string) {
  const response = await apiClient.get<ApiSuccess<{ points: MaritimeVesselTrackPoint[] }>>(`/maritime/vessels/${vesselId}/track`);
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

export async function createMaritimeForecastRun(input: { cargoType: string; vesselClass: VesselClass; originPortId?: string; destinationPortId?: string }) {
  const response = await apiClient.post<ApiSuccess<MaritimeForecastRun>>('/maritime/forecast-runs', input);
  return response.data.data;
}
