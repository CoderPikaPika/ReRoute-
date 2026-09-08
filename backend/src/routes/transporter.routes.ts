import { Router } from 'express';

import {
  acceptAssignment,
  listTransporterShipments,
  rejectAssignment,
  updateTransporterShipmentStatus,
} from '../controllers/transporter.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { updateShipmentStatusSchema } from '../validators/domain.validator';

export const transporterRouter = Router();

transporterRouter.use(requireAuth, requireRole('TRANSPORTER'));
transporterRouter.get('/shipments', listTransporterShipments);
transporterRouter.post('/shipments/:id/accept', acceptAssignment);
transporterRouter.post('/shipments/:id/reject', rejectAssignment);
transporterRouter.patch(
  '/shipments/:id/status',
  validateBody(updateShipmentStatusSchema),
  updateTransporterShipmentStatus,
);
