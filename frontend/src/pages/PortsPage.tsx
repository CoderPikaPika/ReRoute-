import { useMemo, useState, type ReactNode } from 'react';

import { useMaritimePortHistory, useMaritimePorts, useMaritimePortWeather } from '../features/maritime/hooks';
import type { MaritimePort, MaritimePortHistoryPoint, MaritimeWeather } from '../services/maritimeApi';

const tabs = ['Port Overview', 'Berth Details', 'Vessel Compatibility', 'Cargo Handling', 'Port Fees', 'Performance', 'Notices'] as const;
type PortTab = typeof tabs[number];

const portImages = [
  {
    url: '/port-images/cargo-port-1.jpg',
    credit: 'Jacob Meissner / Unsplash',
    source: 'https://unsplash.com/photos/cargo-ship-on-dock-during-daytime-oGafvInnHlY',
  },
  {
    url: '/port-images/cargo-port-2.jpg',
    credit: 'Mika Baumeister / Unsplash',
    source: 'https://unsplash.com/photos/a-large-cargo-ship-in-a-harbor-with-a-city-in-the-background-lBVvPNHjQko',
  },
  {
    url: '/port-images/cargo-port-3.jpg',
    credit: 'PortCalls Asia / Unsplash',
    source: 'https://unsplash.com/photos/tugboat-in-a-busy-harbor-with-cargo-containers-PJk4DHTKhtQ',
  },
];

function portImage(portId: string) {
  const index = [...portId].reduce((total, character) => total + character.charCodeAt(0), 0) % portImages.length;
  return portImages[index];
}

function numeric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? 'n.a.' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

function congestionTone(value: string | undefined): string {
  if (value === 'LOW') return 'text-emerald-600';
  if (value === 'MODERATE') return 'text-amber-600';
  if (value === 'HIGH') return 'text-rose-600';
  return 'text-slate-500';
}

function statusTone(value: string): string {
  return value === 'OPERATIONAL' ? 'bg-emerald-50 text-emerald-700' : value === 'RESTRICTED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
}

