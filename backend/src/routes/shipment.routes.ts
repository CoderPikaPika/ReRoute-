import { Router } from 'express';

import {
  assignShipment,
  cancelShipment,
  createShipment,
  getMatches,
  getShipment,
  listShipments,
} from '../controllers/shipment.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { assignShipmentSchema, createShipmentSchema } from '../validators/domain.validator';

export const shipmentRouter = Router();

shipmentRouter.use(requireAuth);
shipmentRouter.get('/', listShipments);
shipmentRouter.post('/', requireRole('SHIPPER'), validateBody(createShipmentSchema), createShipment);
shipmentRouter.get('/:id', getShipment);
shipmentRouter.delete('/:id', requireRole('SHIPPER'), cancelShipment);
shipmentRouter.get('/:id/matches', requireRole('SHIPPER'), getMatches);
shipmentRouter.post('/:id/assign', requireRole('SHIPPER'), validateBody(assignShipmentSchema), assignShipment);
