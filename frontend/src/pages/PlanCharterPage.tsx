import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

import { CharterRouteMap } from '../components/map/CharterRouteMap';
import { useLatestMaritimeForecastRun, useMaritimePorts, useMaritimeVessels } from '../features/maritime/hooks';
import {
  getMaritimeCharterOptions,
  saveMaritimeCharterPlan,
  type MaritimeCharterOption,
  type MaritimeCharterOptions,
  type VesselClass,
} from '../services/maritimeApi';

const cargoOptions = ['Thermal coal', 'Coking coal', 'Iron ore', 'Pet Coke', 'Fertilizer'];

function vesselClassLabel(value: VesselClass): string {
  return value === 'HANDYSIZE' ? 'Handysize' : value === 'SUPRAMAX' ? 'Supramax' : value === 'PANAMAX' ? 'Panamax' : value === 'CAPESIZE' ? 'Capesize' : 'Other';
}

function currency(value: number | undefined): string {
  return value === undefined ? '—' : `USD ${Math.round(value).toLocaleString()}`;
}

function requestErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data.error?.message ?? fallback : fallback;
}

function defaultPortId(ports: Array<{ id: string; name: string; country: string }>, country: string, name: string): string {
  return ports.find((port) => port.name === name)?.id ?? ports.find((port) => port.country === country)?.id ?? '';
}

