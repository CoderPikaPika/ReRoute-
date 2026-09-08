import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import type { AccessTokenPayload } from '../../types/auth';

export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      (payload.role !== 'SHIPPER' && payload.role !== 'TRANSPORTER' && payload.role !== 'ADMIN')
    ) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid access token');
    }

    return {
      sub: payload.sub,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token');
  }
}
