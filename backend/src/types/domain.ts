export const VEHICLE_TYPES = [
  'MINI_TRUCK',
  'MEDIUM_TRUCK',
  'HEAVY_TRUCK',
  'TRAILER',
  'REFRIGERATED',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE', 'OFFLINE'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  'CREATED',
  'MATCHED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ['PENDING', 'ACCEPTED'] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const SHIPMENT_EVENT_TYPES = [
  'SHIPMENT_CREATED',
  'MATCH_FOUND',
  'VEHICLE_ASSIGNED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_REJECTED',
  'PICKED_UP',
  'DEPARTED',
  'LOCATION_UPDATED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type ShipmentEventType = (typeof SHIPMENT_EVENT_TYPES)[number];

export interface LocationPoint {
  label: string;
  latitude: number;
  longitude: number;
}

export interface StoredLocation extends LocationPoint {
  updatedAt: Date;
}

export interface RoutePoint extends LocationPoint {
  sequence: number;
}
