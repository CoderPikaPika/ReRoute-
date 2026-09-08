import type { ErrorRequestHandler, RequestHandler } from 'express';

import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError(404, 'NOT_FOUND', 'The requested API endpoint was not found', {
      method: request.method,
      path: request.originalUrl,
    }),
  );
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  void _next;

  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, 'INTERNAL_ERROR', 'An unexpected server error occurred');

  logger.error(
    {
      err: error,
      requestId: response.locals.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: appError.statusCode,
    },
    'Request failed',
  );

  response.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
    requestId: response.locals.requestId,
    ...(env.NODE_ENV === 'development' && !(error instanceof AppError)
      ? { debug: error instanceof Error ? error.message : 'Unknown error' }
      : {}),
  });
};
