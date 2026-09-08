import { Router } from 'express';

import {
  createVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from '../controllers/vehicle.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createVehicleSchema, updateVehicleSchema } from '../validators/domain.validator';

export const vehicleRouter = Router();

vehicleRouter.use(requireAuth, requireRole('TRANSPORTER'));
vehicleRouter.get('/', listVehicles);
vehicleRouter.post('/', validateBody(createVehicleSchema), createVehicle);
vehicleRouter.get('/:id', getVehicle);
vehicleRouter.patch('/:id', validateBody(updateVehicleSchema), updateVehicle);
