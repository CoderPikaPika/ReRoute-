import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';

export interface ForecastRequest {
  dayOfYear: number;
  freightRateUsdMt: number;
  bunkerPriceUsdMt: number;
  daysSinceStart: number;
}

export interface ForecastResult {
  forecast_days: number;
  predicted_freight_rate_usd_mt: number;
  current_freight_rate_usd_mt: number;
  change_usd_mt: number;
  change_percent: number;
  direction: 'Increase' | 'Decrease' | 'Stable';
}

export interface ForecastResponse {
  forecasts: ForecastResult[];
  data_source: string;
  disclaimer?: string;
}

export class ForecastService {
  public async status() {
    try {
      const response = await fetch(env.ML_SERVICE_URL + '/health', { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return response.json();
    } catch {
      throw new AppError(503, 'ML_SERVICE_UNAVAILABLE', 'The freight forecasting service is not available.');
    }
  }

  public async predict(input: ForecastRequest): Promise<ForecastResponse> {
    let response: Response;
    try {
      response = await fetch(env.ML_SERVICE_URL + '/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_year: input.dayOfYear,
          day_of_year_sin: Math.sin((2 * Math.PI * input.dayOfYear) / 365),
          freight_rate_usd_mt: input.freightRateUsdMt,
          bunker_price_usd_mt: input.bunkerPriceUsdMt,
          days_since_start: input.daysSinceStart,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppError(503, 'ML_SERVICE_UNAVAILABLE', 'The freight forecasting service is not available. Start the ML service on port 8000.');
    }

    if (!response.ok) {
      throw new AppError(502, 'ML_SERVICE_ERROR', 'The freight forecasting service rejected this prediction request.');
    }
    return response.json() as Promise<ForecastResponse>;
  }

  public async importHistoricalData(records: unknown[]) {
    let response: Response;
    try {
      response = await fetch(env.ML_SERVICE_URL + '/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new AppError(503, 'ML_SERVICE_UNAVAILABLE', 'The freight forecasting service is not available for retraining.');
    }
    if (!response.ok) {
      throw new AppError(502, 'ML_IMPORT_FAILED', 'The ML service could not import the supplied historical data.');
    }
    return response.json();
  }
}

export const forecastService = new ForecastService();
