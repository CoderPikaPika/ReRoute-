import type { Response } from 'express';

import { AppError } from '../errors/app-error';
import { dashboardService } from '../services/analytics/dashboard.service';
import { shipmentService } from '../services/shipment/shipment.service';
import type { AuthenticatedRequest } from '../types/auth';

function currentUser(request: AuthenticatedRequest) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }
  return request.user;
}

export async function getShipperDashboard(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const user = currentUser(request);
  const dashboard = await dashboardService.shipperDashboard(user.id);
  const recentShipments = await Promise.all(
    dashboard.recentShipments.map((shipment) => shipmentService.toView(shipment)),
  );
  response.status(200).json({
    success: true,
    data: { metrics: dashboard.metrics, recentShipments },
    message: 'Shipper dashboard retrieved successfully',
  });
}

export async function getTransporterDashboard(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  const user = currentUser(request);
  const dashboard = await dashboardService.transporterDashboard(user.id);
  const recentShipments = await Promise.all(
    dashboard.recentShipments.map((shipment) => shipmentService.toView(shipment)),
  );
  response.status(200).json({
    success: true,
    data: { metrics: dashboard.metrics, recentShipments },
    message: 'Transporter dashboard retrieved successfully',
  });
}

export async function getAdminDashboard(request: AuthenticatedRequest, response: Response): Promise<void> {
  const dashboard = await dashboardService.adminDashboard();
  response.status(200).json({
    success: true,
    data: dashboard,
    message: 'Admin dashboard retrieved successfully',
  });
}
