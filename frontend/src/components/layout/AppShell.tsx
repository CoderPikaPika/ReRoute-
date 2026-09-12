import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

const navigationItems = [
  { label: 'Home', icon: '⌂', to: '/dashboard' },
  { label: 'Plan Charter', icon: '◎', to: '/plan-charter' },
  { label: 'Vessel Tracking', icon: '♜', to: '/vessel-tracking' },
  { label: 'Freight Forecast', icon: '▥', to: '/freight-forecast' },
  { label: 'Ports', icon: '⚓', to: '/ports' },
  { label: 'Route Planner', icon: '⚓', to: '/route-planner' },
  { label: 'Contracts', icon: '▤', to: '/shipments' },
  { label: 'Market Intelligence', icon: '▧', to: '/market-intelligence' },
  { label: 'Risk & Alerts', icon: '♧', to: '/market-intelligence' },
  { label: 'Reports', icon: '▱', to: '/market-intelligence' },
  { label: 'Settings', icon: '⚙', to: '/market-intelligence' },
];

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f4f9fd] text-slate-900 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="relative overflow-hidden border-b border-[#d9e8f2] bg-[linear-gradient(180deg,#fbfdff_0%,#f5fbff_67%,#d6ecfa_100%)] text-[#1c385d] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <NavLink className="flex items-center gap-2 px-3 text-xl font-extrabold tracking-tight text-[#103b76]" to="/dashboard">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-600">〰</span>
            Sea<span className="text-[#1689df]">Nexus</span>
          </NavLink>
          <p className="mt-1 px-3 text-xs text-slate-500">Plan smarter. Sail further.</p>
          <nav aria-label="Primary navigation" className="mt-8 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) => isActive
                  ? 'flex items-center gap-3 rounded-r-lg border-l-[3px] border-[#1689df] bg-[#e2f2ff] px-3 py-2.5 text-sm font-bold text-[#0875ce]'
                  : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#324b6d] transition hover:bg-white/75 hover:text-[#0875ce]'}
                key={item.to}
                to={item.to}
              >
                <span className="w-4 text-center text-base">{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </nav>
          <div className="relative mt-auto hidden min-h-48 overflow-hidden pt-5 lg:block">
            <div className="absolute inset-x-[-30px] bottom-[-45px] h-52 rounded-[50%_50%_0_0] bg-[radial-gradient(ellipse_at_55%_60%,#b8e1f7_0%,#d9effb_40%,transparent_70%)] opacity-85" />
            <p className="relative mt-20 px-3 text-[11px] leading-5 text-[#65819a]">Cleaner seas<br />Stronger supply chains<br />A smarter India</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-[#dbeaf3] bg-white px-5 py-3 shadow-sm sm:px-6">
          <div className="hidden w-full max-w-[590px] items-center gap-3 rounded-md border border-[#dbe8f1] bg-[#f7fbfe] px-3 py-2 text-sm text-slate-400 sm:flex"><span className="text-lg">⌕</span><span>Search vessels, routes, ports, or cargo...</span><kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></div>
          <div className="sm:hidden"><p className="text-sm font-semibold text-[#0d3b75]">SeaNexus</p><p className="text-sm text-slate-700 lg:hidden">{user?.name}</p></div>
          <div className="flex items-center gap-3"><span className="hidden text-xl text-[#254a73] sm:block">♧</span><span className="hidden h-9 w-px bg-[#e1edf4] sm:block" /><span className="hidden h-9 w-9 place-items-center rounded-full bg-[#143e71] text-xs font-bold text-white sm:grid">{user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'SN'}</span><span className="hidden leading-tight sm:block"><b className="block text-xs text-[#1e3b61]">{user?.name || 'SeaNexus User'}</b><small className="text-[10px] text-slate-500">Logistics Manager</small></span><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800" onClick={() => void handleLogout()} type="button">Log out</button></div>
        </header>
        <main className="w-full px-4 py-6 sm:px-6 xl:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
