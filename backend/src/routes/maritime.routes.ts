import { Router } from 'express';

import {
  getMarketSeries,
  createMaritimeForecastRun,
  getMaritimeDashboard,
  getMaritimePort,
  getMaritimePortHistory,
  getMaritimePortWeather,
  getMaritimeVessel,
  getMaritimeVesselTrack,
  listMaritimePorts,
  listMaritimeVessels,
  importMarketObservations,
} from '../controllers/maritime.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

export const maritimeRouter = Router();

maritimeRouter.use(requireAuth);

maritimeRouter.get('/dashboard', getMaritimeDashboard);
maritimeRouter.get('/vessels', listMaritimeVessels);
maritimeRouter.get('/vessels/:id', getMaritimeVessel);
maritimeRouter.get('/vessels/:id/track', getMaritimeVesselTrack);
maritimeRouter.get('/ports', listMaritimePorts);
maritimeRouter.get('/ports/:id', getMaritimePort);
maritimeRouter.get('/ports/:id/history', getMaritimePortHistory);
maritimeRouter.get('/ports/:id/weather', getMaritimePortWeather);
maritimeRouter.get('/market/observations', getMarketSeries);
maritimeRouter.post('/forecast-runs', createMaritimeForecastRun);
maritimeRouter.post('/admin/market-observations/import', requireRole('ADMIN'), importMarketObservations);
