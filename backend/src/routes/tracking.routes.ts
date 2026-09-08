import { Router } from 'express';

import { getTracking, simulateTracking } from '../controllers/tracking.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

export const trackingRouter = Router();

trackingRouter.get('/shipments/:id/tracking', requireAuth, getTracking);
trackingRouter.post('/shipments/:id/tracking', requireAuth, requireRole('TRANSPORTER'), simulateTracking);
