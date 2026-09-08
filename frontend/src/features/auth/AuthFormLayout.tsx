import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthFormLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  footer: ReactNode;
}

export function AuthFormLayout({ title, subtitle, footer, children }: AuthFormLayoutProps) {
  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-[radial-gradient(circle_at_top_left,_#0e7490,_#0f172a_58%)] p-12 lg:flex lg:flex-col lg:justify-between">
        <Link className="text-lg font-bold tracking-tight text-white" to="/login">
          Re<span className="text-cyan-300">Route</span>
        </Link>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Smart logistics operations
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight text-white">
            Move freight with confidence.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Connect shipments, fleet availability, transport operations, and prototype tracking in
            one structured workspace.
          </p>
        </div>
        <p className="text-sm text-slate-400">Freight intelligence · Tracking is simulation-only</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link className="text-lg font-bold tracking-tight text-slate-950 lg:hidden" to="/login">
            ReRoute
          </Link>
          <h2 className="mt-10 text-3xl font-bold tracking-tight text-slate-950 lg:mt-0">
            {title}
          </h2>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
        </div>
      </section>
    </main>
  );
}
