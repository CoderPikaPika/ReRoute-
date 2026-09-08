import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

const navigationByRole = {
  SHIPPER: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Market intelligence', to: '/market-intelligence' },
    { label: 'Shipments', to: '/shipments' },
    { label: 'Create shipment', to: '/shipments/create' },
  ],
  TRANSPORTER: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Market intelligence', to: '/market-intelligence' },
    { label: 'Shipments', to: '/transporter/shipments' },
    { label: 'Vehicles', to: '/vehicles' },
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/admin' },
    { label: 'Market intelligence', to: '/market-intelligence' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Vehicles', to: '/admin/vehicles' },
    { label: 'Shipments', to: '/admin/shipments' },
  ],
};

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const navigationItems = user ? navigationByRole[user.role] : [];

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950 text-slate-100 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <NavLink className="px-3 text-lg font-bold tracking-tight text-white" to="/dashboard">
            Re<span className="text-cyan-300">Route</span>
          </NavLink>
          <p className="mt-1 px-3 text-xs text-slate-400">Freight intelligence workspace</p>
          <nav
            aria-label="Primary navigation"
            className="mt-8 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
          >
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950'
                    : 'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white'
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 hidden border-t border-slate-800 pt-5 lg:block">
            <p className="truncate px-3 text-sm font-semibold text-white">{user?.name}</p>
            <p className="mt-1 px-3 text-xs tracking-wide text-cyan-300">{user?.role}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">ReRoute · freight intelligence</p>
            <p className="text-sm text-slate-700 lg:hidden">{user?.name}</p>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => void handleLogout()}
            type="button"
          >
            Log out
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
