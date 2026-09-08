import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-950">Page not found</h1>
      <p className="mt-2 text-slate-600">The requested route does not exist.</p>
      <Link className="mt-4 inline-block font-semibold text-blue-700 hover:text-blue-800" to="/">
        Return to dashboard
      </Link>
    </section>
  );
}
