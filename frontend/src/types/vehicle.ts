import type { VehicleType } from './shipment';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityWeight: number;
  capacityVolume?: number;
  currentLocation: { label: string };
  isAvailable: boolean;
  status: string;
}

export interface CreateVehicleInput {
  registrationNumber: string;
  vehicleType: VehicleType;
  capacityWeight: number;
  capacityVolume?: number;
  currentLocation: string;
  isAvailable?: boolean;
  status?: string;
}
