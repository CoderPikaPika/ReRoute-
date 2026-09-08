export const USER_ROLES = ['SHIPPER', 'TRANSPORTER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Extract<UserRole, 'SHIPPER' | 'TRANSPORTER'>;
}
