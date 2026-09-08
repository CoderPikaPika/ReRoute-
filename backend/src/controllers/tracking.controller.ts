import type { Response } from 'express';

import { AppError } from '../errors/app-error';
import { trackingService } from '../services/tracking/tracking.service';
import type { AuthenticatedRequest } from '../types/auth';

function actor(request: AuthenticatedRequest) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }
  return request.user;
}

export async function getTracking(request: AuthenticatedRequest, response: Response): Promise<void> {
  const data = await trackingService.get(String(request.params.id), actor(request));
  response.status(200).json({ success: true, data, message: 'Tracking retrieved successfully' });
}

export async function simulateTracking(request: AuthenticatedRequest, response: Response): Promise<void> {
  const data = await trackingService.simulateNextPoint(String(request.params.id), actor(request).id);
  response.status(200).json({ success: true, data, message: 'Vehicle moved to next simulated route point' });
}
