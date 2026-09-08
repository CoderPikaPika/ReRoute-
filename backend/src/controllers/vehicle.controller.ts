import type { Response } from 'express';

import { AppError } from '../errors/app-error';
import { vehicleService, type CreateVehicleInput, type UpdateVehicleInput } from '../services/vehicle/vehicle.service';
import type { AuthenticatedRequest } from '../types/auth';

function getTransporterId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }

  return request.user.id;
}

export async function createVehicle(request: AuthenticatedRequest, response: Response): Promise<void> {
  const vehicle = await vehicleService.create(getTransporterId(request), request.body as CreateVehicleInput);
  response.status(201).json({ success: true, data: vehicle, message: 'Vehicle created successfully' });
}

export async function listVehicles(request: AuthenticatedRequest, response: Response): Promise<void> {
  const vehicles = await vehicleService.list(getTransporterId(request), {
    page: Number(request.query.page ?? 1),
    limit: Math.min(Number(request.query.limit ?? 20), 100),
  });
  response.status(200).json({ success: true, data: vehicles, message: 'Vehicles retrieved successfully' });
}

export async function getVehicle(request: AuthenticatedRequest, response: Response): Promise<void> {
  const vehicle = await vehicleService.get(String(request.params.id), getTransporterId(request));
  response.status(200).json({ success: true, data: vehicle, message: 'Vehicle retrieved successfully' });
}

export async function updateVehicle(request: AuthenticatedRequest, response: Response): Promise<void> {
  const vehicle = await vehicleService.update(
    String(request.params.id),
    getTransporterId(request),
    request.body as UpdateVehicleInput,
  );
  response.status(200).json({ success: true, data: vehicle, message: 'Vehicle updated successfully' });
}
