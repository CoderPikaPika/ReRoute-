import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import { ForecastRunModel } from '../../models/forecast-run.model';
import { maritimeRepository } from '../../repositories/maritime.repository';
import { forecastService } from '../market/forecast.service';
import type { VesselClass } from '../../types/maritime';

export class MaritimeForecastService {
  public async createRun(input: { requestedBy: string; cargoType: string; vesselClass: VesselClass; originPortId?: string; destinationPortId?: string }) {
    const [rate, bunker] = await Promise.all([
      maritimeRepository.findLatestMarketObservation({ cargoType: input.cargoType, vesselClass: input.vesselClass, rateType: 'SPOT', unit: 'USD_PER_MT' }),
      maritimeRepository.findLatestMarketObservation({ cargoType: input.cargoType, vesselClass: input.vesselClass, rateType: 'BUNKER', unit: 'USD_PER_MT' }),
    ]);
    if (!rate || !bunker) {
      throw new AppError(409, 'MODEL_INPUT_UNAVAILABLE', 'No current freight-rate and bunker observations exist for this forecast. Import licensed data or use the seeded simulation data.');
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
    const prediction = await forecastService.predict({
      dayOfYear,
      freightRateUsdMt: rate.value,
      bunkerPriceUsdMt: bunker.value,
      daysSinceStart: 365,
    });
    const run = await ForecastRunModel.create({
      requestedBy: new Types.ObjectId(input.requestedBy),
      originPortId: input.originPortId ? new Types.ObjectId(input.originPortId) : undefined,
      destinationPortId: input.destinationPortId ? new Types.ObjectId(input.destinationPortId) : undefined,
      cargoType: input.cargoType,
      vesselClass: input.vesselClass,
      horizonDays: Math.max(...prediction.forecasts.map((item) => item.forecast_days)),
      model: { name: 'xgboost-freight-rate', version: '5-feature-14-30-60-day' },
      inputObservedAt: rate.asOf,
      historical: [{ observedAt: rate.asOf, value: rate.value }],
      forecast: prediction.forecasts.map((item) => ({
        targetAt: new Date(now.getTime() + item.forecast_days * 86_400_000),
        p50: item.predicted_freight_rate_usd_mt,
      })),
      qualityStatus: rate.isEstimated || bunker.isEstimated ? 'UNVERIFIED' : 'FRESH',
      warnings: [
        rate.isEstimated || bunker.isEstimated ? 'Forecast input includes simulation or estimated observations.' : '',
        'Current model supplies point forecasts only; confidence bands require the supplied production model.',
      ].filter(Boolean),
    });
    return {
      id: run.id,
      cargoType: run.cargoType,
      vesselClass: run.vesselClass,
      currentRateUsdMt: rate.value,
      bunkerPriceUsdMt: bunker.value,
      source: { rate: rate.source, bunker: bunker.source, model: prediction.data_source },
      forecast: prediction.forecasts,
      qualityStatus: run.qualityStatus,
      warnings: run.warnings,
      createdAt: run.createdAt.toISOString(),
    };
  }
}

export const maritimeForecastService = new MaritimeForecastService();
