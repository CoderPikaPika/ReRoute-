import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../../services/dashboardApi';
import type { UserRole } from '../../types/auth';

export function useDashboard(role: UserRole) {
  return useQuery({ queryKey: ['dashboard', role], queryFn: () => getDashboard(role) });
}
