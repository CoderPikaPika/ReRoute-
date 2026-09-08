import { Router } from 'express';

import {
  getAdminDashboard,
  getShipperDashboard,
  getTransporterDashboard,
} from '../controllers/dashboard.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

export const dashboardRouter = Router();

dashboardRouter.get('/shipper', requireAuth, requireRole('SHIPPER'), getShipperDashboard);
dashboardRouter.get('/transporter', requireAuth, requireRole('TRANSPORTER'), getTransporterDashboard);
dashboardRouter.get('/admin', requireAuth, requireRole('ADMIN'), getAdminDashboard);
