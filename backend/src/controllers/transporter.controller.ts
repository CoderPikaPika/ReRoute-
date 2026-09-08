import type { Response } from 'express';

import { AppError } from '../errors/app-error';
import { assignmentService } from '../services/assignment/assignment.service';
import { shipmentService } from '../services/shipment/shipment.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { ShipmentStatus } from '../types/domain';

function transporter(request: AuthenticatedRequest) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }
  return request.user;
}

export async function listTransporterShipments(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const actor = transporter(request);
  const data = await shipmentService.listForActor(actor, {
    page: Number(request.query.page ?? 1),
    limit: Math.min(Number(request.query.limit ?? 20), 100),
    status: request.query.status as ShipmentStatus | undefined,
  });
  response.status(200).json({ success: true, data, message: 'Assigned shipments retrieved successfully' });
}

export async function acceptAssignment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const shipment = await assignmentService.accept(String(request.params.id), transporter(request).id);
  response.status(200).json({ success: true, data: shipment, message: 'Assignment accepted successfully' });
}

export async function rejectAssignment(request: AuthenticatedRequest, response: Response): Promise<void> {
  const shipment = await assignmentService.reject(String(request.params.id), transporter(request).id);
  response.status(200).json({ success: true, data: shipment, message: 'Assignment rejected successfully' });
}

export async function updateTransporterShipmentStatus(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const shipment = await assignmentService.updateStatus(
    String(request.params.id),
    transporter(request).id,
    request.body.status,
  );
  response.status(200).json({ success: true, data: shipment, message: 'Shipment status updated successfully' });
}
