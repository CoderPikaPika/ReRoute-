import type { ReactNode } from 'react';

interface FeaturePlaceholderProps {
  title: string;
  children: ReactNode;
}

export function FeaturePlaceholder({ title, children }: FeaturePlaceholderProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold tracking-wide text-blue-700">Phase 1 foundation</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">{title}</h1>
      <div className="mt-3 max-w-2xl text-slate-600">{children}</div>
    </section>
  );
}
