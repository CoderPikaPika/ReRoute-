import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import { ForecastRunModel } from '../../models/forecast-run.model';
import { maritimeRepository } from '../../repositories/maritime.repository';
import { forecastService } from '../market/forecast.service';
import type { VesselClass } from '../../types/maritime';

const vesselProfiles: Record<VesselClass, { dwt: number; age: number; draft: number; loa: number; beam: number }> = {
  HANDYSIZE: { dwt: 38_000, age: 12, draft: 10.5, loa: 180, beam: 30 },
  SUPRAMAX: { dwt: 58_000, age: 10, draft: 12.2, loa: 200, beam: 32 },
  PANAMAX: { dwt: 75_000, age: 9, draft: 13.8, loa: 225, beam: 32.3 },
  CAPESIZE: { dwt: 180_000, age: 8, draft: 17.5, loa: 290, beam: 45 },
  OTHER: { dwt: 50_000, age: 10, draft: 11.5, loa: 195, beam: 31 },
};

type CargoProfile = {
  modelCargoType: 'Thermal_Coal' | 'Coking_Coal' | 'Iron_Ore';
  observationCargoType: string;
  commodityPriceUsdMt: number;
  warning?: string;
};

const cargoProfiles: Record<string, CargoProfile> = {
  'thermal coal': { modelCargoType: 'Thermal_Coal', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 125 },
  coal: { modelCargoType: 'Thermal_Coal', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 125 },
  'coking coal': { modelCargoType: 'Coking_Coal', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 250 },
  'iron ore': { modelCargoType: 'Iron_Ore', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 110 },
  'pet coke': {
    modelCargoType: 'Coking_Coal', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 105,
    warning: 'Pet Coke is forecast with the model’s Coking Coal category until Pet Coke training data and market observations are imported.',
  },
  fertilizer: {
    modelCargoType: 'Thermal_Coal', observationCargoType: 'Thermal coal', commodityPriceUsdMt: 350,
    warning: 'Fertilizer is forecast with the model’s Thermal Coal category until Fertilizer training data and market observations are imported.',
  },
};

