import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestContext } from './middlewares/request-context.middleware';
import { apiRouter } from './routes';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(requestContext);
app.use(
  pinoHttp({
    logger,
    customProps: (_request, response) => ({
      requestId: response.locals.requestId,
    }),
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === env.FRONTEND_URL) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS policy'));
    },
    credentials: false,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
