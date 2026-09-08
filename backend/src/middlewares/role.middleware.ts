import type { NextFunction, Response } from 'express';

import { AppError } from '../errors/app-error';
import type { AuthenticatedRequest, UserRole } from '../types/auth';

export function requireRole(...roles: UserRole[]) {
  return (request: AuthenticatedRequest, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
