import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '../../services/vehicleApi';
import type { CreateVehicleInput } from '../../types/vehicle';

export function useVehicles() { return useQuery({ queryKey: ['vehicles'], queryFn: vehicleApi.list }); }
export function useCreateVehicle() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CreateVehicleInput) => vehicleApi.create(input), onSuccess: () => client.invalidateQueries({ queryKey: ['vehicles'] }) });
}
export function useUpdateVehicle() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<CreateVehicleInput> }) => vehicleApi.update(id, input), onSuccess: () => client.invalidateQueries({ queryKey: ['vehicles'] }) });
}
