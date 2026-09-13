import { useEffect, useMemo, useRef, useState } from 'react';

import { MaritimeVesselMap } from '../components/map/MaritimeVesselMap';
import { useMaritimeVesselTrack, useMaritimeVessels } from '../features/maritime/hooks';
import type { MaritimeVessel, VesselClass, VesselNavigationStatus } from '../services/maritimeApi';

function title(value: string): string {
  return value.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ');
}

function statusStyle(status: VesselNavigationStatus | undefined): string {
  if (status === 'UNDER_WAY') return 'bg-emerald-50 text-emerald-700';
  if (status === 'AT_PORT') return 'bg-amber-50 text-amber-700';
  if (status === 'AT_ANCHOR') return 'bg-slate-100 text-slate-600';
  return 'bg-sky-50 text-sky-700';
}

function statusDot(status: VesselNavigationStatus | undefined): string {
  if (status === 'UNDER_WAY') return 'bg-emerald-500';
  if (status === 'AT_PORT') return 'bg-amber-500';
  if (status === 'AT_ANCHOR') return 'bg-slate-400';
  return 'bg-sky-500';
}

function VesselThumbnail({ status }: { status: VesselNavigationStatus | undefined }) {
  return <div className={`grid h-11 w-12 shrink-0 place-items-center rounded-lg bg-[linear-gradient(145deg,#c5e3f5,#4f90b9_55%,#244c75)] text-xl shadow-inner ${status === 'UNDER_WAY' ? 'border-b-4 border-emerald-500' : 'border-b-4 border-sky-500'}`}>⚓</div>;
}

