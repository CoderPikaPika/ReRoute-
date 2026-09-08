import { Link } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';
import { useDashboard } from '../features/dashboard/hooks';

const roleSummary = {
  SHIPPER: {
    title: 'Manage your freight from request to delivery',
    description:
      'Create shipments, compare smart vehicle recommendations, and follow their progress.',
    primaryAction: { label: 'Create shipment', to: '/shipments/create' },
  },
  TRANSPORTER: {
    title: 'Keep your fleet and freight moving',
    description: 'Manage vehicles, review assigned freight, and record each delivery milestone.',
    primaryAction: { label: 'Manage vehicles', to: '/vehicles' },
  },
  ADMIN: {
    title: 'Monitor your logistics network',
    description:
      'Review users, vehicles, shipments, and operational analytics from a single workspace.',
    primaryAction: { label: 'Open admin overview', to: '/admin' },
  },
};

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const summary = roleSummary[user.role];
  const { data, isLoading } = useDashboard(user.role);

  return (
    <section>
    <div className="overflow-hidden rounded-2xl bg-slate-950 p-7 text-white shadow-sm sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
        {user.role} workspace
      </p>
      <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
        {summary.title}
      </h1>
      <p className="mt-4 max-w-xl text-slate-300">{summary.description}</p>
      <Link
        className="mt-7 inline-flex rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
        to={summary.primaryAction.to}
      >
        {summary.primaryAction.label}
      </Link>
    </div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {isLoading ? <p>Loading live dashboard…</p> : Object.entries(data?.metrics ?? {}).map(([label, value]) => <article className="rounded-xl border border-slate-200 bg-white p-5" key={label}><p className="text-sm capitalize text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}
    </div>
    {data?.statusBreakdown ? <article className="mt-7 rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Shipment status distribution</h2><p className="mt-1 text-sm text-slate-500">Live operational data from MongoDB</p><div className="mt-6 space-y-4">{data.statusBreakdown.map(item => <div key={item.label}><div className="mb-1 flex justify-between text-sm font-semibold"><span>{item.label.replace('_',' ')}</span><span>{item.value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{width: Math.max(8, item.value / Math.max(...(data.statusBreakdown ?? []).map(x => x.value), 1) * 100) + '%'}} /></div></div>)}</div></article> : null}
    </section>
  );
}
