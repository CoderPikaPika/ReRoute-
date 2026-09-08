import type { Request } from 'express';

export const USER_ROLES = ['SHIPPER', 'TRANSPORTER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}