export class MaritimeForecastService {
  public async createRun(input: { requestedBy: string; cargoType: string; vesselClass: VesselClass; originPortId?: string; destinationPortId?: string }) {
    const cargo = resolveCargoProfile(input.cargoType);
    const [rate, bunker, allPorts, vesselAvailability] = await Promise.all([
      maritimeRepository.findLatestMarketObservation({ cargoType: cargo.observationCargoType, vesselClass: input.vesselClass, rateType: 'SPOT', unit: 'USD_PER_MT' }),
      maritimeRepository.findLatestMarketObservation({ cargoType: cargo.observationCargoType, vesselClass: input.vesselClass, rateType: 'BUNKER', unit: 'USD_PER_MT' }),
      maritimeRepository.findPorts({ limit: 100 }),
      maritimeRepository.countVessels(),
    ]);
    if (!rate || !bunker) {
      throw new AppError(409, 'MODEL_INPUT_UNAVAILABLE', 'No current freight-rate and bunker observations exist for this forecast. Import licensed data or use the seeded simulation data.');
    }

    const defaultOrigin = allPorts.find((port) => port.name === 'Hay Point') ?? allPorts.find((port) => port.country === 'Australia');
    const defaultDestination = allPorts.find((port) => port.name === 'Paradip') ?? allPorts.find((port) => port.country === 'India');
    const [originPort, destinationPort] = await Promise.all([
      input.originPortId ? maritimeRepository.findPortById(input.originPortId) : Promise.resolve(defaultOrigin ?? null),
      input.destinationPortId ? maritimeRepository.findPortById(input.destinationPortId) : Promise.resolve(defaultDestination ?? null),
    ]);
    const observations = await maritimeRepository.findLatestPortObservations([originPort?._id, destinationPort?._id].filter((id): id is Types.ObjectId => Boolean(id)));
    const observationByPortId = new Map(observations.map((observation) => [observation.portId.toString(), observation]));
    const originObservation = originPort ? observationByPortId.get(originPort.id) : undefined;
    const destinationObservation = destinationPort ? observationByPortId.get(destinationPort.id) : undefined;
    const profile = vesselProfiles[input.vesselClass];
    const originModelCode = toModelPortCode(originPort?.name ?? 'Hay Point', originPort?.country ?? 'Australia');
    const destinationModelCode = toModelPortCode(destinationPort?.name ?? 'Paradip', destinationPort?.country ?? 'India');
    const prediction = await forecastService.predictAdvanced({
      origin_port: originModelCode,
      destination_port: destinationModelCode,
      origin_country: originPort?.country ?? 'Australia',
      cargo_type: cargo.modelCargoType,
      cargo_quantity_mt: profile.dwt * 0.85,
      vessel_type: titleCase(input.vesselClass),
      vessel_dwt_mt: profile.dwt,
      vessel_age_years: profile.age,
      vessel_draft_m: profile.draft,
      vessel_loa_m: profile.loa,
      vessel_beam_m: profile.beam,
      distance_nm: nauticalDistance(originPort?.latitude, originPort?.longitude, destinationPort?.latitude, destinationPort?.longitude) ?? 4_892,
      freight_rate_usd_mt: rate.value,
      bunker_price_usd_mt: bunker.value,
      commodity_price_usd_mt: cargo.commodityPriceUsdMt,
      origin_congestion_pct: originObservation?.berthOccupancyPercent ?? 50,
      destination_congestion_pct: destinationObservation?.berthOccupancyPercent ?? 50,
      origin_waiting_hours: (originObservation?.averageWaitDays ?? 1) * 24,
      destination_waiting_hours: (destinationObservation?.averageWaitDays ?? 1) * 24,
      vessel_availability: vesselAvailability,
      freight_volume_thousand_mt: 5_000_000,
    });
    const now = new Date();
    const run = await ForecastRunModel.create({
      requestedBy: new Types.ObjectId(input.requestedBy),
      originPortId: input.originPortId ? new Types.ObjectId(input.originPortId) : undefined,
      destinationPortId: input.destinationPortId ? new Types.ObjectId(input.destinationPortId) : undefined,
      cargoType: input.cargoType,
      vesselClass: input.vesselClass,
      horizonDays: Math.max(...prediction.forecasts.map((item) => item.forecast_days)),
      model: { name: 'catboost-freight-rate', version: '14-30-60-day' },
      inputObservedAt: rate.asOf,
      historical: [{ observedAt: rate.asOf, value: rate.value }],
      forecast: prediction.forecasts.map((item) => ({
        targetAt: new Date(now.getTime() + item.forecast_days * 86_400_000),
        p50: item.predicted_freight_rate_usd_mt,
      })),
      qualityStatus: rate.isEstimated || bunker.isEstimated ? 'UNVERIFIED' : 'FRESH',
      warnings: [
        rate.isEstimated || bunker.isEstimated ? 'Forecast input includes simulation or estimated observations.' : '',
        originObservation?.isEstimated || destinationObservation?.isEstimated ? 'Port congestion input includes simulation or estimated observations.' : '',
        cargo.warning ?? '',
        'CatBoost model provides point forecasts only; confidence bands require model calibration data.',
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

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function toModelPortCode(name: string, country: string): string {
  const normalizedName = name.replace(/\s+/g, '_');
  if (country === 'Australia') return `${normalizedName}_AU`;
  if (country === 'Indonesia') return `${normalizedName}_ID`;
  return normalizedName;
}

function resolveCargoProfile(cargoType: string): CargoProfile {
  const normalized = cargoType.trim().toLowerCase();
  return cargoProfiles[normalized] ?? {
    modelCargoType: 'Thermal_Coal',
    observationCargoType: 'Thermal coal',
    commodityPriceUsdMt: 125,
    warning: `${cargoType} is forecast with the model’s Thermal Coal category until matching training data and market observations are imported.`,
  };
}

function nauticalDistance(originLatitude?: number, originLongitude?: number, destinationLatitude?: number, destinationLongitude?: number): number | undefined {
  if ([originLatitude, originLongitude, destinationLatitude, destinationLongitude].some((value) => value === undefined)) return undefined;
  const radians = Math.PI / 180;
  const latitudeDelta = (destinationLatitude! - originLatitude!) * radians;
  const longitudeDelta = (destinationLongitude! - originLongitude!) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(originLatitude! * radians) * Math.cos(destinationLatitude! * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const maritimeForecastService = new MaritimeForecastService();
