import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { CharterRouteMap } from '../components/map/CharterRouteMap';
import { useLatestMaritimeForecastRun, useMaritimeCharterPlans, useMaritimePortWeather, useMaritimePorts, useMaritimeVessels } from '../features/maritime/hooks';
import { getMaritimeCharterOptions, saveMaritimeCharterPlan, type MaritimeCharterOption, type MaritimeCharterOptions, type MaritimePort, type SavedMaritimeCharterPlan, type VesselClass } from '../services/maritimeApi';

const cargoes = ['Thermal coal', 'Coking coal', 'Iron ore', 'Pet Coke', 'Fertilizer'];
const vesselClasses: VesselClass[] = ['HANDYSIZE', 'SUPRAMAX', 'PANAMAX', 'CAPESIZE'];

function vesselLabel(value: VesselClass): string {
  return value === 'HANDYSIZE' ? 'Handysize' : value === 'SUPRAMAX' ? 'Supramax' : value === 'PANAMAX' ? 'Panamax' : 'Capesize';
}

function usd(value: number | undefined): string {
  return value === undefined ? '—' : `USD ${Math.round(value).toLocaleString()}`;
}

function metric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? 'Unavailable' : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data.error?.message ?? fallback : fallback;
}

function portId(ports: MaritimePort[], name: string, fallbackCountry: string): string {
  return ports.find((port) => port.name === name)?.id ?? ports.find((port) => port.country === fallbackCountry)?.id ?? '';
}

