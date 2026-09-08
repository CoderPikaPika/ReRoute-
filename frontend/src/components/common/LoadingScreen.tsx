export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white">
      <div>
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
        <p className="mt-4 text-sm text-slate-300">Loading your freight workspace…</p>
      </div>
    </div>
  );
}