export function PlanCharterPage() {
  const navigate = useNavigate();
  const portsQuery = useMaritimePorts({ limit: 100 });
  const vesselsQuery = useMaritimeVessels({ limit: 2000 });
  const forecastQuery = useLatestMaritimeForecastRun();
  const [cargoType, setCargoType] = useState('Thermal coal');
  const [quantityMt, setQuantityMt] = useState(70_000);
  const [originPortId, setOriginPortId] = useState('');
  const [destinationPortId, setDestinationPortId] = useState('');
  const [preferredVesselClass, setPreferredVesselClass] = useState<VesselClass>('PANAMAX');
  const [targetLoadingDate, setTargetLoadingDate] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [options, setOptions] = useState<MaritimeCharterOptions | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState<'DRAFT' | 'READY_FOR_CONTRACT' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const ports = portsQuery.data ?? [];
  const latestForecast = forecastQuery.data;
  const selected = options?.options.find((option) => option.vesselId === selectedVesselId) ?? options?.options.find((option) => option.eligible);
  const selectedVessel = (vesselsQuery.data?.items ?? []).find((vessel) => vessel.id === selected?.vesselId);

  useEffect(() => {
    if (!ports.length) return;
    setOriginPortId((value) => value || defaultPortId(ports, 'Australia', 'Hay Point'));
    setDestinationPortId((value) => value || defaultPortId(ports, 'India', 'Paradip'));
  }, [ports]);

  useEffect(() => {
    if (!latestForecast) return;
    setCargoType(latestForecast.cargoType);
    setPreferredVesselClass(latestForecast.vesselClass);
  }, [latestForecast]);

  const selectedOrigin = ports.find((port) => port.id === originPortId);
  const selectedDestination = ports.find((port) => port.id === destinationPortId);
  const formInput = useMemo(() => ({ cargoType, quantityMt, originPortId, destinationPortId, preferredVesselClass, targetLoadingDate }), [cargoType, quantityMt, originPortId, destinationPortId, preferredVesselClass, targetLoadingDate]);

  async function findOptions() {
    if (!latestForecast) {
      setError('Run Freight Forecast before creating charter options.');
      return;
    }
    if (!originPortId || !destinationPortId) {
      setError('Select both origin and destination ports.');
      return;
    }
    setLoadingOptions(true);
    setError('');
    setMessage('');
    try {
      const result = await getMaritimeCharterOptions(formInput);
      setOptions(result);
      setSelectedVesselId(result.options.find((option) => option.eligible)?.vesselId ?? '');
      setMessage(`${result.options.filter((option) => option.eligible).length} eligible vessel option(s) ranked using live availability and port constraints.`);
    } catch (requestError) {
      setOptions(null);
      setSelectedVesselId('');
      setError(requestErrorMessage(requestError, 'Unable to generate charter options.'));
    } finally {
      setLoadingOptions(false);
    }
  }

  async function savePlan(status: 'DRAFT' | 'READY_FOR_CONTRACT') {
    if (!selected?.eligible) {
      setError('Select an eligible vessel option before saving the plan.');
      return;
    }
    setSaving(status);
    setError('');
    try {
      const saved = await saveMaritimeCharterPlan({ ...formInput, selectedVesselId: selected.vesselId, status });
      setMessage(status === 'DRAFT' ? `Draft saved at ${new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : 'Plan is saved and ready for contract creation.');
      if (status === 'READY_FOR_CONTRACT') navigate('/contracts');
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Unable to save the charter plan.'));
    } finally {
      setSaving(null);
    }
  }

  return <section className="space-y-3 pb-6 text-[#17345d]">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">CHARTER PLANNING</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Plan Charter</h1><p className="mt-1 text-base text-[#55708e]">Compare currently stored vessel positions, port constraints and the latest saved forecast.</p></div><div className="flex gap-3"><button disabled={!selected || saving !== null} className="rounded-md border border-[#d5e4ee] bg-white px-4 py-3 text-xs font-bold text-[#24527c] shadow-sm hover:bg-[#f5fbff] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void savePlan('DRAFT')} type="button">▣ {saving === 'DRAFT' ? 'Saving…' : 'Save as Draft'}</button><button disabled={!selected || saving !== null} className="rounded-md bg-[#104f97] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0b4381] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void savePlan('READY_FOR_CONTRACT')} type="button">{saving === 'READY_FOR_CONTRACT' ? 'Saving…' : 'Proceed to Contract →'}</button></div></div>
    {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
    {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
    {!forecastQuery.isLoading && !latestForecast ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span><b>Forecast required.</b> Run CatBoost in Freight Forecast before generating charter options.</span><button onClick={() => navigate('/freight-forecast')} className="rounded-md bg-[#0873dc] px-3 py-2 text-xs font-bold text-white" type="button">Open Freight Forecast →</button></div> : null}
    <ProgressSteps />
    <form className="grid gap-3 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm xl:grid-cols-[1fr_.8fr_1.05fr_1.05fr_1fr_.95fr_auto]" onSubmit={(event) => { event.preventDefault(); void findOptions(); }}><CharterField label="Cargo Type"><select onChange={(event) => setCargoType(event.target.value)} value={cargoType}>{cargoOptions.map((cargo) => <option key={cargo}>{cargo}</option>)}</select></CharterField><CharterField label="Quantity (MT)"><input min="1000" max="1000000" onChange={(event) => setQuantityMt(Number(event.target.value))} step="1000" type="number" value={quantityMt} /></CharterField><CharterField label="Origin Port"><select onChange={(event) => setOriginPortId(event.target.value)} value={originPortId}>{ports.map((port) => <option key={port.id} value={port.id}>{port.name} ({port.country})</option>)}</select></CharterField><CharterField label="Destination Port"><select onChange={(event) => setDestinationPortId(event.target.value)} value={destinationPortId}>{ports.map((port) => <option key={port.id} value={port.id}>{port.name} ({port.country})</option>)}</select></CharterField><CharterField label="Preferred Vessel Type"><select onChange={(event) => setPreferredVesselClass(event.target.value as VesselClass)} value={preferredVesselClass}>{(['HANDYSIZE', 'SUPRAMAX', 'PANAMAX', 'CAPESIZE'] as VesselClass[]).map((vesselClass) => <option key={vesselClass} value={vesselClass}>{vesselClassLabel(vesselClass)}</option>)}</select></CharterField><CharterField label="Target Loading Date"><input onChange={(event) => setTargetLoadingDate(event.target.value)} type="date" value={targetLoadingDate} /></CharterField><button disabled={loadingOptions || !latestForecast || portsQuery.isLoading} className="mt-auto rounded-md bg-[#0873dc] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0560b7] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{loadingOptions ? 'Finding…' : 'Find Best Options →'}</button></form>
    {options?.warnings.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-800"><b>Data note:</b> {options.warnings[0]}</div> : null}
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,.85fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3"><RouteMap origin={selectedOrigin} destination={selectedDestination} vessel={selectedVessel} distanceNm={options?.route.distanceNm} transitDays={options?.route.estimatedTransitDays} /><VesselOptionsTable options={options?.options ?? []} selectedId={selectedVesselId} onSelect={setSelectedVesselId} /></div>
      <div className="min-w-0 space-y-3"><RouteDetails options={options} originName={selectedOrigin?.name} destinationName={selectedDestination?.name} targetLoadingDate={targetLoadingDate} /><CostEstimate selected={selected} /></div>
      <aside className="min-w-0 space-y-3"><PortInformation origin={options?.route.origin ?? selectedOrigin} destination={options?.route.destination ?? selectedDestination} /><Timeline targetLoadingDate={targetLoadingDate} transitDays={selected?.estimatedTransitDays ?? options?.route.estimatedTransitDays} /><article className="rounded-xl border border-emerald-100 bg-[linear-gradient(145deg,#effff7,#fff)] p-4 shadow-sm"><b className="text-[#157351]">▣ Saved model basis</b><h2 className="mt-1 text-lg font-extrabold text-[#159464]">{latestForecast ? `${latestForecast.forecast.length} model horizons available` : 'Forecast required'}</h2><p className="mt-1 text-xs text-[#527468]">Charter ranking uses the latest saved forecast; it does not re-run the model.</p></article></aside>
    </div>
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_310px]"><Alternatives options={options?.options ?? []} selected={selected} /><article className="min-w-0 rounded-xl border border-emerald-100 bg-[linear-gradient(145deg,#effff7,#fff)] p-4 shadow-sm"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-600">✓</span><div><b className="text-[#157351]">Ready to Proceed?</b><p className="mt-1 text-xs text-[#527468]">Save the selected eligible option before creating its contract.</p></div></div><button disabled={!selected?.eligible || saving !== null} className="mt-4 w-full rounded-md bg-[#129d6d] py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void savePlan('READY_FOR_CONTRACT')} type="button">Proceed to Contract →</button></article></div>
  </section>;
}

function ProgressSteps() { return <div className="grid grid-cols-4 rounded-xl border border-[#dceaf2] bg-white px-3 py-3 shadow-sm">{[['1', 'Cargo & Route', 'Define your requirements'], ['2', 'Vessel Selection', 'View compatible vessels'], ['3', 'Voyage & Economics', 'Compare data-backed estimates'], ['4', 'Review & Proceed', 'Save plan for contract']].map(([number, label, detail], index) => <div className="relative flex items-center gap-3 px-1 sm:px-3" key={number}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${index === 0 ? 'bg-[#104e91] text-white shadow-md' : 'bg-[#dcebf6] text-[#25537f]'}`}>{number}</span><span className="hidden lg:block"><b className="block text-xs text-[#1e426f]">{label}</b><small className="text-[10px] text-[#617b96]">{detail}</small></span>{index < 3 ? <span className="absolute -right-1 text-2xl font-light text-[#d6e2eb]">›</span> : null}</div>)}</div>; }

