import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import type { MarineWeatherSnapshotDocument } from '../../models/marine-weather-snapshot.model';
import { maritimeRepository } from '../../repositories/maritime.repository';

const CACHE_WINDOW_MS = 3 * 60 * 60 * 1000;

interface OpenMeteoMarineResponse {
  current?: {
    time?: string;
    wave_height?: number;
    wave_direction?: number;
    wave_period?: number;
    wind_wave_height?: number;
    swell_wave_height?: number;
    sea_surface_temperature?: number;
    ocean_current_velocity?: number;
    ocean_current_direction?: number;
  };
}

export class MarineWeatherService {
  public async forPort(portId: string, forceRefresh: boolean) {
    const port = await maritimeRepository.findPortById(portId);
    if (!port) throw new AppError(404, 'NOT_FOUND', 'Port not found');

    const cached = await maritimeRepository.findLatestMarineWeather(portId);
    if (!forceRefresh && cached && Date.now() - cached.observedAt.getTime() < CACHE_WINDOW_MS) {
      return this.toView(cached, true);
    }

    try {
      const providerUrl = new URL(env.OPEN_METEO_MARINE_URL);
      providerUrl.searchParams.set('latitude', String(port.latitude));
      providerUrl.searchParams.set('longitude', String(port.longitude));
      providerUrl.searchParams.set(
        'current',
        'wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction',
      );
      providerUrl.searchParams.set('timezone', 'UTC');

      const providerResponse = await fetch(providerUrl, { signal: AbortSignal.timeout(8000) });
      if (!providerResponse.ok) {
        throw new Error(`Open-Meteo returned HTTP ${providerResponse.status}`);
      }
      const payload = (await providerResponse.json()) as OpenMeteoMarineResponse;
      if (!payload.current?.time) {
        throw new Error('Open-Meteo returned no current marine conditions');
      }

      const snapshot = await maritimeRepository.createMarineWeather({
        portId: port._id,
        waveHeightMeters: optionalFinite(payload.current.wave_height),
        waveDirectionDegrees: optionalFinite(payload.current.wave_direction),
        wavePeriodSeconds: optionalFinite(payload.current.wave_period),
        windWaveHeightMeters: optionalFinite(payload.current.wind_wave_height),
        swellWaveHeightMeters: optionalFinite(payload.current.swell_wave_height),
        seaSurfaceTemperatureCelsius: optionalFinite(payload.current.sea_surface_temperature),
        oceanCurrentVelocityKnots: kilometresPerHourToKnots(optionalFinite(payload.current.ocean_current_velocity)),
        oceanCurrentDirectionDegrees: optionalFinite(payload.current.ocean_current_direction),
        source: 'OPEN_METEO',
        sourceReference: providerUrl.toString(),
        observedAt: parseUtcDate(payload.current.time),
      });

      return this.toView(snapshot, false);
    } catch (error) {
      if (cached) {
        return this.toView(cached, true, 'The provider could not refresh this cached weather observation.');
      }
      throw new AppError(502, 'WEATHER_PROVIDER_ERROR', 'Marine weather data is temporarily unavailable.');
    }
  }

  private toView(snapshot: MarineWeatherSnapshotDocument, fromCache: boolean, warning?: string) {
    return {
      portId: snapshot.portId.toString(),
      waveHeightMeters: snapshot.waveHeightMeters ?? null,
      waveDirectionDegrees: snapshot.waveDirectionDegrees ?? null,
      wavePeriodSeconds: snapshot.wavePeriodSeconds ?? null,
      windWaveHeightMeters: snapshot.windWaveHeightMeters ?? null,
      swellWaveHeightMeters: snapshot.swellWaveHeightMeters ?? null,
      seaSurfaceTemperatureCelsius: snapshot.seaSurfaceTemperatureCelsius ?? null,
      oceanCurrentVelocityKnots: snapshot.oceanCurrentVelocityKnots ?? null,
      oceanCurrentDirectionDegrees: snapshot.oceanCurrentDirectionDegrees ?? null,
      source: snapshot.source,
      sourceReference: snapshot.sourceReference,
      observedAt: snapshot.observedAt.toISOString(),
      ingestedAt: snapshot.ingestedAt.toISOString(),
      fromCache,
      qualityStatus: Date.now() - snapshot.observedAt.getTime() < CACHE_WINDOW_MS ? 'FRESH' : 'STALE',
      warning: warning ?? null,
    };
  }
}

function optionalFinite(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function kilometresPerHourToKnots(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Number((value / 1.852).toFixed(3));
}

function parseUtcDate(value: string): Date {
  const parsed = new Date(value.endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Provider returned an invalid observation time');
  return parsed;
}

export const marineWeatherService = new MarineWeatherService();
