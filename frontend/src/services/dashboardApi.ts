import { apiClient } from './apiClient';
import type { ApiSuccess } from '../types/api';
import type { UserRole } from '../types/auth';

export interface DashboardData {
  metrics: Record<string, number>;
  statusBreakdown?: { label: string; value: number }[];
}

export async function getDashboard(role: UserRole): Promise<DashboardData> {
  const path = role === 'SHIPPER' ? '/dashboard/shipper' : role === 'TRANSPORTER' ? '/dashboard/transporter' : '/dashboard/admin';
  const response = await apiClient.get<ApiSuccess<DashboardData>>(path);
  return response.data.data;
}
