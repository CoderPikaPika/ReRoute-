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
        <Link className="flex items-center gap-2 text-lg font-bold tracking-tight text-white" to="/login">
          <img alt="SeaNexus" className="h-10 w-10 rounded-full object-contain mix-blend-screen" src="/seanexus-logo.jpeg" />
          <span>Sea<span className="text-cyan-300">Nexus</span></span>
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

      <section className="relative isolate flex items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 sm:px-8">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          loop
          muted
          playsInline
        >
          <source src="/login-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(244,251,255,.68),rgba(225,243,255,.52))]" />
        <div className="w-full max-w-md">
          <Link className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950 lg:hidden" to="/login">
            <img alt="SeaNexus" className="h-9 w-9 rounded-full object-contain mix-blend-multiply" src="/seanexus-logo.jpeg" />
            <span>SeaNexus</span>
          </Link>
          <h2 className="mt-10 text-3xl font-bold tracking-tight text-slate-950 lg:mt-0">
            {title}
          </h2>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <div
            className="mt-8 rounded-2xl border border-white/90 p-6 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
          >
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
        </div>
      </section>
    </main>
  );
}