function RouteMap({ origin, destination, vessel, distanceNm, transitDays }: { origin: { name: string; country: string; latitude: number; longitude: number } | undefined; destination: { name: string; country: string; latitude: number; longitude: number } | undefined; vessel: { name: string; position: { longitude: number; latitude: number; isEstimated: boolean } | null } | undefined; distanceNm: number | undefined; transitDays: number | undefined }) { const vesselPoint = vessel?.position ? { name: vessel.name, longitude: vessel.position.longitude, latitude: vessel.position.latitude, isEstimated: vessel.position.isEstimated } : undefined; return <article className="relative min-h-[286px] overflow-hidden rounded-xl border border-[#bddde9] bg-sky-100 shadow-sm"><CharterRouteMap origin={origin} destination={destination} vessel={vesselPoint} /><div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/80 bg-white/95 px-3 py-2 shadow"><h2 className="text-sm font-extrabold text-[#153a70]">Route Overview</h2><p className="mt-0.5 text-[10px] text-[#5d7891]">Dotted origin → vessel → destination path</p></div><div className="pointer-events-none absolute right-3 top-12 z-10 rounded-lg bg-white/95 p-3 text-[11px] leading-6 text-[#49637f] shadow"><p>Distance <b className="float-right ml-8 text-[#183d68]">{distanceNm ? `${distanceNm.toLocaleString()} NM` : 'Run options'}</b></p><p>Est. Transit <b className="float-right text-[#183d68]">{transitDays ? `${transitDays} days` : '—'}</b></p><p>Vessel position <b className="float-right text-[#183d68]">{vesselPoint ? (vesselPoint.isEstimated ? 'Estimated' : 'AIS') : 'Unavailable'}</b></p></div></article>; }

function VesselOptionsTable({ options, selectedId, onSelect }: { options: MaritimeCharterOption[]; selectedId: string; onSelect: (id: string) => void }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex justify-between"><div><h2 className="text-base font-extrabold text-[#153a70]">Recommended Vessels</h2><p className="text-[10px] text-[#617b96]">Ranked by capacity, port compatibility, status and market rate.</p></div><span className="text-xs font-bold text-[#0f75cb]">{options.filter((option) => option.eligible).length} eligible</span></div><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="border-y border-[#e4edf3] text-[#6c8298]"><tr>{['#', 'Vessel Name', 'Type', 'DWT', 'Est. Days', 'Rate (USD/day)', 'Availability', 'Action'].map((label) => <th className="px-1.5 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{options.length ? options.map((option, index) => <tr className={`border-b border-[#edf2f5] ${option.vesselId === selectedId ? 'bg-[#f1f8ff]' : ''}`} key={option.vesselId}><td className="px-1.5 py-2 text-[#53708d]">{index + 1}</td><td className="px-1.5 py-2"><span className="flex items-center gap-2 font-bold text-[#36557a]"><span className="grid h-8 w-9 place-items-center rounded bg-[linear-gradient(145deg,#c9e1ed,#386a85)] text-sm">⚓</span>{option.vesselName}</span></td><td className="px-1.5 py-2 text-[#48637e]">{vesselClassLabel(option.vesselClass)}</td><td className="px-1.5 py-2 text-[#48637e]">{option.deadweightTonnes.toLocaleString()}</td><td className="px-1.5 py-2 text-[#48637e]">{option.estimatedTransitDays}</td><td className="px-1.5 py-2 text-[#48637e]">{currency(option.estimatedDailyRateUsd)}</td><td className={`px-1.5 py-2 font-semibold ${option.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>● {option.eligible ? `${option.availabilityDays === 0 ? 'Available' : `${option.availabilityDays} days`}` : 'Ineligible'}</td><td className="px-1.5 py-2"><button disabled={!option.eligible} className={`rounded border px-2.5 py-1 font-bold disabled:cursor-not-allowed disabled:opacity-40 ${option.vesselId === selectedId ? 'border-[#1479d6] bg-[#1479d6] text-white' : 'border-[#8cbde3] text-[#1372c6]'}`} onClick={() => onSelect(option.vesselId)} type="button">{option.vesselId === selectedId ? 'Selected' : 'Select'}</button></td></tr>) : <tr><td className="px-2 py-8 text-center text-sm text-slate-500" colSpan={8}>Run Find Best Options to load compatible vessels.</td></tr>}</tbody></table></div></article>; }

function RouteDetails({ options, originName, destinationName, targetLoadingDate }: { options: MaritimeCharterOptions | null; originName: string | undefined; destinationName: string | undefined; targetLoadingDate: string }) { const etd = targetLoadingDate ? new Date(`${targetLoadingDate}T00:00:00`) : null; const eta = etd && options ? new Date(etd.getTime() + options.route.estimatedTransitDays * 86_400_000) : null; return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Route Details</h2><div className="mt-4 grid grid-cols-[24px_1fr_1fr] gap-y-4 text-xs"><span className="text-emerald-500">●</span><div><b className="text-[#284b70]">{options?.route.origin.name ?? originName ?? 'Origin port'}</b><small className="mt-1 block text-slate-500">Load Port</small></div><div><small className="text-slate-500">ETD</small><b className="block text-[#284b70]">{etd ? etd.toLocaleDateString() : '—'}</b></div><span className="text-[#1478d1]">⚓</span><div><b className="text-[#284b70]">En Route</b><small className="mt-1 block text-slate-500">{options ? `${options.route.distanceNm.toLocaleString()} NM` : 'Run options'}</small></div><div><small className="text-slate-500">Est. Duration</small><b className="block text-[#284b70]">{options ? `${options.route.estimatedTransitDays} days` : '—'}</b></div><span className="text-rose-500">●</span><div><b className="text-[#284b70]">{options?.route.destination.name ?? destinationName ?? 'Destination port'}</b><small className="mt-1 block text-slate-500">Discharge Port</small></div><div><small className="text-slate-500">ETA</small><b className="block text-[#284b70]">{eta ? eta.toLocaleDateString() : '—'}</b></div></div><div className="mt-4 rounded-lg bg-[#f4fbff] p-3 text-[11px] text-[#45627d]"><b className="text-[#163c69]">ⓘ Planning basis</b><p className="mt-2">✓ Draft and LOA limits are checked for both ports</p><p>✓ Vessel position status is factored into availability</p><p>✓ Transit duration includes latest available port wait data</p></div></article>; }

function CostEstimate({ selected }: { selected: MaritimeCharterOption | undefined }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Charter Estimate <span className="text-xs font-normal text-slate-500">(USD)</span></h2>{selected ? <dl className="mt-3 divide-y divide-[#e7eff4] text-xs">{[['Daily Charter Rate', `${currency(selected.estimatedDailyRateUsd)} / day`], ['Est. Voyage Days', `${selected.estimatedTransitDays} days`], ['Estimated Charter Cost', currency(selected.estimatedCharterCostUsd)], ['Rate Source', selected.marketRateSource], ['Data Quality', selected.isEstimated ? 'Estimated / seeded input' : 'Provider input']].map(([label, value]) => <div className="flex justify-between gap-3 py-2" key={label}><dt className="text-[#5f7891]">{label}</dt><dd className="text-right font-semibold text-[#24486f]">{value}</dd></div>)}<div className="flex justify-between bg-[#edf7ff] px-2 py-3 text-sm"><dt className="font-extrabold text-[#173e6b]">Total Charter Estimate</dt><dd className="font-extrabold text-[#173e6b]">{currency(selected.estimatedCharterCostUsd)}</dd></div></dl> : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Select an eligible vessel to show its data-backed charter estimate.</p>}</article>; }

function PortInformation({ origin, destination }: { origin: { name: string; country: string; maxDraftMeters?: number | null; maxLoaMeters?: number | null; averageWaitDays?: number | null; congestionLevel?: string; handlingCapabilities?: string[] } | undefined; destination: { name: string; country: string; maxDraftMeters?: number | null; maxLoaMeters?: number | null; averageWaitDays?: number | null; congestionLevel?: string; handlingCapabilities?: string[] } | undefined }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Cargo & Port Information</h2><PortCard title="Load Port" port={origin} /><PortCard title="Discharge Port" port={destination} /></article>; }

function PortCard({ title, port }: { title: string; port: { name: string; country: string; maxDraftMeters?: number | null; maxLoaMeters?: number | null; averageWaitDays?: number | null; congestionLevel?: string; handlingCapabilities?: string[] } | undefined }) { return <div className="mt-3 rounded-lg bg-[#f8fbfd] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#1479d6]">{title}</p><b className="mt-1 block text-sm text-[#24496f]">{port ? `${port.name} (${port.country})` : 'Select a port'}</b><dl className="mt-2 space-y-1 text-[10px] text-[#58708b]"><div className="flex justify-between"><dt>Max Draft</dt><dd>{port?.maxDraftMeters ? `${port.maxDraftMeters} m` : 'Unavailable'}</dd></div><div className="flex justify-between"><dt>Max LOA</dt><dd>{port?.maxLoaMeters ? `${port.maxLoaMeters} m` : 'Unavailable'}</dd></div><div className="flex justify-between"><dt>Avg. Waiting Time</dt><dd>{port?.averageWaitDays !== null && port?.averageWaitDays !== undefined ? `${port.averageWaitDays} days` : 'Unavailable'}</dd></div><div className="flex justify-between"><dt>Congestion</dt><dd>{port?.congestionLevel?.toLowerCase() ?? 'Unavailable'}</dd></div><div className="flex justify-between"><dt>Handling</dt><dd className="max-w-32 truncate text-right" title={port?.handlingCapabilities?.join(', ')}>{port?.handlingCapabilities?.join(', ') ?? 'Unavailable'}</dd></div></dl></div>; }

function Timeline({ targetLoadingDate, transitDays }: { targetLoadingDate: string; transitDays: number | undefined }) { const start = targetLoadingDate ? new Date(`${targetLoadingDate}T00:00:00`) : null; const arrival = start && transitDays ? new Date(start.getTime() + transitDays * 86_400_000) : null; const complete = arrival ? new Date(arrival.getTime() + 2 * 86_400_000) : null; return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Timeline Overview</h2><div className="mt-5 flex items-start justify-between text-center text-[10px]"><span className="w-20"><i className="mx-auto block h-3 w-3 rounded-full bg-emerald-500" /><b className="mt-2 block text-[#315274]">{start?.toLocaleDateString() ?? '—'}</b><small className="text-slate-500">Load</small></span><span className="mt-1 h-0.5 flex-1 bg-[#5e9fda]" /><span className="w-20"><i className="mx-auto block h-3 w-3 rounded-full bg-[#1479d6]" /><b className="mt-2 block text-[#315274]">{arrival?.toLocaleDateString() ?? '—'}</b><small className="text-slate-500">ETA</small></span><span className="mt-1 h-0.5 flex-1 bg-[#c5d4e3]" /><span className="w-20"><i className="mx-auto block h-3 w-3 rounded-full bg-[#b9c8d7]" /><b className="mt-2 block text-[#315274]">{complete?.toLocaleDateString() ?? '—'}</b><small className="text-slate-500">Complete</small></span></div></article>; }

function Alternatives({ options, selected }: { options: MaritimeCharterOption[]; selected: MaritimeCharterOption | undefined }) { const alternatives = options.filter((option) => option.eligible && option.vesselId !== selected?.vesselId).slice(0, 3); return <article className="min-w-0 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm xl:col-span-2"><div className="flex justify-between gap-3"><div><h2 className="text-base font-extrabold text-[#153a70]">Alternative Options</h2><p className="text-[10px] text-[#617b96]">Other eligible vessels from the same data-backed ranking.</p></div><span className="text-xs font-bold text-[#0f75cb]">{alternatives.length} alternatives</span></div><div className="mt-3 grid gap-3 md:grid-cols-3">{alternatives.length ? alternatives.map((option) => <div className="min-w-0 rounded-lg border border-[#e0ecf3] p-3" key={option.vesselId}><p className="text-[10px] font-bold text-[#176fc0]">{vesselClassLabel(option.vesselClass)} option</p><div className="mt-2 flex gap-2"><span className="grid h-10 w-11 place-items-center rounded bg-[linear-gradient(145deg,#c9e1ed,#386a85)] text-sm">⚓</span><span className="min-w-0 flex-1"><b className="block truncate text-xs text-[#365577]">{option.vesselName}</b><b className="mt-1 block truncate text-base text-[#173c6b]">{currency(option.estimatedDailyRateUsd)} / day</b><small className="text-[10px] text-[#53708d]">{option.estimatedTransitDays} days · score {option.score}</small></span></div></div>) : <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Find charter options to see compatible alternatives.</div>}</div></article>; }

function CharterField({ label, children }: { label: string; children: ReactNode }) { return <label className="text-[11px] font-semibold text-[#58728d]">{label}<span className="mt-1 block [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-[#dbe8f0] [&_input]:bg-[#f8fbfd] [&_input]:px-3 [&_input]:py-2 [&_input]:text-xs [&_input]:font-semibold [&_input]:text-[#1e416a] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-[#dbe8f0] [&_select]:bg-[#f8fbfd] [&_select]:px-3 [&_select]:py-2 [&_select]:text-xs [&_select]:font-semibold [&_select]:text-[#1e416a]">{children}</span></label>; }
