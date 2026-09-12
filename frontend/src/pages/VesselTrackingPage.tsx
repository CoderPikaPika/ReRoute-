import { useMemo, useState } from 'react';

type VesselStatus = 'En Route' | 'At Port' | 'Anchored';

type Vessel = {
  id: string;
  name: string;
  imo: string;
  type: 'Panamax' | 'Capesize' | 'Supramax' | 'Handysize';
  status: VesselStatus;
  eta: string;
  route: string;
  origin: string;
  destination: string;
  position: string;
  speed: string;
  heading: string;
  cargo: string;
  draught: string;
  mapLeft: string;
  mapTop: string;
  accent: string;
};

const vessels: Vessel[] = [
  { id: 'ocean-pride', name: 'MV Ocean Pride', imo: '9723456', type: 'Panamax', status: 'En Route', eta: '12 Oct', route: 'Hay Point → Paradip', origin: '🇦🇺 Hay Point (AUS)', destination: '🇮🇳 Paradip (IND)', position: '14.327° S, 93.842° E', speed: '12.4 knots', heading: '062° (ENE)', cargo: 'Coal (100,000 MT)', draught: '13.2 m', mapLeft: '40%', mapTop: '56%', accent: '#1777ee' },
  { id: 'cape-harmony', name: 'Cape Harmony', imo: '9812345', type: 'Capesize', status: 'At Port', eta: '8 Oct', route: 'Newcastle → Vizag', origin: '🇦🇺 Newcastle (AUS)', destination: '🇮🇳 Visakhapatnam (IND)', position: '19.122° S, 151.507° E', speed: '0.3 knots', heading: '000°', cargo: 'Iron ore (165,000 MT)', draught: '17.1 m', mapLeft: '66%', mapTop: '43%', accent: '#ff9f1c' },
  { id: 'eastern-star', name: 'Eastern Star', imo: '9654321', type: 'Supramax', status: 'En Route', eta: '6 Oct', route: 'Richards Bay → Gangavaram', origin: '🇿🇦 Richards Bay (ZA)', destination: '🇮🇳 Gangavaram (IND)', position: '8.245° S, 69.162° E', speed: '11.8 knots', heading: '039° (NE)', cargo: 'Thermal coal (54,000 MT)', draught: '11.7 m', mapLeft: '31%', mapTop: '63%', accent: '#15a76a' },
  { id: 'sea-voyager', name: 'Sea Voyager', imo: '9745612', type: 'Handysize', status: 'At Port', eta: '14 Oct', route: 'Samarinda → Haldia', origin: '🇮🇩 Samarinda (ID)', destination: '🇮🇳 Haldia (IND)', position: '22.048° N, 88.084° E', speed: '0.1 knots', heading: '180°', cargo: 'Metallurgical coal (32,000 MT)', draught: '9.5 m', mapLeft: '52%', mapTop: '35%', accent: '#ff9f1c' },
  { id: 'northern-light', name: 'Northern Light', imo: '9887654', type: 'Panamax', status: 'En Route', eta: '10 Oct', route: 'Gladstone → Dhamra', origin: '🇦🇺 Gladstone (AUS)', destination: '🇮🇳 Dhamra (IND)', position: '18.635° S, 106.920° E', speed: '13.1 knots', heading: '314° (NW)', cargo: 'Coking coal (76,000 MT)', draught: '12.8 m', mapLeft: '58%', mapTop: '59%', accent: '#12a66a' },
  { id: 'iron-horizon', name: 'Iron Horizon', imo: '9711223', type: 'Capesize', status: 'En Route', eta: '18 Oct', route: 'Tubarao → Paradip', origin: '🇧🇷 Tubarão (BR)', destination: '🇮🇳 Paradip (IND)', position: '17.214° S, 75.500° E', speed: '12.2 knots', heading: '073° (ENE)', cargo: 'Iron ore (171,000 MT)', draught: '17.4 m', mapLeft: '36%', mapTop: '69%', accent: '#1d82eb' },
  { id: 'blue-meridian', name: 'Blue Meridian', imo: '9667788', type: 'Supramax', status: 'Anchored', eta: '11 Oct', route: 'New Orleans → Gopalpur', origin: '🇺🇸 New Orleans (US)', destination: '🇮🇳 Gopalpur (IND)', position: '5.018° N, 80.345° E', speed: '0.0 knots', heading: '---', cargo: 'Pet coke (52,000 MT)', draught: '11.5 m', mapLeft: '43%', mapTop: '45%', accent: '#6d78a2' },
  { id: 'coral-breeze', name: 'Coral Breeze', imo: '9734456', type: 'Handysize', status: 'En Route', eta: '20 Oct', route: 'Santos → Vizag', origin: '🇧🇷 Santos (BR)', destination: '🇮🇳 Visakhapatnam (IND)', position: '12.356° S, 58.164° E', speed: '10.9 knots', heading: '049° (NE)', cargo: 'Fertilizer (34,000 MT)', draught: '9.9 m', mapLeft: '25%', mapTop: '52%', accent: '#18ae73' },
];

