import { Router } from 'express';

import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { healthRouter } from './health.routes';
import { marketRouter } from './market.routes';
import { shipmentRouter } from './shipment.routes';
import { trackingRouter } from './tracking.routes';
import { transporterRouter } from './transporter.routes';
import { vehicleRouter } from './vehicle.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/shipments', shipmentRouter);
apiRouter.use('/vehicles', vehicleRouter);
apiRouter.use('/transporter', transporterRouter);
apiRouter.use('/', trackingRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/market', marketRouter);
