import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shipmentApi } from '../../services/shipmentApi';
import type { CreateShipmentInput } from '../../types/shipment';

export function useShipments() {
  return useQuery({ queryKey: ['shipments'], queryFn: shipmentApi.list });
}

export function useShipment(id: string) {
  return useQuery({ queryKey: ['shipments', id], queryFn: () => shipmentApi.get(id), enabled: Boolean(id) });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShipmentInput) => shipmentApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });
}
