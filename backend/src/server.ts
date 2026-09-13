import type { Server } from 'node:http';

import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { aisStreamService } from './services/maritime/ais-stream.service';

let server: Server | undefined;
let shuttingDown = false;

async function startServer(): Promise<void> {
  await connectDatabase();
  aisStreamService.start();

  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'API server listening');
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  aisStreamService.stop();
  await disconnectDatabase();
  logger.info('Graceful shutdown completed');
}

void startServer().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start API server');
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Graceful shutdown failed');
        process.exit(1);
      });
  });
}
