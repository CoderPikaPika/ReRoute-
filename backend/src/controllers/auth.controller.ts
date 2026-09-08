import type { Request, Response } from 'express';

import { AppError } from '../errors/app-error';
import { authService } from '../services/auth/auth.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { LoginInput, RegisterInput } from '../services/auth/auth.service';

export async function register(request: Request, response: Response): Promise<void> {
  const result = await authService.register(request.body as RegisterInput);

  response.status(201).json({
    success: true,
    data: result,
    message: 'Account created successfully',
  });
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await authService.login(request.body as LoginInput);

  response.status(200).json({
    success: true,
    data: result,
    message: 'Logged in successfully',
  });
}

export async function getCurrentUser(
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }

  response.status(200).json({
    success: true,
    data: await authService.getProfile(request.user.id),
    message: 'Current user retrieved successfully',
  });
}

export function logout(_request: AuthenticatedRequest, response: Response): void {
  response.status(200).json({
    success: true,
    data: null,
    message: 'Logged out successfully',
  });
}
