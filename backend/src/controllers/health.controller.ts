import type { Request, Response } from 'express';

import { aisStreamService } from '../services/maritime/ais-stream.service';

export function getHealth(_request: Request, response: Response): void {
  response.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: {
        ais: aisStreamService.getStatus(),
        marineWeather: { provider: 'OPEN_METEO', status: 'ON_DEMAND_CACHE' },
      },
    },
    message: 'Freight platform API is healthy',
  });
}
