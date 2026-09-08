export const VEHICLE_TYPES = ['MINI_TRUCK', 'MEDIUM_TRUCK', 'HEAVY_TRUCK', 'TRAILER', 'REFRIGERATED'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type ShipmentStatus = 'CREATED' | 'MATCHED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Shipment {
  id: string;
  source: { label: string };
  destination: { label: string };
  cargoType: string;
  weight: number;
  volume?: number;
  vehicleTypeRequired: VehicleType;
  pickupDate: string;
  deliveryDeadline: string;
  estimatedDistance?: number;
  estimatedCost?: number;
  status: ShipmentStatus;
  createdAt: string;
  assignedVehicle?: { registrationNumber: string };
}

export interface CreateShipmentInput {
  source: string;
  destination: string;
  cargoType: string;
  weight: number;
  volume?: number;
  vehicleTypeRequired: VehicleType;
  pickupDate: string;
  deliveryDeadline: string;
}
