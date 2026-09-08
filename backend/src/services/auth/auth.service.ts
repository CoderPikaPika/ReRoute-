import { AppError } from '../../errors/app-error';
import type { UserDocument } from '../../models/user.model';
import { userRepository } from '../../repositories/user.repository';
import type { UserRole } from '../../types/auth';
import { hashPassword, verifyPassword } from './password.service';
import { createAccessToken } from './token.service';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Extract<UserRole, 'SHIPPER' | 'TRANSPORTER'>;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  public async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await userRepository.findByEmailWithPassword(input.email);

    if (existingUser) {
      throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
    }

    const user = await userRepository.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      phone: input.phone,
      role: input.role,
    });

    return this.createAuthResult(user);
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Email or password is incorrect');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled');
    }

    return this.createAuthResult(user);
  }

  public async getProfile(userId: string): Promise<PublicUser> {
    const user = await userRepository.findActiveById(userId);

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Account is not available');
    }

    return toPublicUser(user);
  }

  private createAuthResult(user: UserDocument): AuthResult {
    return {
      accessToken: createAccessToken({
        sub: user.id,
        role: user.role,
      }),
      user: toPublicUser(user),
    };
  }
}

export const authService = new AuthService();
