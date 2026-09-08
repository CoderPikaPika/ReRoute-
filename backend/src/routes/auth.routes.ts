import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { getCurrentUser, login, logout, register } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../validators/auth.validator';

export const authRouter = Router();

const authenticationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

authRouter.post('/register', authenticationRateLimit, validateBody(registerSchema), register);
authRouter.post('/login', authenticationRateLimit, validateBody(loginSchema), login);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, getCurrentUser);
