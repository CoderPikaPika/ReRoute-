import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';

export interface FreightForecast {
  forecast_days: number;
  predicted_freight_rate_usd_mt: number;
  current_freight_rate_usd_mt: number;
  change_usd_mt: number;
  change_percent: number;
  direction: 'Increase' | 'Decrease' | 'Stable';
}

export interface FreightForecastInput {
  dayOfYear: number;
  freightRateUsdMt: number;
  bunkerPriceUsdMt: number;
  daysSinceStart: number;
}

export interface ModelStatus {
  status: string;
  models_loaded: number[];
  data_source?: string;
}
export interface HistoricalMarketRecord {
  date: string;
  freight_rate_usd_mt: number;
  bunker_price_usd_mt: number;
}

export async function getFreightForecast(input: FreightForecastInput): Promise<FreightForecast[]> {
  const response = await apiClient.post<ApiSuccess<{ forecasts: FreightForecast[] }>>('/market/forecast', input);
  return response.data.data.forecasts;
}

export async function getModelStatus(): Promise<ModelStatus> {
  const response = await apiClient.get<ApiSuccess<ModelStatus>>('/market/status');
  return response.data.data;
}

export async function importHistoricalMarketData(records: HistoricalMarketRecord[]): Promise<{ records_imported: number }> {
  const response = await apiClient.post<ApiSuccess<{ records_imported: number }>>('/market/data/import', { records });
  return response.data.data;
}
