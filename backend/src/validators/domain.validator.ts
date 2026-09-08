import { z } from 'zod';

import { SHIPMENT_STATUSES, VEHICLE_STATUSES, VEHICLE_TYPES } from '../types/domain';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(SHIPMENT_STATUSES).optional(),
});

export const createShipmentSchema = z.object({
  source: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  cargoType: z.string().trim().min(2).max(100),
  weight: z.coerce.number().positive().max(100000),
  volume: z.coerce.number().positive().max(10000).optional(),
  vehicleTypeRequired: z.enum(VEHICLE_TYPES),
  pickupDate: z.string().datetime(),
  deliveryDeadline: z.string().datetime(),
});

export const createVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(4).max(30),
  vehicleType: z.enum(VEHICLE_TYPES),
  capacityWeight: z.coerce.number().positive().max(100000),
  capacityVolume: z.coerce.number().positive().max(10000).optional(),
  currentLocation: z.string().trim().min(2).max(120),
  isAvailable: z.boolean().optional(),
});

export const updateVehicleSchema = createVehicleSchema
  .partial()
  .extend({
    status: z.enum(VEHICLE_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const assignShipmentSchema = z.object({
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle id'),
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']),
});
