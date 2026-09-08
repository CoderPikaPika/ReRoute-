import type { Response } from 'express';

import { AppError } from '../errors/app-error';
import { matchingService } from '../services/matching/matching.service';
import {
  shipmentService,
  type CreateShipmentInput,
} from '../services/shipment/shipment.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { ShipmentStatus } from '../types/domain';
import { assignmentService } from '../services/assignment/assignment.service';

function getActor(request: AuthenticatedRequest) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }

  return request.user;
}

export async function createShipment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actor = getActor(request);
  const shipment = await shipmentService.create(actor.id, request.body as CreateShipmentInput);
  response.status(201).json({ success: true, data: shipment, message: 'Shipment created successfully' });
}

export async function listShipments(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actor = getActor(request);
  const page = Number(request.query.page ?? 1);
  const limit = Math.min(Number(request.query.limit ?? 20), 100);
  const status = request.query.status as ShipmentStatus | undefined;
  const shipments = await shipmentService.listForActor(actor, { page, limit, status });
  response.status(200).json({
    success: true,
    data: shipments,
    pagination: { page, limit, total: shipments.length, totalPages: 1 },
    message: 'Shipments retrieved successfully',
  });
}

export async function getShipment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const shipment = await shipmentService.getForActor(String(request.params.id), getActor(request));
  response.status(200).json({ success: true, data: shipment, message: 'Shipment retrieved successfully' });
}

export async function cancelShipment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actor = getActor(request);
  const shipment = await shipmentService.cancel(String(request.params.id), actor.id);
  response.status(200).json({ success: true, data: shipment, message: 'Shipment cancelled successfully' });
}

export async function getMatches(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actor = getActor(request);
  const shipment = await shipmentService.getForShipper(String(request.params.id), actor.id);
  const matches = await matchingService.findMatches(shipment);
  response.status(200).json({ success: true, data: matches, message: 'Smart matching recommendations retrieved' });
}

export async function assignShipment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actor = getActor(request);
  const shipment = await assignmentService.assign(
    String(request.params.id),
    actor.id,
    request.body.vehicleId as string,
  );
  response.status(200).json({ success: true, data: shipment, message: 'Vehicle assigned successfully' });
}
