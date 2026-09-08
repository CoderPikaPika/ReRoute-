import type { NextFunction, Response } from 'express';

import { AppError } from '../errors/app-error';
import { userRepository } from '../repositories/user.repository';
import { verifyAccessToken } from '../services/auth/token.service';
import type { AuthenticatedRequest } from '../types/auth';

export async function requireAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'A Bearer access token is required');
    }

    const payload = verifyAccessToken(authorization.slice('Bearer '.length));
    const user = await userRepository.findActiveById(payload.sub);

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Account is not available');
    }

    request.user = {
      id: user.id,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}
