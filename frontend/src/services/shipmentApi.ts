import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';
import type { CreateShipmentInput, Shipment } from '../types/shipment';

export const shipmentApi = {
  async list(): Promise<Shipment[]> {
    const response = await apiClient.get<ApiSuccess<Shipment[]>>('/shipments');
    return response.data.data;
  },
  async get(id: string): Promise<Shipment> {
    const response = await apiClient.get<ApiSuccess<Shipment>>('/shipments/' + id);
    return response.data.data;
  },
  async create(input: CreateShipmentInput): Promise<Shipment> {
    const response = await apiClient.post<ApiSuccess<Shipment>>('/shipments', input);
    return response.data.data;
  },
};
