import { Router } from 'express';

import { createForecast, getForecastStatus, importHistoricalData } from '../controllers/market.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

export const marketRouter = Router();

marketRouter.get('/status', requireAuth, getForecastStatus);
marketRouter.post('/data/import', requireAuth, requireRole('ADMIN'), importHistoricalData);
marketRouter.post('/forecast', requireAuth, createForecast);
