import { useQuery } from '@tanstack/react-query';

import { getMaritimeMarketObservations, getMaritimeVesselTrack, getMaritimeVessels, type MarketRateType, type VesselClass, type VesselNavigationStatus } from '../../services/maritimeApi';

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

export function useMaritimeMarketObservations(filters: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT'; from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ['maritime-market-observations', filters],
    queryFn: () => getMaritimeMarketObservations(filters),
    refetchInterval: 15 * 60_000,
  });
}
