import type { Response } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error';
import { forecastService } from '../services/market/forecast.service';
import type { AuthenticatedRequest } from '../types/auth';

const forecastSchema = z.object({
  dayOfYear: z.number().int().min(1).max(366),
  freightRateUsdMt: z.number().positive(),
  bunkerPriceUsdMt: z.number().positive(),
  daysSinceStart: z.number().min(0),
});
const importSchema = z.object({
  records: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    freight_rate_usd_mt: z.number().positive(),
    bunker_price_usd_mt: z.number().positive(),
  })).min(61).max(5000),
});

export async function createForecast(request: AuthenticatedRequest, response: Response): Promise<void> {
  const parsed = forecastSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Enter valid market inputs for the forecast.', parsed.error.flatten());
  }
  const result = await forecastService.predict(parsed.data);
  response.status(200).json({ success: true, data: result, message: 'Freight forecast generated from the ML model.' });
}

export async function getForecastStatus(_request: AuthenticatedRequest, response: Response): Promise<void> {
  const status = await forecastService.status();
  response.status(200).json({ success: true, data: status, message: 'Freight forecasting service is online.' });
}

export async function importHistoricalData(request: AuthenticatedRequest, response: Response): Promise<void> {
  const parsed = importSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Upload at least 61 valid CSV records with date, freight_rate_usd_mt, and bunker_price_usd_mt.', parsed.error.flatten());
  }
  const result = await forecastService.importHistoricalData(parsed.data.records);
  response.status(200).json({ success: true, data: result, message: 'Historical freight data imported and models retrained.' });
}