export function RoutePlannerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const portsQuery = useMaritimePorts({ limit: 100 });
  const forecastQuery = useLatestMaritimeForecastRun();
  const vesselsQuery = useMaritimeVessels({ limit: 2000 });
  const savedQuery = useMaritimeCharterPlans();
  const [cargoType, setCargoType] = useState('Thermal coal');
  const [quantityMt, setQuantityMt] = useState(70_000);
  const [originPortId, setOriginPortId] = useState('');
  const [destinationPortId, setDestinationPortId] = useState('');
  const [vesselClass, setVesselClass] = useState<VesselClass>('PANAMAX');
  const [targetDate, setTargetDate] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [result, setResult] = useState<MaritimeCharterOptions | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const ports = portsQuery.data ?? [];
  const forecast = forecastQuery.data;
  const origin = ports.find((port) => port.id === originPortId);
  const destination = ports.find((port) => port.id === destinationPortId);
  const originWeather = useMaritimePortWeather(originPortId || undefined);
  const destinationWeather = useMaritimePortWeather(destinationPortId || undefined);
  const selected = result?.options.find((option) => option.vesselId === selectedId) ?? result?.options.find((option) => option.eligible);
  const vessel = (vesselsQuery.data?.items ?? []).find((item) => item.id === selected?.vesselId);
  const request = useMemo(() => ({ cargoType, quantityMt, originPortId, destinationPortId, preferredVesselClass: vesselClass, targetLoadingDate: targetDate }), [cargoType, quantityMt, originPortId, destinationPortId, vesselClass, targetDate]);

  useEffect(() => {
    if (!ports.length) return;
    setOriginPortId((value) => value || portId(ports, 'Hay Point', 'Australia'));
    setDestinationPortId((value) => value || portId(ports, 'Paradip', 'India'));
  }, [ports]);

  useEffect(() => {
    if (!forecast || result) return;
    setCargoType(forecast.cargoType);
    setVesselClass(forecast.vesselClass);
  }, [forecast, result]);

  async function findRoutes() {
    if (!forecast) {
      setError('Run Freight Forecast first. Route planning uses the latest saved model output.');
      return;
    }
    if (!originPortId || !destinationPortId || originPortId === destinationPortId) {
      setError('Select two different ports.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const nextResult = await getMaritimeCharterOptions(request);
      setResult(nextResult);
      setSelectedId(nextResult.options.find((option) => option.eligible)?.vesselId ?? nextResult.options[0]?.vesselId ?? '');
      setNotice(`Route analysis updated at ${new Date(nextResult.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to calculate route options.'));
    } finally {
      setLoading(false);
    }
  }

  async function save(status: 'DRAFT' | 'READY_FOR_CONTRACT') {
    if (!selected?.eligible) {
      setError('Select an eligible vessel before saving this plan.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const plan = await saveMaritimeCharterPlan({ ...request, selectedVesselId: selected.vesselId, status });
      await queryClient.invalidateQueries({ queryKey: ['maritime-charter-plans'] });
      setNotice(status === 'DRAFT' ? `Draft plan ${plan.id.slice(-6)} saved.` : `Plan ${plan.id.slice(-6)} is ready for contract review.`);
      setShowPlans(true);
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to save the route plan.'));
    } finally {
      setSaving(false);
    }
  }

  function loadPlan(plan: SavedMaritimeCharterPlan) {
    setCargoType(plan.cargoType);
    setQuantityMt(plan.quantityMt);
    setOriginPortId(plan.originPortId);
    setDestinationPortId(plan.destinationPortId);
    setVesselClass(plan.preferredVesselClass);
    setTargetDate(plan.targetLoadingDate.slice(0, 10));
    setResult(null);
    setSelectedId(plan.selectedVesselId);
    setShowPlans(false);
    setNotice('Saved inputs loaded. Calculate again to refresh live data.');
  }

  return <section className="space-y-3 text-[#17345d]">
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">ROUTE PLANNER</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Plan the Optimal Route</h1><p className="mt-1 text-base text-[#55708e]">Rank vessels using your forecast, port constraints, current vessel position and marine conditions.</p></div><div className="flex flex-wrap gap-3"><button className="rounded-md border border-[#d5e4ee] bg-white px-4 py-3 text-xs font-bold text-[#24527c] shadow-sm hover:bg-[#f5fbff]" onClick={() => setShowPlans((visible) => !visible)} type="button">▣ Saved Plans {savedQuery.data?.length ? `(${savedQuery.data.length})` : ''}</button><button className="rounded-md bg-[#0873dc] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0560b7]" onClick={() => { setResult(null); setSelectedId(''); setError(''); setNotice('New route plan ready.'); }} type="button">＋ New Plan</button></div></header>

    {notice ? <Banner tone="success">{notice}</Banner> : null}
    {error ? <Banner tone="error">{error}</Banner> : null}
    {!forecastQuery.isLoading && !forecast ? <Banner tone="warning"><span><b>Forecast required.</b> Run Freight Forecast before calculating a route.</span><button className="rounded-md bg-[#0873dc] px-3 py-2 text-xs font-bold text-white" onClick={() => navigate('/freight-forecast')} type="button">Open Freight Forecast →</button></Banner> : null}
    {showPlans ? <SavedPlans plans={savedQuery.data ?? []} ports={ports} loading={savedQuery.isLoading} onLoad={loadPlan} /> : null}

    <div className="grid grid-cols-4 rounded-xl border border-[#dceaf2] bg-white px-3 py-3 shadow-sm">{[['1', 'Cargo & Route', 'Define requirements'], ['2', 'Vessel Options', 'Current rankings'], ['3', 'Route & Costs', 'Analyze estimate'], ['4', 'Confirm Plan', 'Save for review']].map(([step, title, detail], index) => <div className="relative flex items-center gap-3 px-1 sm:px-3" key={step}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${index === 0 ? 'bg-[#104e91] text-white shadow-md' : 'bg-[#dcebf6] text-[#25537f]'}`}>{step}</span><span className="hidden lg:block"><b className="block text-xs text-[#1e426f]">{title}</b><small className="text-[10px] text-[#617b96]">{detail}</small></span>{index < 3 ? <span className="absolute -right-1 text-2xl font-light text-[#d6e2eb]">›</span> : null}</div>)}</div>

    <div className="grid gap-3 xl:grid-cols-[270px_minmax(0,1fr)_310px]">
      <form className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm" onSubmit={(event) => { event.preventDefault(); void findRoutes(); }}><h2 className="text-base font-extrabold text-[#153a70]">Cargo & Route Details</h2><Field label="Cargo Type"><select onChange={(event) => setCargoType(event.target.value)} value={cargoType}>{cargoes.map((cargo) => <option key={cargo}>{cargo}</option>)}</select></Field><Field label="Quantity (MT)"><input max="1000000" min="1000" onChange={(event) => setQuantityMt(Number(event.target.value))} step="1000" type="number" value={quantityMt} /></Field><Field label="Origin Port"><select onChange={(event) => setOriginPortId(event.target.value)} value={originPortId}>{ports.map((port) => <option key={port.id} value={port.id}>{port.name} ({port.country})</option>)}</select></Field><Field label="Destination Port"><select onChange={(event) => setDestinationPortId(event.target.value)} value={destinationPortId}>{ports.map((port) => <option key={port.id} value={port.id}>{port.name} ({port.country})</option>)}</select></Field><Field label="Preferred Vessel Type"><select onChange={(event) => setVesselClass(event.target.value as VesselClass)} value={vesselClass}>{vesselClasses.map((item) => <option key={item} value={item}>{vesselLabel(item)}</option>)}</select></Field><Field label="Target Departure Date"><input min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} type="date" value={targetDate} /></Field><div className="mt-4 rounded-lg bg-[#f4fbff] p-3 text-[11px] leading-5 text-[#4a6783]"><b className="text-[#1672c7]">Calculation checks</b><p className="mt-1">✓ Latest model forecast</p><p>✓ Port draft and LOA limits</p><p>✓ Vessel availability and position</p><p>✓ Latest weather at both ports</p></div><button disabled={loading || !forecast || portsQuery.isLoading} className="mt-4 w-full rounded-md bg-[#0873dc] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0560b7] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{loading ? 'Finding routes…' : 'Find Best Routes →'}</button></form>

      <div className="min-w-0 space-y-3"><MapPanel origin={origin} destination={destination} vessel={vessel} distanceNm={result?.route.distanceNm} transitDays={selected?.estimatedTransitDays ?? result?.route.estimatedTransitDays} /><OptionsTable options={result?.options ?? []} selectedId={selected?.vesselId ?? ''} onSelect={setSelectedId} /></div>

      <aside className="min-w-0 space-y-3"><Recommendation option={selected} /><Insights origin={origin} destination={destination} originWeather={originWeather.data} destinationWeather={destinationWeather.data} /><PortPanel title="Load Port" port={result?.route.origin ?? origin} /><PortPanel title="Discharge Port" port={result?.route.destination ?? destination} /><button disabled={!selected?.eligible || saving} className="w-full rounded-md bg-[#0873dc] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0560b7] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void save('DRAFT')} type="button">{saving ? 'Saving…' : 'Save Route Plan'}</button></aside>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1.25fr_.85fr_310px]"><RouteDetails origin={result?.route.origin ?? origin} destination={result?.route.destination ?? destination} distanceNm={result?.route.distanceNm} transitDays={selected?.estimatedTransitDays ?? result?.route.estimatedTransitDays} date={targetDate} /><CostPanel option={selected} /><article className="rounded-xl border border-emerald-100 bg-[linear-gradient(145deg,#effff7,#fff)] p-4 shadow-sm"><b className="text-[#157351]">Ready to proceed?</b><p className="mt-2 text-xs leading-5 text-[#527468]">The route plan retains the selected vessel and its forecast-supported cost estimate.</p><button disabled={!selected?.eligible || saving} className="mt-4 w-full rounded-md bg-[#129d6d] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0d895c] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void save('READY_FOR_CONTRACT')} type="button">{saving ? 'Saving…' : 'Proceed to Contract →'}</button></article></div>
  </section>;
}

function Banner({ tone, children }: { tone: 'success' | 'warning' | 'error'; children: ReactNode }) { const colour = tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-800'; return <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${colour}`}>{children}</div>; }

function MapPanel({ origin, destination, vessel, distanceNm, transitDays }: { origin?: MaritimePort; destination?: MaritimePort; vessel?: { name: string; position: { longitude: number; latitude: number; isEstimated: boolean } | null }; distanceNm?: number; transitDays?: number }) { const vesselPoint = vessel?.position ? { name: vessel.name, longitude: vessel.position.longitude, latitude: vessel.position.latitude, isEstimated: vessel.position.isEstimated } : undefined; return <article className="relative h-[418px] overflow-hidden rounded-xl border border-[#bddde9] bg-sky-100 shadow-sm"><CharterRouteMap origin={origin} destination={destination} vessel={vesselPoint} /><div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-white/80 bg-white/95 px-3 py-2 shadow"><h2 className="text-sm font-extrabold text-[#153a70]">Optimized Route</h2><p className="mt-0.5 text-[10px] text-[#5d7891]">Map tiles: OpenStreetMap · sea corridor estimate</p></div><div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg bg-white/95 p-3 text-[11px] leading-6 text-[#49637f] shadow"><p>Distance <b className="float-right ml-5 text-[#183d68]">{distanceNm ? `${distanceNm.toLocaleString()} NM` : 'Calculate route'}</b></p><p>Transit <b className="float-right text-[#183d68]">{transitDays ? `${transitDays} days` : '—'}</b></p><p>Vessel marker <b className="float-right text-[#183d68]">{vesselPoint ? (vesselPoint.isEstimated ? 'Estimated' : 'AIS') : 'Not selected'}</b></p></div></article>; }

function OptionsTable({ options, selectedId, onSelect }: { options: MaritimeCharterOption[]; selectedId: string; onSelect: (id: string) => void }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="text-base font-extrabold text-[#153a70]">Route Options</h2><p className="text-[10px] text-[#617b96]">Ranked by capacity, port limits, availability and latest rate.</p></div><span className="text-xs font-bold text-[#0f75cb]">{options.filter((option) => option.eligible).length} eligible</span></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="border-y border-[#e4edf3] text-[#6c8298]"><tr>{['#', 'Vessel', 'Type', 'DWT', 'Days', 'Rate / day', 'Cost', 'Availability', 'Action'].map((label) => <th className="px-1.5 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{options.length ? options.map((option, index) => <tr className={`border-b border-[#edf2f5] ${selectedId === option.vesselId ? 'bg-[#f1f8ff]' : ''}`} key={option.vesselId}><td className="px-1.5 py-2 text-[#53708d]">{index + 1}</td><td className="px-1.5 py-2 font-bold text-[#36557a]">⚓ {option.vesselName}</td><td className="px-1.5 py-2 text-[#48637e]">{vesselLabel(option.vesselClass)}</td><td className="px-1.5 py-2 text-[#48637e]">{option.deadweightTonnes.toLocaleString()}</td><td className="px-1.5 py-2 text-[#48637e]">{option.estimatedTransitDays}</td><td className="px-1.5 py-2 text-[#48637e]">{usd(option.estimatedDailyRateUsd)}</td><td className="px-1.5 py-2 font-semibold text-[#48637e]">{usd(option.estimatedCharterCostUsd)}</td><td className={`px-1.5 py-2 font-semibold ${option.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>● {option.eligible ? (option.availabilityDays ? `${option.availabilityDays} days` : 'Available') : 'Ineligible'}</td><td className="px-1.5 py-2"><button disabled={!option.eligible} className={`rounded border px-2.5 py-1 font-bold disabled:opacity-40 ${selectedId === option.vesselId ? 'border-[#1479d6] bg-[#1479d6] text-white' : 'border-[#8cbde3] text-[#1372c6]'}`} onClick={() => onSelect(option.vesselId)} type="button">{selectedId === option.vesselId ? 'Selected' : 'Select'}</button></td></tr>) : <tr><td className="px-2 py-8 text-center text-sm text-slate-500" colSpan={9}>Run Find Best Routes to retrieve data-backed vessel options.</td></tr>}</tbody></table></div></article>; }

function Recommendation({ option }: { option?: MaritimeCharterOption }) { return <article className="rounded-xl border border-[#ccecdf] bg-[linear-gradient(145deg,#f2fff9,#fff)] p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#15815e]">✦ AI Recommended Option</h2>{option ? <><div className="mt-4 flex gap-3"><span className="grid h-12 w-14 place-items-center rounded-lg bg-[linear-gradient(145deg,#c9e1ed,#386a85)] text-xl">⚓</span><div><h3 className="font-extrabold text-[#183b67]">{option.vesselName}</h3><p className="mt-1 text-xs text-[#59728d]">{vesselLabel(option.vesselClass)} · {option.deadweightTonnes.toLocaleString()} DWT</p><p className={`mt-2 text-xs font-bold ${option.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>● {option.eligible ? 'Eligible for route' : 'Not eligible'}</p></div></div><div className="mt-4 grid grid-cols-2 border-y border-[#e2edf2] py-3 text-xs"><div><small className="block text-[#607a93]">Rate / day</small><b className="text-base text-[#173a69]">{usd(option.estimatedDailyRateUsd)}</b></div><div className="border-l border-[#e2edf2] pl-3"><small className="block text-[#607a93]">Total cost</small><b className="text-base text-[#173a69]">{usd(option.estimatedCharterCostUsd)}</b></div></div><ul className="mt-3 space-y-1.5 text-xs text-[#48627e]">{option.reasons.slice(0, 4).map((reason) => <li key={reason}>✓ {reason}</li>)}</ul></> : <p className="mt-3 rounded-lg border border-dashed border-[#b8dfcf] bg-white/80 p-3 text-xs leading-5 text-[#527468]">Calculate routes to retrieve the best current fit.</p>}</article>; }

function Insights({ origin, destination, originWeather, destinationWeather }: { origin?: MaritimePort; destination?: MaritimePort; originWeather?: { waveHeightMeters: number | null; source: string; qualityStatus: string }; destinationWeather?: { waveHeightMeters: number | null; source: string; qualityStatus: string } }) { const source = originWeather?.source ?? destinationWeather?.source; return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Route Insights</h2><div className="mt-3 grid grid-cols-2 gap-y-4 text-xs"><Insight label={`${origin?.name ?? 'Origin'} wave`} value={metric(originWeather?.waveHeightMeters, ' m')} /><Insight label={`${destination?.name ?? 'Destination'} wave`} value={metric(destinationWeather?.waveHeightMeters, ' m')} /><Insight label="Port congestion" value={destination?.observation?.congestionLevel ?? 'Unavailable'} /><Insight label="Destination wait" value={metric(destination?.observation?.averageWaitDays, ' days')} /></div><p className="mt-4 border-t border-[#e8f0f4] pt-3 text-[10px] text-[#667f96]">{source ? `Marine data source: ${source}.` : 'Weather provider response pending.'}</p></article>; }

function Insight({ label, value }: { label: string; value: string }) { return <div><small className="block text-[10px] text-[#70859a]">{label}</small><b className="mt-0.5 block text-[#365473]">{value}</b></div>; }

function PortPanel({ title, port }: { title: string; port?: { name: string; country: string; maxDraftMeters?: number | null; maxLoaMeters?: number | null; averageWaitDays?: number | null; congestionLevel?: string; handlingCapabilities?: string[] } }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#1479d6]">{title}</p><b className="mt-1 block text-sm text-[#24496f]">{port ? `${port.name} (${port.country})` : 'Select a port'}</b><dl className="mt-2 space-y-1 text-[10px] text-[#58708b]"><div className="flex justify-between gap-3"><dt>Max Draft</dt><dd>{metric(port?.maxDraftMeters, ' m')}</dd></div><div className="flex justify-between gap-3"><dt>Max LOA</dt><dd>{metric(port?.maxLoaMeters, ' m')}</dd></div><div className="flex justify-between gap-3"><dt>Avg. Wait</dt><dd>{metric(port?.averageWaitDays, ' days')}</dd></div><div className="flex justify-between gap-3"><dt>Congestion</dt><dd>{port?.congestionLevel?.toLowerCase() ?? 'Unavailable'}</dd></div></dl></article>; }

function RouteDetails({ origin, destination, distanceNm, transitDays, date }: { origin?: { name: string }; destination?: { name: string }; distanceNm?: number; transitDays?: number; date: string }) { const etd = date ? new Date(`${date}T00:00:00`) : undefined; const eta = etd && transitDays ? new Date(etd.getTime() + transitDays * 86_400_000) : undefined; return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Route Details</h2><div className="mt-4 grid grid-cols-[24px_1fr_1fr] gap-y-4 text-xs"><span className="text-emerald-500">●</span><div><b className="text-[#284b70]">{origin?.name ?? 'Origin'}</b><small className="mt-1 block text-slate-500">Load port</small></div><div><small className="text-slate-500">ETD</small><b className="block text-[#284b70]">{etd?.toLocaleDateString() ?? '—'}</b></div><span className="text-[#1478d1]">⚓</span><div><b className="text-[#284b70]">Sea route</b><small className="mt-1 block text-slate-500">{distanceNm ? `${distanceNm.toLocaleString()} NM` : 'Calculate route'}</small></div><div><small className="text-slate-500">Transit</small><b className="block text-[#284b70]">{transitDays ? `${transitDays} days` : '—'}</b></div><span className="text-rose-500">●</span><div><b className="text-[#284b70]">{destination?.name ?? 'Destination'}</b><small className="mt-1 block text-slate-500">Discharge port</small></div><div><small className="text-slate-500">ETA</small><b className="block text-[#284b70]">{eta?.toLocaleDateString() ?? '—'}</b></div></div></article>; }

function CostPanel({ option }: { option?: MaritimeCharterOption }) { return <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold text-[#153a70]">Route Cost Estimate</h2>{option ? <dl className="mt-3 divide-y divide-[#e7eff4] text-xs">{[['Daily charter rate', `${usd(option.estimatedDailyRateUsd)} / day`], ['Estimated voyage days', `${option.estimatedTransitDays} days`], ['Market rate source', option.marketRateSource], ['Data quality', option.isEstimated ? 'Estimated / seeded' : 'Provider data']].map(([label, value]) => <div className="flex justify-between gap-3 py-2" key={label}><dt className="text-[#5f7891]">{label}</dt><dd className="text-right font-semibold text-[#24486f]">{value}</dd></div>)}<div className="flex justify-between bg-[#edf7ff] px-2 py-3 text-sm"><dt className="font-extrabold text-[#173e6b]">Total Charter Estimate</dt><dd className="font-extrabold text-[#173e6b]">{usd(option.estimatedCharterCostUsd)}</dd></div></dl> : <p className="mt-4 text-sm text-slate-500">Run route analysis to calculate cost.</p>}</article>; }

function SavedPlans({ plans, ports, loading, onLoad }: { plans: SavedMaritimeCharterPlan[]; ports: MaritimePort[]; loading: boolean; onLoad: (plan: SavedMaritimeCharterPlan) => void }) { const label = (id: string) => ports.find((port) => port.id === id)?.name ?? 'Unknown port'; return <article className="rounded-xl border border-[#cfe3f0] bg-[#f5fbff] p-3 shadow-sm"><h2 className="text-sm font-extrabold text-[#173d6d]">Saved Route Plans</h2>{loading ? <p className="mt-3 text-sm text-[#526d86]">Loading saved plans…</p> : plans.length ? <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <div className="rounded-lg border border-[#d9e7f0] bg-white p-3" key={plan.id}><b className="text-xs text-[#24496f]">{label(plan.originPortId)} → {label(plan.destinationPortId)}</b><p className="mt-1 text-[10px] text-[#5c7690]">{plan.cargoType} · {plan.quantityMt.toLocaleString()} MT · {usd(plan.estimatedCharterCostUsd)}</p><button className="mt-2 text-xs font-bold text-[#0d72c9]" onClick={() => onLoad(plan)} type="button">Load inputs →</button></div>)}</div> : <p className="mt-3 text-sm text-[#526d86]">No saved plans yet.</p>}</article>; }

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="mt-3 block text-[11px] font-semibold text-[#58728d]">{label}<span className="mt-1 block [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-[#dbe8f0] [&_input]:bg-[#f8fbfd] [&_input]:px-3 [&_input]:py-2 [&_input]:text-xs [&_input]:font-semibold [&_input]:text-[#1e416a] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-[#dbe8f0] [&_select]:bg-[#f8fbfd] [&_select]:px-3 [&_select]:py-2 [&_select]:text-xs [&_select]:font-semibold [&_select]:text-[#1e416a]">{children}</span></label>; }
