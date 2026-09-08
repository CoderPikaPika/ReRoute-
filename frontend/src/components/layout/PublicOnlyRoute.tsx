import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { LoadingScreen } from '../common/LoadingScreen';

export function PublicOnlyRoute() {
  const { isRestoringSession, user } = useAuth();

  if (isRestoringSession) {
    return <LoadingScreen />;
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