function statusClass(status: VesselStatus): string {
  if (status === 'En Route') return 'bg-emerald-50 text-emerald-700';
  if (status === 'At Port') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function statusDot(status: VesselStatus): string {
  if (status === 'En Route') return 'bg-emerald-500';
  if (status === 'At Port') return 'bg-amber-500';
  return 'bg-slate-400';
}

function VesselThumbnail({ accent }: { accent: string }) {
  return <div className="grid h-11 w-12 shrink-0 place-items-center rounded-lg bg-[linear-gradient(145deg,#c5e3f5,#4f90b9_55%,#244c75)] text-xl shadow-inner" style={{ borderBottom: `3px solid ${accent}` }}>⚓</div>;
}

function Donut({ gradient }: { gradient: string }) {
  return <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: gradient }}><div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center shadow-sm"><strong className="text-lg text-[#123968]">246</strong><span className="-mt-1 text-[9px] text-slate-500">Vessels</span></div></div>;
}

export function VesselTrackingPage() {
  const [selectedId, setSelectedId] = useState(vessels[0].id);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [listMode, setListMode] = useState<'all' | 'watchlist' | 'fleet'>('all');
  const [detailTab, setDetailTab] = useState('Overview');
  const [watchlist, setWatchlist] = useState<string[]>(['cape-harmony']);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');
  const [showWeather, setShowWeather] = useState(false);
  const [showPorts, setShowPorts] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapZoom, setMapZoom] = useState(1);

  const selected = vessels.find((vessel) => vessel.id === selectedId) ?? vessels[0];
  function selectVessel(id: string): void {
    setSelectedId(id);
    setDetailsOpen(true);
    setDetailTab('Overview');
  }
  const filteredVessels = useMemo(() => vessels.filter((vessel) => {
    const matchesQuery = `${vessel.name} ${vessel.imo} ${vessel.route}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesType = typeFilter === 'All Types' || vessel.type === typeFilter;
    const matchesStatus = statusFilter === 'All Status' || vessel.status === statusFilter;
    const matchesMode = listMode === 'all' || (listMode === 'watchlist' ? watchlist.includes(vessel.id) : ['ocean-pride', 'northern-light', 'sea-voyager'].includes(vessel.id));
    return matchesQuery && matchesType && matchesStatus && matchesMode;
  }), [listMode, query, statusFilter, typeFilter, watchlist]);

  const map = (
    <article className={`relative overflow-hidden rounded-xl border border-[#bddde9] bg-[#d9edf0] shadow-sm ${mapExpanded ? 'fixed inset-4 z-50 min-h-0' : 'min-h-[575px]'}`}>
      <div className={`absolute inset-0 ${mapView === 'map' ? 'bg-[linear-gradient(145deg,#dceef6_0%,#a9d5e4_45%,#8ac4da_100%)]' : 'bg-[linear-gradient(145deg,#6c9389_0%,#9aa66c_43%,#406c78_100%)]'}`} />
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.38) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.38) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full transition-opacity" style={{ opacity: showRoutes ? 1 : 0 }} viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M150 400 C330 500, 420 420, 580 340 S820 210, 925 170" fill="none" stroke="#eff8ff" strokeDasharray="10 10" strokeWidth="2" opacity=".9" /><path d="M105 205 C270 250, 410 345, 570 340 S740 440, 900 420" fill="none" stroke="#8cf4bb" strokeDasharray="9 10" strokeWidth="2" opacity=".8" /><path d="M580 515 C570 430, 505 365, 432 340" fill="none" stroke="#fff1b3" strokeDasharray="8 9" strokeWidth="2" opacity=".85" /></svg>
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5"><button className={`rounded-md px-3 py-2 text-xs font-semibold shadow ${mapView === 'map' ? 'bg-[#1678df] text-white' : 'bg-white/95 text-[#315275]'}`} onClick={() => setMapView('map')} type="button">◉ Map</button><button className={`rounded-md px-3 py-2 text-xs font-semibold shadow ${mapView === 'satellite' ? 'bg-[#1678df] text-white' : 'bg-white/95 text-[#315275]'}`} onClick={() => setMapView('satellite')} type="button">◌ Satellite</button><button className={`rounded-md px-3 py-2 text-xs font-semibold shadow ${showWeather ? 'bg-[#1678df] text-white' : 'bg-white/95 text-[#315275]'}`} onClick={() => setShowWeather((visible) => !visible)} type="button">↻ Weather</button><button className={`rounded-md px-3 py-2 text-xs font-semibold shadow ${showPorts ? 'bg-[#1678df] text-white' : 'bg-white/95 text-[#315275]'}`} onClick={() => setShowPorts((visible) => !visible)} type="button">⌖ Ports</button><button className={`rounded-md px-3 py-2 text-xs font-semibold shadow ${showRoutes ? 'bg-[#1678df] text-white' : 'bg-white/95 text-[#315275]'}`} onClick={() => setShowRoutes((visible) => !visible)} type="button">⌁ Trade Routes</button></div>
      <div className="absolute right-3 top-3 z-10 rounded-lg bg-white/95 p-3 text-[11px] leading-6 text-[#34506f] shadow"><p className="font-bold text-[#183d68]">Vessel types</p><p>🟢 Cargo vessel</p><p>🔴 Tanker</p><p>🟠 Bulk carrier</p><p>⚓ Port</p><p>🔵 Selected vessel</p></div>
      {showWeather ? <div className="absolute left-4 top-16 z-10 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#476480] shadow">☀ 28°C · winds 12 kt</div> : null}{showPorts ? <div className="absolute bottom-[27%] right-[18%] z-10 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#476480] shadow">⚓ Paradip Port</div> : null}
      {vessels.map((vessel) => <button aria-label={`Select ${vessel.name}`} className={`absolute z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs shadow-lg transition hover:scale-110 ${vessel.id === selected.id ? 'border-white ring-4 ring-blue-400/40' : 'border-white/80'}`} key={vessel.id} onClick={() => selectVessel(vessel.id)} style={{ left: vessel.mapLeft, top: vessel.mapTop, backgroundColor: vessel.accent, transform: `scale(${mapZoom})` }} type="button">➤</button>)}
      <div className="absolute left-1/2 top-1/2 z-0 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/80 bg-white/90 p-5 text-center shadow-lg"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e7f4fc] text-xl text-[#137de1] mx-auto">⌖</span><p className="mt-3 text-sm font-extrabold text-[#173d6d]">AIS map placeholder</p><p className="mt-1 text-xs leading-5 text-[#5b7490]">Connect a map and AIS provider to display verified coastlines and vessel positions.</p></div>
      <div className="absolute left-[38%] top-[47%] z-20 rounded-lg bg-[#123b68] px-3 py-2 text-xs text-white shadow-xl"><strong>{selected.name}</strong><br /><span className="text-sky-200">{selected.status} · ETA {selected.eta}</span></div>
      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/95 px-4 py-3 shadow"><p className="text-xs font-bold text-[#173e69]">Prototype AIS activity · Indian Ocean</p><div className="mt-2 flex gap-4 text-[11px] text-slate-600"><span><b className="text-[#173e69]">246</b> vessels</span><span><b className="text-emerald-600">87</b> en route</span><span><b className="text-amber-500">32</b> at port</span><span><b className="text-sky-600">12</b> anchored</span></div></div>
      <div className="absolute bottom-4 right-3 z-10 flex flex-col overflow-hidden rounded-lg bg-white shadow"><button aria-label="Zoom in" className="px-3 py-2 text-lg text-[#0e5da8]" onClick={() => setMapZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(1))))} type="button">＋</button><button aria-label="Zoom out" className="border-t border-slate-100 px-3 py-2 text-lg text-[#0e5da8]" onClick={() => setMapZoom((value) => Math.max(0.7, Number((value - 0.1).toFixed(1))))} type="button">−</button><button aria-label="Reset map zoom" className="border-t border-slate-100 px-3 py-2 text-sm text-[#0e5da8]" onClick={() => setMapZoom(1)} type="button">◎</button></div>
      <button aria-label="Close expanded map" className={`absolute right-4 bottom-4 z-20 rounded-md bg-white px-3 py-2 text-xs font-bold text-[#174b80] shadow ${mapExpanded ? '' : 'hidden'}`} onClick={() => setMapExpanded(false)} type="button">Close full screen</button>
    </article>
  );

  return <section className="space-y-4 text-[#17345d]">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div><p className="text-[11px] font-bold tracking-[.24em] text-[#5c7694]">VESSEL TRACKING</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Real-Time Vessel Tracking</h1><p className="mt-1 text-base text-[#55708e]">Track vessel positions, movements and voyage details across key trade routes.</p></div>
      <div className="flex flex-wrap gap-3"><div className="rounded-lg border border-[#dfebf3] bg-white px-4 py-2.5 shadow-sm"><p className="flex items-center gap-2 text-sm font-bold text-[#17395e]"><span className="h-3 w-3 rounded-full bg-emerald-500" />Prototype AIS data</p><p className="mt-0.5 text-[11px] text-slate-500">Simulated update: 12 Sep 2026, 14:32 IST</p></div><button className="rounded-lg border border-[#badcf2] bg-[#edf8ff] px-4 py-2 text-sm font-bold text-[#0b6ec4] transition hover:bg-[#dff2ff]" onClick={() => setMapExpanded(true)} type="button">↗ View in Full Screen</button></div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_290px] 2xl:grid-cols-[310px_minmax(520px,1fr)_310px]">
      <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white shadow-sm">
        <div className="grid grid-cols-3 border-b border-[#e5eef4] p-2 text-center text-[11px] font-bold"><button className={`rounded-md py-2 ${listMode === 'all' ? 'bg-[#137de1] text-white shadow-sm' : 'text-[#4b6582]'}`} onClick={() => setListMode('all')} type="button">Vessels (246)</button><button className={`rounded-md py-2 ${listMode === 'watchlist' ? 'bg-[#137de1] text-white shadow-sm' : 'text-[#4b6582]'}`} onClick={() => setListMode('watchlist')} type="button">Watchlist ({watchlist.length})</button><button className={`rounded-md py-2 ${listMode === 'fleet' ? 'bg-[#137de1] text-white shadow-sm' : 'text-[#4b6582]'}`} onClick={() => setListMode('fleet')} type="button">My Fleet (8)</button></div>
        <div className="space-y-2 p-3"><label className="flex items-center gap-2 rounded-md border border-[#dbe8f1] bg-[#f8fbfd] px-2.5 py-2 text-xs text-slate-400">⌕<input className="w-full bg-transparent outline-none placeholder:text-slate-400" onChange={(event) => setQuery(event.target.value)} placeholder="Search vessel by name or IMO..." value={query} /></label><div className="grid grid-cols-2 gap-2"><select aria-label="Filter vessel type" className="rounded-md border border-[#dbe8f1] bg-white px-2 py-2 text-[11px] text-[#45617e]" onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option>All Types</option><option>Panamax</option><option>Capesize</option><option>Supramax</option><option>Handysize</option></select><select aria-label="Filter vessel status" className="rounded-md border border-[#dbe8f1] bg-white px-2 py-2 text-[11px] text-[#45617e]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>All Status</option><option>En Route</option><option>At Port</option><option>Anchored</option></select></div></div>
        <div className="max-h-[465px] divide-y divide-[#e9f0f5] overflow-y-auto">{filteredVessels.length ? filteredVessels.map((vessel) => <button className={`flex w-full gap-3 px-3 py-3 text-left transition ${vessel.id === selected.id ? 'border-l-4 border-[#1689df] bg-[#edf8ff] pl-2' : 'hover:bg-[#f7fbfe]'}`} key={vessel.id} onClick={() => selectVessel(vessel.id)} type="button"><VesselThumbnail accent={vessel.accent} /><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-xs text-[#17375f]">{vessel.name}</strong><span className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold ${vessel.status === 'En Route' ? 'text-emerald-600' : vessel.status === 'At Port' ? 'text-amber-600' : 'text-slate-500'}`}><i className={`h-2 w-2 rounded-full ${statusDot(vessel.status)}`} />{vessel.status}</span></span><span className="mt-0.5 block text-[10px] text-slate-500">IMO {vessel.imo}</span><span className="mt-1 flex justify-between gap-2 text-[10px] text-[#49637f]"><span>{vessel.type}</span><span>ETA {vessel.eta}</span></span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{vessel.route}</span></span></button>) : <p className="p-8 text-center text-sm text-slate-500">No vessels match these filters.</p>}</div>
      </article>

      <div className="relative">{map}<button className="absolute right-3 top-3 z-20 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#166cbf] shadow" onClick={() => setMapExpanded(true)} type="button">⛶</button></div>

      {detailsOpen ? <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white shadow-sm"><div className="relative h-36 overflow-hidden bg-[linear-gradient(150deg,#bedce9,#7798af_47%,#203e64)]"><div className="absolute inset-x-0 bottom-0 h-11 bg-[#285a81]/45" /><span className="absolute left-[42%] top-9 text-6xl drop-shadow-lg">🚢</span><button aria-label="Close vessel panel" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#3c5b7d] transition hover:bg-slate-100" onClick={() => setDetailsOpen(false)} type="button">×</button></div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="text-xl font-extrabold text-[#153a70]">{selected.name}</h2><p className="mt-1 text-[11px] text-slate-500">IMO {selected.imo} &nbsp;|&nbsp; MMSI 563212000</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(selected.status)}`}><i className={`mr-1 inline-block h-2 w-2 rounded-full ${statusDot(selected.status)}`} />{selected.status}</span></div><div className="mt-4 grid grid-cols-4 rounded-lg bg-[#f5faff] p-1 text-[10px] font-bold text-[#5a728e]">{['Overview', 'Voyage', 'Specifications', 'History'].map((tab) => <button className={`rounded-md px-1 py-2 ${detailTab === tab ? 'bg-white text-[#0b72cf] shadow-sm' : ''}`} key={tab} onClick={() => setDetailTab(tab)} type="button">{tab}</button>)}</div>
        {detailTab === 'Overview' ? <dl className="mt-3 divide-y divide-[#e6eff5] text-xs">{[['Vessel Type', selected.type], ['Status', selected.status], ['Current Position', selected.position], ['Speed', selected.speed], ['Heading', selected.heading], ['Origin Port', selected.origin], ['Destination Port', selected.destination], ['ETA', `12 Oct 2026, 06:00 IST`], ['Cargo', selected.cargo], ['Draught (Current)', selected.draught], ['Last Updated', '12 Sep 2026, 14:32 IST']].map(([label, value]) => <div className="grid grid-cols-[1.05fr_.95fr] gap-2 py-2" key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-[#25486e]">{value}</dd></div>)}</dl> : <div className="py-12 text-center text-sm text-slate-500"><p className="text-2xl">⌁</p><p className="mt-2">{detailTab} information for {selected.name}</p><p className="mt-1 text-xs">Prototype data is ready for an AIS provider.</p></div>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button className={`rounded-md border px-2 py-2 text-xs font-bold ${watchlist.includes(selected.id) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-[#cde0ed] bg-[#f6fbff] text-[#176fc0]'}`} onClick={() => setWatchlist((current) => current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id])} type="button">☆ {watchlist.includes(selected.id) ? 'Watching' : 'Add to Watchlist'}</button><button className="rounded-md bg-[#127ce1] px-2 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0868bf]" onClick={() => setDetailTab('Voyage')} type="button">View Full Details →</button></div></div></article> : <article className="flex min-h-[575px] flex-col items-center justify-center rounded-xl border border-dashed border-[#bcd8e8] bg-white p-6 text-center shadow-sm"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#e9f6ff] text-2xl text-[#1c82d6]">⚓</span><h2 className="mt-4 text-lg font-extrabold text-[#173c6b]">Vessel panel closed</h2><p className="mt-2 max-w-48 text-sm leading-6 text-slate-500">Select any vessel from the list or map to reopen its details.</p><button className="mt-5 rounded-md bg-[#147cdf] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => setDetailsOpen(true)} type="button">Open {selected.name}</button></article>}
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="flex min-h-44 items-center gap-4 rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div><h3 className="text-sm font-extrabold text-[#173a68]">Vessels by Type</h3><Donut gradient="conic-gradient(#ff941d 0 42%, #ef4b4e 42% 66%, #1988e9 66% 84%, #19b67b 84% 94%, #b4c2d0 94% 100%)" /></div><div className="space-y-1.5 pt-5 text-[11px] text-[#4e6781]"><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ff941d]" />Bulk Carrier <b className="float-right pl-2">42%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ef4b4e]" />Tanker <b className="float-right pl-2">24%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#1988e9]" />Container <b className="float-right pl-2">18%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#19b67b]" />General Cargo <b className="float-right pl-2">10%</b></p></div></article>
      <article className="flex min-h-44 items-center gap-4 rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div><h3 className="text-sm font-extrabold text-[#173a68]">Vessels by Status</h3><Donut gradient="conic-gradient(#18ae73 0 35%, #ff9f1c 35% 48%, #1f80dc 48% 53%, #cbd8e5 53% 93%, #798ba0 93% 100%)" /></div><div className="space-y-1.5 pt-5 text-[11px] text-[#4e6781]"><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#18ae73]" />En Route <b className="float-right pl-2">35%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ff9f1c]" />At Port <b className="float-right pl-2">13%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#1f80dc]" />Anchored <b className="float-right pl-2">5%</b></p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#cbd8e5]" />Underway <b className="float-right pl-2">40%</b></p></div></article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h3 className="text-sm font-extrabold text-[#173a68]">Top Origins <span className="font-normal text-slate-400">(Last 30 Days)</span></h3><div className="mt-3 divide-y divide-[#edf2f6] text-xs">{[['🇦🇺', 'Australia', '38'], ['🇮🇩', 'Indonesia', '32'], ['🇺🇸', 'US', '28'], ['🇲🇿', 'Mozambique', '18'], ['🇷🇺', 'Russia', '16']].map(([flag, country, count]) => <p className="flex justify-between py-2" key={country}><span>{flag} <b className="ml-2 font-semibold text-[#3b5877]">{country}</b></span><b className="text-[#1875cf]">{count}</b></p>)}</div></article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h3 className="text-sm font-extrabold text-[#173a68]">Top Destinations <span className="font-normal text-slate-400">(India East Coast)</span></h3><div className="mt-3 divide-y divide-[#edf2f6] text-xs">{[['🇮🇳', 'Paradip', '46'], ['🇮🇳', 'Vizag', '38'], ['🇮🇳', 'Gangavaram', '32'], ['🇮🇳', 'Gopalpur', '24'], ['🇮🇳', 'Dhamra', '18']].map(([flag, port, count]) => <p className="flex justify-between py-2" key={port}><span>{flag} <b className="ml-2 font-semibold text-[#3b5877]">{port}</b></span><b className="text-[#1875cf]">{count}</b></p>)}</div></article>
    </div>
  </section>;
}
