import { useQuery } from '@tanstack/react-query';

import { getLatestMaritimeForecastRun, getMaritimeCharterPlans, getMaritimeMarketObservations, getMaritimePortHistory, getMaritimePorts, getMaritimePortWeather, getMaritimeVesselTrack, getMaritimeVessels, type MarketRateType, type VesselClass, type VesselNavigationStatus } from '../../services/maritimeApi';

export function useMaritimeVessels(filters: { search?: string; vesselClass?: VesselClass; status?: VesselNavigationStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['maritime-vessels', filters],
    queryFn: () => getMaritimeVessels(filters),
    refetchInterval: 60_000,
  });
}

export function useMaritimeVesselTrack(vesselId: string | undefined) {
  return useQuery({
    queryKey: ['maritime-vessel-track', vesselId],
    queryFn: () => getMaritimeVesselTrack(vesselId!),
    enabled: Boolean(vesselId),
    refetchInterval: 60_000,
  });
}

export function useMaritimePorts(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ['maritime-ports', filters],
    queryFn: () => getMaritimePorts(filters),
    refetchInterval: 5 * 60_000,
  });
}

export function useMaritimePortHistory(portId: string | undefined) {
  return useQuery({
    queryKey: ['maritime-port-history', portId],
    queryFn: () => getMaritimePortHistory(portId!),
    enabled: Boolean(portId),
    refetchInterval: 5 * 60_000,
  });
}

export function useMaritimePortWeather(portId: string | undefined) {
  return useQuery({
    queryKey: ['maritime-port-weather', portId],
    queryFn: () => getMaritimePortWeather(portId!),
    enabled: Boolean(portId),
    staleTime: 3 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
}

export function useMaritimeMarketObservations(filters: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT'; from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ['maritime-market-observations', filters],
    queryFn: () => getMaritimeMarketObservations(filters),
    refetchInterval: 15 * 60_000,
  });
}

export function useLatestMaritimeForecastRun() {
  return useQuery({
    queryKey: ['latest-maritime-forecast-run'],
    queryFn: getLatestMaritimeForecastRun,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useMaritimeCharterPlans() {
  return useQuery({
    queryKey: ['maritime-charter-plans'],
    queryFn: () => getMaritimeCharterPlans(),
  });
}
