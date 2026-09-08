import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';
import type { CreateVehicleInput, Vehicle } from '../types/vehicle';

export const vehicleApi = {
  async list(): Promise<Vehicle[]> {
    const response = await apiClient.get<ApiSuccess<Vehicle[]>>('/vehicles');
    return response.data.data;
  },
  async create(input: CreateVehicleInput): Promise<Vehicle> {
    const response = await apiClient.post<ApiSuccess<Vehicle>>('/vehicles', input);
    return response.data.data;
  },
  async update(id: string, input: Partial<CreateVehicleInput>): Promise<Vehicle> {
    const response = await apiClient.patch<ApiSuccess<Vehicle>>('/vehicles/' + id, input);
    return response.data.data;
  },
};
