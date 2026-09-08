import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { PublicOnlyRoute } from '../components/layout/PublicOnlyRoute';
import { DashboardPage } from '../pages/DashboardPage';
import { CreateShipmentPage } from '../pages/CreateShipmentPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ShipmentDetailPage } from '../pages/ShipmentDetailPage';
import { ShipmentListPage } from '../pages/ShipmentListPage';
import { CreateVehiclePage } from '../pages/CreateVehiclePage';
import { VehicleListPage } from '../pages/VehicleListPage';
import { MarketIntelligencePage } from '../pages/MarketIntelligencePage';

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          { path: '/shipments', element: <ShipmentListPage /> },
          { path: '/shipments/create', element: <CreateShipmentPage /> },
          { path: '/shipments/:id', element: <ShipmentDetailPage /> },
          { path: '/vehicles', element: <VehicleListPage /> },
          { path: '/vehicles/create', element: <CreateVehiclePage /> },
          { path: '/market-intelligence', element: <MarketIntelligencePage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
