import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';
import type { AuthResult, LoginInput, PublicUser, RegisterInput } from '../types/auth';

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const response = await apiClient.post<ApiSuccess<AuthResult>>('/auth/register', input);
    return response.data.data;
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const response = await apiClient.post<ApiSuccess<AuthResult>>('/auth/login', input);
    return response.data.data;
  },

  async me(): Promise<PublicUser> {
    const response = await apiClient.get<ApiSuccess<PublicUser>>('/auth/me');
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