function distribution(items: MaritimeVessel[], key: (vessel: MaritimeVessel) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function VesselTrackingPage() {
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VesselClass | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<VesselNavigationStatus | 'ALL'>('ALL');
  const [listMode, setListMode] = useState<'all' | 'watchlist'>('all');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading, isError } = useMaritimeVessels({ search: query || undefined, vesselClass: typeFilter === 'ALL' ? undefined : typeFilter });
  const vessels = data?.items ?? [];
  const filtered = useMemo(() => vessels.filter((vessel) => {
    const matchesStatus = statusFilter === 'ALL' || vessel.position?.navigationStatus === statusFilter;
    const matchesWatchlist = listMode === 'all' || watchlist.includes(vessel.id);
    return matchesStatus && matchesWatchlist;
  }), [listMode, statusFilter, vessels, watchlist]);
  const selected = vessels.find((vessel) => vessel.id === selectedId) ?? filtered[0] ?? vessels[0];
  const track = useMaritimeVesselTrack(selected?.id);
  const typeDistribution = distribution(vessels, (vessel) => title(vessel.vesselClass));
  const statusDistribution = distribution(vessels.filter((vessel) => vessel.position), (vessel) => title(vessel.position!.navigationStatus));
  const isLive = vessels.some((vessel) => vessel.position?.source === 'AISSTREAM' && !vessel.position.isEstimated);

  useEffect(() => {
    const syncFullscreen = () => setMapExpanded(document.fullscreenElement === mapPanelRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  if (isLoading) return <section className="grid min-h-96 place-items-center text-[#45617e]">Loading vessel positions…</section>;
  if (isError) return <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">Vessel data could not be loaded. Check that the backend is running and sign in again.</section>;
  if (!selected) return <section className="rounded-xl border border-dashed border-[#bcd8e8] bg-white p-10 text-center text-[#55708e]">No vessel data is available yet. Run the maritime seed script to load clearly labelled prototype data.</section>;

  const position = selected.position;
  const currentPosition = position ? `${Math.abs(position.latitude).toFixed(3)}° ${position.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(position.longitude).toFixed(3)}° ${position.longitude >= 0 ? 'E' : 'W'}` : 'No recent AIS position';
  const freshness = position ? new Date(position.observedAt).toLocaleString() : 'No position received';
  const selectedTrack = position?.navigationStatus === 'UNDER_WAY' ? (track.data?.points ?? []) : [];
  const openMapFullscreen = async () => {
    const panel = mapPanelRef.current;
    if (!panel) return;
    try {
      if (panel.requestFullscreen) await panel.requestFullscreen();
      else setMapExpanded(true);
    } catch {
      setMapExpanded(true);
    }
  };
  const closeMapFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    setMapExpanded(false);
  };

  return <section className="space-y-4 text-[#17345d]">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div><p className="text-[11px] font-bold tracking-[.24em] text-[#5c7694]">VESSEL TRACKING</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Real-Time Vessel Tracking</h1><p className="mt-1 text-base text-[#55708e]">Track vessel positions, movements and voyage details across key trade routes.</p></div>
      <div className="flex flex-wrap gap-3"><div className="rounded-lg border border-[#dfebf3] bg-white px-4 py-2.5 shadow-sm"><p className="flex items-center gap-2 text-sm font-bold text-[#17395e]"><span className={`h-3 w-3 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />{isLive ? 'AIS live feed' : 'Prototype data'}</p><p className="mt-0.5 text-[11px] text-slate-500">{isLive ? 'Positions update automatically every minute' : 'Seeded records are marked as simulation'}</p></div><button className="rounded-lg border border-[#badcf2] bg-[#edf8ff] px-4 py-2 text-sm font-bold text-[#0b6ec4] transition hover:bg-[#dff2ff]" onClick={openMapFullscreen} type="button">↗ View in Full Screen</button></div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_290px] 2xl:grid-cols-[310px_minmax(520px,1fr)_310px]">
      <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white shadow-sm"><div className="grid grid-cols-2 border-b border-[#e5eef4] p-2 text-center text-[11px] font-bold"><button className={`rounded-md py-2 ${listMode === 'all' ? 'bg-[#137de1] text-white shadow-sm' : 'text-[#4b6582]'}`} onClick={() => setListMode('all')} type="button">Vessels ({data?.pagination.total ?? 0})</button><button className={`rounded-md py-2 ${listMode === 'watchlist' ? 'bg-[#137de1] text-white shadow-sm' : 'text-[#4b6582]'}`} onClick={() => setListMode('watchlist')} type="button">Watchlist ({watchlist.length})</button></div><div className="space-y-2 p-3"><label className="flex items-center gap-2 rounded-md border border-[#dbe8f1] bg-[#f8fbfd] px-2.5 py-2 text-xs text-slate-400">⌕<input className="w-full bg-transparent outline-none placeholder:text-slate-400" onChange={(event) => setQuery(event.target.value)} placeholder="Search vessel by name or IMO..." value={query} /></label><div className="grid grid-cols-2 gap-2"><select aria-label="Filter vessel type" className="rounded-md border border-[#dbe8f1] bg-white px-2 py-2 text-[11px] text-[#45617e]" onChange={(event) => setTypeFilter(event.target.value as VesselClass | 'ALL')} value={typeFilter}><option value="ALL">All Types</option><option value="PANAMAX">Panamax</option><option value="CAPESIZE">Capesize</option><option value="SUPRAMAX">Supramax</option><option value="HANDYSIZE">Handysize</option></select><select aria-label="Filter vessel status" className="rounded-md border border-[#dbe8f1] bg-white px-2 py-2 text-[11px] text-[#45617e]" onChange={(event) => setStatusFilter(event.target.value as VesselNavigationStatus | 'ALL')} value={statusFilter}><option value="ALL">All Status</option><option value="UNDER_WAY">En Route</option><option value="AT_PORT">At Port</option><option value="AT_ANCHOR">Anchored</option></select></div></div><div className="max-h-[465px] divide-y divide-[#e9f0f5] overflow-y-auto">{filtered.length ? filtered.map((vessel) => <button className={`flex w-full gap-3 px-3 py-3 text-left transition ${vessel.id === selected.id ? 'border-l-4 border-[#1689df] bg-[#edf8ff] pl-2' : 'hover:bg-[#f7fbfe]'}`} key={vessel.id} onClick={() => { setSelectedId(vessel.id); setDetailsOpen(true); }} type="button"><VesselThumbnail status={vessel.position?.navigationStatus} /><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-xs text-[#17375f]">{vessel.name}</strong><span className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold ${statusStyle(vessel.position?.navigationStatus).split(' ')[1]}`}><i className={`h-2 w-2 rounded-full ${statusDot(vessel.position?.navigationStatus)}`} />{title(vessel.position?.navigationStatus ?? 'UNKNOWN')}</span></span><span className="mt-0.5 block text-[10px] text-slate-500">IMO {vessel.imo ?? 'Unavailable'}</span><span className="mt-1 flex justify-between gap-2 text-[10px] text-[#49637f]"><span>{title(vessel.vesselClass)}</span><span>{vessel.position?.speedKnots?.toFixed(1) ?? '—'} kt</span></span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{vessel.position ? `Updated ${new Date(vessel.position.observedAt).toLocaleTimeString()}` : 'No AIS position'}</span></span></button>) : <p className="p-8 text-center text-sm text-slate-500">No vessels match these filters.</p>}</div></article>

      <div ref={mapPanelRef} className={`relative overflow-hidden border border-[#bddde9] bg-white shadow-sm ${mapExpanded ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none' : 'min-h-[575px] rounded-xl'}`}><MaritimeVesselMap expanded={mapExpanded} selectedTrack={selectedTrack} vessels={vessels} selectedVesselId={selected.id} onSelect={(id) => { setSelectedId(id); setDetailsOpen(true); }} /><div className="absolute left-3 top-3 z-10 rounded-lg bg-white/95 px-3 py-2 shadow"><p className="text-xs font-bold text-[#173e69]">Vessel positions</p><p className="mt-0.5 text-[10px] text-slate-500">{selectedTrack.length >= 2 ? `Selected route: ${selectedTrack.length} tracked points` : isLive ? 'AISStream via backend' : 'Seeded simulation via backend'}</p></div><div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/95 px-4 py-3 shadow"><p className="text-xs font-bold text-[#173e69]">Indian Ocean activity</p><div className="mt-2 flex gap-4 text-[11px] text-slate-600"><span><b className="text-[#173e69]">{vessels.length}</b> tracked</span><span><b className="text-emerald-600">{statusDistribution.find(([name]) => name === 'Under Way')?.[1] ?? 0}</b> en route</span><span><b className="text-amber-500">{statusDistribution.find(([name]) => name === 'At Port')?.[1] ?? 0}</b> at port</span></div></div>{mapExpanded ? <button aria-label="Close expanded map" className="absolute right-4 top-4 z-20 rounded-md bg-white px-3 py-2 text-xs font-bold text-[#174b80] shadow" onClick={closeMapFullscreen} type="button">Close full screen</button> : <button className="absolute right-3 top-3 z-10 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-bold text-[#166cbf] shadow" onClick={openMapFullscreen} type="button">⛶</button>}</div>

      {detailsOpen ? <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white shadow-sm"><div className="relative h-36 overflow-hidden bg-[linear-gradient(150deg,#bedce9,#7798af_47%,#203e64)]"><div className="absolute inset-x-0 bottom-0 h-11 bg-[#285a81]/45" /><span className="absolute left-[42%] top-9 text-6xl drop-shadow-lg">🚢</span><button aria-label="Close vessel panel" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#3c5b7d]" onClick={() => setDetailsOpen(false)} type="button">×</button></div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-extrabold text-[#153a70]">{selected.name}</h2><p className="mt-1 text-[11px] text-slate-500">IMO {selected.imo ?? 'Unavailable'} | MMSI {selected.mmsi ?? 'Unavailable'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle(position?.navigationStatus)}`}><i className={`mr-1 inline-block h-2 w-2 rounded-full ${statusDot(position?.navigationStatus)}`} />{title(position?.navigationStatus ?? 'UNKNOWN')}</span></div><dl className="mt-4 divide-y divide-[#e6eff5] text-xs">{[['Vessel Type', title(selected.vesselClass)], ['DWT', selected.deadweightTonnes ? `${selected.deadweightTonnes.toLocaleString()} MT` : 'Unavailable'], ['Current Position', currentPosition], ['Speed', position?.speedKnots !== null && position?.speedKnots !== undefined ? `${position.speedKnots.toFixed(1)} knots` : 'Unavailable'], ['Heading', position?.headingDegrees !== null && position?.headingDegrees !== undefined ? `${position.headingDegrees.toFixed(0)}°` : 'Unavailable'], ['AIS Source', position?.source ?? 'No AIS data'], ['Last Updated', freshness], ['Track Points', track.data?.points.length ?? 0]].map(([label, value]) => <div className="grid grid-cols-[1.05fr_.95fr] gap-2 py-2" key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-[#25486e]">{value}</dd></div>)}</dl><div className="mt-4 grid grid-cols-2 gap-2"><button className={`rounded-md border px-2 py-2 text-xs font-bold ${watchlist.includes(selected.id) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[#cde0ed] bg-[#f6fbff] text-[#176fc0]'}`} onClick={() => setWatchlist((current) => current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id])} type="button">☆ {watchlist.includes(selected.id) ? 'Watching' : 'Add to Watchlist'}</button><button className="rounded-md bg-[#127ce1] px-2 py-2 text-xs font-bold text-white shadow-sm" onClick={openMapFullscreen} type="button">View on Map →</button></div></div></article> : <article className="flex min-h-[575px] flex-col items-center justify-center rounded-xl border border-dashed border-[#bcd8e8] bg-white p-6 text-center shadow-sm"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#e9f6ff] text-2xl text-[#1c82d6]">⚓</span><h2 className="mt-4 text-lg font-extrabold text-[#173c6b]">Vessel panel closed</h2><button className="mt-5 rounded-md bg-[#147cdf] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => setDetailsOpen(true)} type="button">Open {selected.name}</button></article>}
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard title="Vessels by Type" total={vessels.length} rows={typeDistribution} /><MetricCard title="Vessels by Status" total={vessels.filter((vessel) => vessel.position).length} rows={statusDistribution} /><article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h3 className="text-sm font-extrabold text-[#173a68]">Data Quality</h3><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-slate-500">Position source</dt><dd className="font-bold text-[#1c5d99]">{isLive ? 'AIS live feed' : 'Simulation'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Positions available</dt><dd className="font-bold text-[#1c5d99]">{vessels.filter((vessel) => vessel.position).length}/{vessels.length}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Refresh interval</dt><dd className="font-bold text-[#1c5d99]">60 seconds</dd></div></dl></article><article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h3 className="text-sm font-extrabold text-[#173a68]">Selected Vessel</h3><p className="mt-4 text-lg font-extrabold text-[#184978]">{selected.name}</p><p className="mt-1 text-xs text-slate-500">Latest position is displayed on the interactive map.</p><button className="mt-4 text-xs font-bold text-[#1376cf]" onClick={() => setMapExpanded(true)} type="button">Open map →</button></article></div>
  </section>;
}

function MetricCard({ title, total, rows }: { title: string; total: number; rows: Array<[string, number]> }) {
  const palette = ['bg-[#1678df]', 'bg-[#14a56d]', 'bg-[#ef9d1b]', 'bg-[#7389a4]', 'bg-[#b86ee5]'];
  return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div className="flex items-baseline justify-between"><h3 className="text-sm font-extrabold text-[#173a68]">{title}</h3><b className="text-lg text-[#123968]">{total}</b></div><div className="mt-4 space-y-3">{rows.length ? rows.map(([label, count], index) => <div key={label}><div className="flex justify-between text-xs text-[#49637f]"><span>{label}</span><b>{count}</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#edf3f7]"><div className={`h-full rounded-full ${palette[index % palette.length]}`} style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div></div>) : <p className="text-xs text-slate-500">No AIS positions available.</p>}</div></article>;
}