export function PortsPage() {
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState<PortTab>('Port Overview');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [compareVisible, setCompareVisible] = useState(false);
  const [comparePortId, setComparePortId] = useState('');
  const portsQuery = useMaritimePorts({ limit: 100 });
  const ports = useMemo(() => (portsQuery.data ?? []).filter((port) => port.country === 'India'), [portsQuery.data]);
  const selected = useMemo(() => ports.find((port) => port.id === selectedId) ?? ports.find((port) => port.name === 'Paradip') ?? ports[0], [ports, selectedId]);
  const historyQuery = useMaritimePortHistory(selected?.id);
  const weatherQuery = useMaritimePortWeather(selected?.id);

  if (portsQuery.isLoading) return <PageMessage title="Loading port intelligence…" detail="Retrieving ports and their latest operational observations." />;
  if (portsQuery.isError || !selected) return <PageMessage title="Port data is unavailable" detail="Start the backend and run the maritime seed script before opening Port Intelligence." />;

  const history = historyQuery.data ?? [];
  const weather = weatherQuery.data;
  const observation = selected.observation;
  const isWatching = watchlist.includes(selected.id);
  const simulated = observation?.isEstimated || selected.source === 'SIMULATION';
  const comparisonPort = ports.find((port) => port.id === comparePortId) ?? ports.find((port) => port.id !== selected.id);
  const updatedAt = observation?.observedAt ?? selected.observedAt;

  return <section className="space-y-3 text-[#17345d]">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div><p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">PORT INTELLIGENCE</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Port Insights for Smarter Decisions</h1><p className="mt-1 text-base text-[#55708e]">Operational status, berth constraints, congestion and marine conditions for India’s East Coast.</p></div>
      <div className="flex flex-wrap gap-3"><span className="hidden rounded-md border border-[#dbe8f0] bg-white px-4 py-3 text-xs font-semibold text-[#46617f] shadow-sm sm:block">{dateTime(updatedAt)} &nbsp; <b className={simulated ? 'text-amber-600' : 'text-emerald-600'}>● {simulated ? 'Prototype data' : 'Data feed'}</b></span><button className="rounded-md bg-[#0873dc] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0560b7]" onClick={() => setCompareVisible((visible) => !visible)} type="button">☆ {compareVisible ? 'Close Compare' : 'Compare Ports'}</button></div>
    </div>

    {compareVisible && comparisonPort ? <ComparePorts primary={selected} secondary={comparisonPort} onChange={(id) => setComparePortId(id)} ports={ports.filter((port) => port.id !== selected.id)} /> : null}

    <div className="flex gap-2 overflow-x-auto rounded-xl border border-[#dceaf2] bg-white p-1.5 shadow-sm">{ports.map((port) => <button className={`flex min-w-37.5 items-center gap-2 rounded-lg px-2 py-2 text-left transition ${port.id === selected.id ? 'border border-[#0a7bdf] bg-[#eef8ff] shadow-sm' : 'hover:bg-[#f6fbff]'}`} key={port.id} onClick={() => { setSelectedId(port.id); setActiveTab('Port Overview'); }} type="button"><PortVisual port={port} size="h-13 w-17" /><span><b className="block text-xs text-[#1f426d]">{port.name}</b><small className="mt-1 block text-[10px] text-[#617a93]">{port.region ?? port.country}</small></span></button>)}</div>

    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3"><article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row"><PortVisual port={selected} size="h-27 w-47" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold text-[#153a70]">{selected.name} Port</h2><p className="mt-1 text-xs text-[#506c88]">⌖ {selected.region ?? selected.country}, {selected.country} &nbsp; | &nbsp; {selected.latitude.toFixed(4)}° N, {selected.longitude.toFixed(4)}° E</p><p className="mt-3 max-w-xl text-xs leading-5 text-[#4d6784]">{selected.handlingCapabilities.length ? `Handling capabilities: ${selected.handlingCapabilities.join(', ')}.` : 'Handling capability feed is not available for this port.'}</p></div><div className="flex gap-2"><button className={`rounded-md border px-3 py-2 text-xs font-bold ${isWatching ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#d6e6f1] bg-[#f6fbff] text-[#1373c7]'}`} onClick={() => setWatchlist((list) => list.includes(selected.id) ? list.filter((id) => id !== selected.id) : [...list, selected.id])} type="button">☆ {isWatching ? 'Watching' : 'Add to Watchlist'}</button><span className={`rounded-md px-3 py-2 text-xs font-bold ${statusTone(selected.operationalStatus)}`}>● {selected.operationalStatus.toLowerCase()}</span></div></div></div></div><div className="mt-3 grid gap-2 sm:grid-cols-5"><Kpi icon="♜" value="n.a." label="Total Capacity" hint="Feed needed" /><Kpi icon="♜" value="n.a." label="Current Throughput" hint="Feed needed" /><Kpi icon="◔" value={numeric(observation?.berthOccupancyPercent, '%')} label="Berth Occupancy" /><Kpi icon="◴" value={numeric(observation?.averageTurnaroundDays, ' days')} label="Avg. Turnaround" /><Kpi icon="♜" value={numeric(selected.constraints.berthCount)} label="Berths" /></div></article><div className="flex overflow-x-auto rounded-xl border border-[#dceaf2] bg-white p-1 shadow-sm">{tabs.map((tab) => <button className={`shrink-0 rounded-md px-3 py-3 text-[11px] font-bold ${activeTab === tab ? 'bg-[#eaf6ff] text-[#0d73cb]' : 'text-[#607991] hover:bg-[#f5faff]'}`} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</div></div>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Port Visual</h2><div className="relative mt-3 h-48 overflow-hidden rounded-lg bg-[#1c405e]"><PortPhoto key={selected.id} port={selected} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(9,31,56,.78))]" /><span className={`absolute right-3 top-3 rounded bg-white/90 px-2 py-1 text-[10px] font-bold ${congestionTone(observation?.congestionLevel)}`}>● {observation?.congestionLevel ?? 'UNKNOWN'} congestion</span><span className="absolute bottom-8 left-3 rounded bg-slate-950/65 px-3 py-2 text-xs text-white">{selected.name} · {numeric(observation?.berthOccupancyPercent, '%')} berth occupancy</span><a className="absolute bottom-2 right-3 text-[9px] text-white/85 underline" href={portImage(selected.id).source} rel="noreferrer" target="_blank">Illustrative photo: {portImage(selected.id).credit}</a></div><p className="mt-2 text-[10px] text-[#6d849b]">Status overlay updates from the selected port’s backend observation. The photograph is illustrative, not a live camera feed.</p></article>
    </div>

    <PortTabContent activeTab={activeTab} history={history} port={selected} weather={weather} />
  </section>;
}

function ComparePorts({ primary, secondary, ports, onChange }: { primary: MaritimePort; secondary: MaritimePort; ports: MaritimePort[]; onChange: (id: string) => void }) {
  return <div className="grid gap-3 rounded-xl border border-[#cfe3f0] bg-[#f5fbff] p-3 md:grid-cols-[1fr_auto_1fr] md:items-end"><div><p className="text-[10px] font-bold tracking-wider text-[#6b849b]">SELECTED PORT</p><b className="mt-1 block text-sm text-[#173d6d]">{primary.name}</b><p className="mt-1 text-xs text-[#4e6985]">{numeric(primary.observation?.berthOccupancyPercent, '%')} berth occupancy · {primary.observation?.congestionLevel ?? 'UNKNOWN'} congestion</p></div><span className="hidden pb-2 text-lg text-[#0e72c8] md:block">vs</span><label className="text-xs font-bold text-[#365778]">COMPARE WITH<select className="mt-1 block w-full rounded-md border border-[#cfe0eb] bg-white px-3 py-2 text-sm font-semibold text-[#254a72]" onChange={(event) => onChange(event.target.value)} value={secondary.id}>{ports.map((port) => <option key={port.id} value={port.id}>{port.name}</option>)}</select></label><div className="rounded-lg border border-[#d8e7ef] bg-white px-3 py-2 text-xs text-[#4f6a84]"><b className="text-[#173d6d]">{secondary.name}</b><p className="mt-1">{numeric(secondary.observation?.averageWaitDays, ' days')} waiting · {numeric(secondary.constraints.maxDraftMeters, ' m')} draft</p></div></div>;
}

function PortTabContent({ activeTab, port, history, weather }: { activeTab: PortTab; port: MaritimePort; history: MaritimePortHistoryPoint[]; weather?: MaritimeWeather }) {
  if (activeTab === 'Berth Details') return <div className="grid gap-3 xl:grid-cols-3"><Panel title="Berth & Channel Details"><List rows={[["Berths", numeric(port.constraints.berthCount)], ["Channel depth", numeric(port.constraints.channelDepthMeters, ' m')], ["Max draft", numeric(port.constraints.maxDraftMeters, ' m')], ["Max LOA", numeric(port.constraints.maxLoaMeters, ' m')], ["Max beam", numeric(port.constraints.maxBeamMeters, ' m')]]} /></Panel><Panel title="Current Berth Use"><List rows={[["Berth occupancy", numeric(port.observation?.berthOccupancyPercent, '%')], ["Vessels waiting", numeric(port.observation?.waitingVessels)], ["Anchored vessels", numeric(port.observation?.anchoredVessels)], ["Average wait", numeric(port.observation?.averageWaitDays, ' days')]]} /></Panel><Panel title="Data Availability"><Placeholder label="Berth-by-berth occupancy requires an approved port operations feed." /></Panel></div>;
  if (activeTab === 'Vessel Compatibility') return <div className="grid gap-3 xl:grid-cols-3"><Panel title="Published Constraints"><List rows={[["Maximum draft", numeric(port.constraints.maxDraftMeters, ' m')], ["Maximum LOA", numeric(port.constraints.maxLoaMeters, ' m')], ["Maximum beam", numeric(port.constraints.maxBeamMeters, ' m')], ["Channel depth", numeric(port.constraints.channelDepthMeters, ' m')]]} /></Panel><Panel title="Compatibility Check"><p className="text-xs leading-5 text-[#4f6a84]">Compare a vessel’s draft, LOA and beam with the published limits before confirming a voyage plan.</p><p className="mt-3 rounded-lg bg-[#edf7ff] px-3 py-2 text-xs font-semibold text-[#1a629f]">Route Planner will use these constraints for recommendations.</p></Panel><Panel title="Live Clearance"><Placeholder label="Tide, pilot and berth-window clearance needs a port-authority integration." /></Panel></div>;
  if (activeTab === 'Cargo Handling') return <div className="grid gap-3 xl:grid-cols-3"><Panel title="Supported Cargo"><div className="flex flex-wrap gap-2">{port.handlingCapabilities.length ? port.handlingCapabilities.map((capability) => <span className="rounded-full bg-[#edf7ff] px-3 py-2 text-xs font-semibold text-[#24639a]" key={capability}>{capability}</span>) : <Placeholder label="No cargo-capability data is available." />}</div></Panel><Panel title="Operational Status"><List rows={[["Port status", port.operationalStatus], ["Congestion", port.observation?.congestionLevel ?? 'UNKNOWN'], ["Average turnaround", numeric(port.observation?.averageTurnaroundDays, ' days')]]} /></Panel><Panel title="Handling Rates"><Placeholder label="Cargo handling rates need an authenticated terminal data source." /></Panel></div>;
  if (activeTab === 'Port Fees') return <div className="grid gap-3 xl:grid-cols-3"><Panel title="Port Fee Data"><Placeholder label="No port-fee feed is connected. Add a licensed tariff source to calculate real port costs." /></Panel><Panel title="Route Planning Impact"><p className="text-xs leading-5 text-[#4f6a84]">Voyage estimates will show port fees when a current tariff record is available for both ports.</p></Panel><Panel title="Fee Refresh"><Placeholder label="Port tariff update schedule is not available." /></Panel></div>;
  if (activeTab === 'Performance') return <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_1fr]"><HistoryChart title="Berth Occupancy History" history={history} metric="berthOccupancyPercent" suffix="%" /><HistoryChart title="Turnaround Time History" history={history} metric="averageTurnaroundDays" suffix=" days" /><Panel title="Observation Quality"><List rows={[["Latest observation", port.observation ? dateTime(port.observation.observedAt) : 'n.a.'], ["Source", port.observation?.source ?? port.source], ["Quality", port.observation?.qualityStatus ?? 'UNKNOWN'], ["Mode", port.observation?.isEstimated ? 'Prototype / estimated' : 'Provider data']]} /></Panel></div>;
  if (activeTab === 'Notices') return <div className="grid gap-3 xl:grid-cols-3"><Panel title="Port Notices"><Placeholder label="A verified port-notice feed is not connected yet." /></Panel><Panel title="Operational Alerts"><p className="text-xs leading-5 text-[#4f6a84]">Current congestion: <b className={congestionTone(port.observation?.congestionLevel)}>{port.observation?.congestionLevel ?? 'UNKNOWN'}</b></p><p className="mt-2 text-xs text-[#4f6a84]">Waiting vessels: <b>{numeric(port.observation?.waitingVessels)}</b></p></Panel><Panel title="Marine Conditions"><WeatherSummary weather={weather} /></Panel></div>;
  return <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1.2fr]"><Panel title="Key Specifications"><List rows={[["Max Draft", numeric(port.constraints.maxDraftMeters, ' m')], ["Max LOA", numeric(port.constraints.maxLoaMeters, ' m')], ["Max Beam", numeric(port.constraints.maxBeamMeters, ' m')], ["Channel Depth", numeric(port.constraints.channelDepthMeters, ' m')], ["Berths", numeric(port.constraints.berthCount)], ["Port Authority", `${port.name} Port Authority`]]} /></Panel><Panel title="Live Port Status" subtitle={port.observation ? `Last updated: ${dateTime(port.observation.observedAt)}` : 'No current observation'}><List rows={[["Congestion level", port.observation?.congestionLevel ?? 'UNKNOWN'], ["Waiting vessels", numeric(port.observation?.waitingVessels)], ["Anchored vessels", numeric(port.observation?.anchoredVessels)], ["Berth occupancy", numeric(port.observation?.berthOccupancyPercent, '%')], ["Average wait", numeric(port.observation?.averageWaitDays, ' days')], ["Wind speed", numeric(port.observation?.windSpeedKnots, ' knots')], ["Visibility", numeric(port.observation?.visibilityKm, ' km')]]} /></Panel><Panel title="Marine Conditions"><WeatherSummary weather={weather} /><div className="mt-4 border-t border-[#e8f0f4] pt-3"><p className="text-xs font-bold text-[#244a75]">Historical Operations</p><p className="mt-2 text-xs text-[#4f6a84]">{history.length ? `${history.length} port observations are available for the selected time range.` : 'No historical port observations are available yet.'}</p></div></Panel></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-base font-extrabold text-[#153a70]">{title}</h2>{subtitle ? <small className="text-[10px] text-[#73899d]">{subtitle}</small> : null}</div><div className="mt-3">{children}</div></article>; }
function List({ rows }: { rows: Array<[string, string]> }) { return <dl className="divide-y divide-[#e8f0f4] text-xs">{rows.map(([label, value]) => <div className="flex justify-between gap-3 py-2" key={label}><dt className="text-[#4e6885]">{label}</dt><dd className="text-right font-semibold text-[#365374]">{value}</dd></div>)}</dl>; }
function Placeholder({ label }: { label: string }) { return <p className="rounded-lg border border-dashed border-[#cbdde9] bg-[#f8fcff] px-3 py-4 text-xs leading-5 text-[#637d94]">{label}</p>; }

function WeatherSummary({ weather }: { weather?: MaritimeWeather }) { if (!weather) return <Placeholder label="Marine weather is unavailable. Connect the weather provider or retry shortly." />; return <List rows={[["Source", weather.source], ["Sea temperature", numeric(weather.seaSurfaceTemperatureCelsius, ' °C')], ["Wave height", numeric(weather.waveHeightMeters, ' m')], ["Wave period", numeric(weather.wavePeriodSeconds, ' s')], ["Ocean current", numeric(weather.oceanCurrentVelocityKnots, ' knots')], ["Observed", dateTime(weather.observedAt)]]} />; }

function HistoryChart({ title, history, metric, suffix }: { title: string; history: MaritimePortHistoryPoint[]; metric: 'berthOccupancyPercent' | 'averageTurnaroundDays'; suffix: string }) {
  const values = history.map((point) => point[metric]).filter((value): value is number => value !== null);
  if (!values.length) return <Panel title={title}><Placeholder label="No historical observations are stored for this port yet." /></Panel>;
  const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(0.01, max - min);
  const path = values.map((value, index) => { const x = 28 + index / Math.max(1, values.length - 1) * 385; const y = 108 - (value - min) / range * 75; return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  return <Panel title={title} subtitle={`${values.length} observations`}><svg aria-label={title} className="h-32 w-full" viewBox="0 0 440 130" preserveAspectRatio="none"><g stroke="#e4edf3">{[20,45,70,95,120].map((y) => <line key={y} x1="25" x2="430" y1={y} y2={y} />)}</g><path d={path} fill="none" stroke="#1479d6" strokeLinecap="round" strokeWidth="3" />{values.map((value, index) => { const x = 28 + index / Math.max(1, values.length - 1) * 385; const y = 108 - (value - min) / range * 75; return <circle cx={x} cy={y} fill="#fff" key={`${value}-${index}`} r="3.5" stroke="#1479d6" strokeWidth="2" />; })}</svg><p className="mt-2 text-[10px] text-[#617b94]">Range: {numeric(min, suffix)} – {numeric(max, suffix)}</p></Panel>;
}

function PageMessage({ title, detail }: { title: string; detail: string }) { return <section className="grid min-h-[380px] place-items-center text-center"><div className="max-w-md rounded-xl border border-[#dceaf2] bg-white p-8 shadow-sm"><span className="text-4xl">⚓</span><h1 className="mt-3 text-xl font-extrabold text-[#153a70]">{title}</h1><p className="mt-2 text-sm leading-6 text-[#5b738d]">{detail}</p></div></section>; }
function PortVisual({ port, size }: { port: MaritimePort; size: string }) {
  const image = portImage(port.id);

  return <span
    aria-label={`Illustrative cargo-port view for ${port.name}`}
    className={`relative block shrink-0 ${size} overflow-hidden rounded bg-[#31556e] bg-cover bg-center shadow-inner`}
    role="img"
    style={{ backgroundImage: `linear-gradient(rgba(9, 31, 56, .12), rgba(9, 31, 56, .12)), url("${image.url}")` }}
  />;
}
function PortPhoto({ port, className }: { port: MaritimePort; className: string }) { const image = portImage(port.id); const [failed, setFailed] = useState(false); if (failed) return <span className={`${className} grid place-items-center bg-[linear-gradient(145deg,#8eb9cd,#214d72)] text-center text-xs font-bold text-white`} role="img" aria-label={`Port visual unavailable for ${port.name}`}>⚓<small className="mt-1 block px-2">{port.name}</small></span>; return <img alt={`Illustrative cargo-port view for ${port.name}`} className={`${className} block`} decoding="async" fetchPriority="high" onError={() => setFailed(true)} src={image.url} />; }
function Kpi({ icon, value, label, hint }: { icon: string; value: string; label: string; hint?: string }) { return <div className="flex items-center gap-3 rounded-lg border border-[#e4edf3] p-3"><span className="text-xl text-[#1479d6]">{icon}</span><span><b className="block text-sm text-[#24496f]">{value}</b><small className="text-[10px] text-[#637c94]">{label}{hint ? ` · ${hint}` : ''}</small></span></div>; }
