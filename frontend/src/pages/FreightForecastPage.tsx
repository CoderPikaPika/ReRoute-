import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';

import { useMaritimeMarketObservations } from '../features/maritime/hooks';
import { createMaritimeForecastRun, type MaritimeForecastRun, type VesselClass } from '../services/maritimeApi';

const comparisonRows = [
  ['Sep 2025', '22,450', '18,200', '32,100', '14,800'],
  ['Oct 2025', '21,900', '17,600', '31,000', '14,200'],
  ['Nov 2025', '21,300', '16,900', '29,800', '13,500'],
  ['Dec 2025', '20,800', '16,100', '28,400', '13,000'],
  ['Jan 2026', '20,200', '15,700', '27,900', '12,600'],
  ['Feb 2026', '19,800', '15,200', '27,100', '12,300'],
];

const insights = [
  ['↗', 'Rates may decrease by 7–12% in the next 3 months.', 'bg-emerald-50 text-emerald-600'],
  ['◫', 'Increased coal supply from Australia is easing rate pressure.', 'bg-sky-50 text-sky-600'],
  ['◴', 'Paradip port congestion may cause short-term rate spikes.', 'bg-amber-50 text-amber-600'],
  ['☁', 'Monsoon season (Jun–Aug) may add volatility.', 'bg-violet-50 text-violet-600'],
];

const drivers = [
  ['♜', 'Australian Coal Exports', 'High', 'Supply increasing'],
  ['♨', 'Indian Port Capacity', 'Moderate', 'Expansion in progress'],
  ['▥', 'Global Seaborne Trade', 'High', 'Steady growth'],
  ['▣', 'New Vessel Deliveries', 'Moderate', 'Adding capacity'],
  ['♧', 'Seasonal Factors', 'High', 'Monsoon, winter demand'],
  ['◉', 'Geopolitical Factors', 'Moderate', 'Watch for disruptions'],
];

const heatmap = [
  ['Paradip', '21.5K', '20.8K', '20.2K', '19.6K', '19.1K', '18.8K'],
  ['Vizag', '22.1K', '21.4K', '20.7K', '20.1K', '19.5K', '19.0K'],
  ['Gangavaram', '23.0K', '22.1K', '21.6K', '20.9K', '19.9K', '19.1K'],
  ['Gopalpur', '21.8K', '21.0K', '20.4K', '19.8K', '19.3K', '18.9K'],
  ['Dhamra', '22.4K', '21.8K', '21.1K', '20.5K', '19.9K', '19.4K'],
  ['Haldia', '22.5K', '22.8K', '22.1K', '21.3K', '20.5K', '20.1K'],
];

function currency(value: number | undefined): string {
  return value === undefined ? 'Run model' : `$ ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} / MT`;
}

function toVesselClass(value: string): VesselClass {
  return value.toUpperCase() as VesselClass;
}

function toMarketObservationCargo(value: string): string {
  if (value === 'Coal' || value === 'Pet Coke' || value === 'Fertilizer' || value === 'Coking Coal') return 'Thermal coal';
  return value;
}

function chartPath(points: Array<{ day: number; value: number }>): string {
  if (!points.length) return '';
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  return points.map((point, index) => {
    const x = 70 + (index / Math.max(1, points.length - 1)) * 770;
    const y = 190 - ((point.value - min) / range) * 115;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

export function FreightForecastPage() {
  const [vesselType, setVesselType] = useState('Panamax');
  const [cargo, setCargo] = useState('Coal');
  const [route, setRoute] = useState('Australia → India (East Coast)');
  const [horizon, setHorizon] = useState(30);
  const [forecastRun, setForecastRun] = useState<MaritimeForecastRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const vesselClass = toVesselClass(vesselType);
  const marketObservationCargo = toMarketObservationCargo(cargo);
  const historicalStart = useMemo(() => new Date(Date.now() - 365 * 86400000), []);
  const marketSeries = useMaritimeMarketObservations({ cargoType: marketObservationCargo, vesselClass, rateType: 'TIME_CHARTER', unit: 'USD_PER_DAY', from: historicalStart });

  const selectedForecast = forecastRun?.forecast.find((forecast) => forecast.forecast_days === horizon) ?? forecastRun?.forecast.at(-1);
  const forecastRate = selectedForecast?.predicted_freight_rate_usd_mt;
  const currentRate = forecastRun?.currentRateUsdMt;
  const modelSeries = useMemo(() => forecastRun ? [{ day: 0, value: forecastRun.currentRateUsdMt }, ...forecastRun.forecast.map((forecast) => ({ day: forecast.forecast_days, value: forecast.predicted_freight_rate_usd_mt }))] : [], [forecastRun]);

  async function applyForecast(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await createMaritimeForecastRun({ cargoType: cargo, vesselClass });
      setForecastRun(result);
    } catch (requestError: unknown) {
      const message = isAxiosError<{ error?: { message?: string } }>(requestError) ? requestError.response?.data.error?.message : undefined;
      setError(message ?? 'The CatBoost forecast model is unavailable. Restart the Python ML service on port 8000, then apply again.');
    } finally {
      setLoading(false);
    }
  }

  function exportReport(): void {
    const rows = [['SeaNexus freight forecast report'], ['Vessel', vesselType], ['Cargo', cargo], ['Route', route], ['Horizon', `${horizon} days`], ['Model', forecastRun?.source.model ?? 'Not run'], [], ['Model horizon', 'Predicted USD/MT', 'Direction'], ...(forecastRun?.forecast ?? []).map((item) => [String(item.forecast_days), String(item.predicted_freight_rate_usd_mt), item.direction])];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'seanexus-freight-forecast.csv';
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return <section className="space-y-3 text-[#17345d]">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div><p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">FREIGHT FORECAST</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Freight Rate Forecast</h1><p className="mt-1 text-base text-[#55708e]">Predict future freight rates and identify the best time to enter the market.</p></div>
      <div className="flex flex-wrap gap-2"><select aria-label="Reporting period" className="rounded-md border border-[#d6e5ef] bg-white px-3 py-2.5 text-xs font-semibold text-[#365474] shadow-sm"><option>Sep 2023 – Sep 2026</option><option>Last 12 months</option></select><button className="rounded-md border border-[#d0e1ed] bg-white px-3.5 py-2.5 text-xs font-bold text-[#21527e] shadow-sm hover:bg-[#f4fbff]" onClick={exportReport} type="button">⇩ Export Report</button><button className={`rounded-md px-3.5 py-2.5 text-xs font-bold text-white shadow-sm ${alertEnabled ? 'bg-emerald-600' : 'bg-[#0e5bb3]'}`} onClick={() => setAlertEnabled((value) => !value)} type="button">♧ {alertEnabled ? 'Alert Set' : 'Set Alert'}</button></div>
    </div>

    <form className="grid gap-3 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm xl:grid-cols-[1fr_1fr_1.2fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); void applyForecast(); }}>
      <label className="text-[11px] font-semibold text-[#58728d]">Vessel Type<select className="mt-1 block w-full rounded-md border border-[#dce8f0] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#1e416a]" onChange={(event) => setVesselType(event.target.value)} value={vesselType}><option>Panamax</option><option>Supramax</option><option>Capesize</option><option>Handysize</option></select></label>
      <label className="text-[11px] font-semibold text-[#58728d]">Cargo Type<select className="mt-1 block w-full rounded-md border border-[#dce8f0] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#1e416a]" onChange={(event) => setCargo(event.target.value)} value={cargo}><option>Coal</option><option>Coking Coal</option><option>Iron Ore</option><option>Pet Coke</option><option>Fertilizer</option></select></label>
      <label className="text-[11px] font-semibold text-[#58728d]">Route<select className="mt-1 block w-full rounded-md border border-[#dce8f0] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#1e416a]" onChange={(event) => setRoute(event.target.value)} value={route}><option>Australia → India (East Coast)</option><option>Indonesia → India (East Coast)</option><option>Mozambique → India (East Coast)</option></select></label>
      <div aria-label="Forecast horizon" className="flex items-end rounded-md bg-[#f7fbfe] p-1">{[14, 30, 60].map((value) => <button aria-pressed={horizon === value} className={`min-w-12 rounded-md px-3 py-2 text-xs font-bold ${horizon === value ? 'bg-[#126cbe] text-white shadow-sm' : 'text-[#45617e]'}`} key={value} onClick={() => setHorizon(value)} type="button">{value}D</button>)}</div>
      <button className="rounded-md bg-[#104f97] px-7 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0b4381] disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Applying…' : 'Apply'}</button>
    </form>
    {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
    {forecastRun?.warnings.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-800"><b>Forecast inputs:</b> {forecastRun.warnings.join(' ')}</div> : null}

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon="$" iconStyle="bg-[#e7f3ff] text-[#1479d0]" label="Current Rate" value={currency(currentRate)} detail={forecastRun ? `Source: ${forecastRun.source.rate}` : 'Run the model'} detailStyle="text-emerald-600" />
      <Metric icon="↗" iconStyle="bg-[#ffedef] text-[#e54858]" label={`Forecast (${horizon} Days)`} value={currency(forecastRate)} detail={selectedForecast ? `${selectedForecast.direction} ${Math.abs(selectedForecast.change_percent).toFixed(1)}%` : 'Awaiting model run'} detailStyle="text-rose-600" />
      <Metric icon="↗" iconStyle="bg-[#e9f9f2] text-[#1ba76b]" label="Market Trend" value={selectedForecast ? (selectedForecast.direction === 'Increase' ? 'Strengthening' : selectedForecast.direction === 'Decrease' ? 'Softening' : 'Stable') : 'Awaiting run'} detail={forecastRun ? `${forecastRun.qualityStatus.toLowerCase()} input quality` : 'No prediction generated'} detailStyle="text-[#668099]" />
      <article className="flex items-center gap-4 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="grid h-14 w-14 place-items-center rounded-full border-[7px] border-[#1479d0] border-r-[#d8ecf0] text-sm font-extrabold text-[#173a67]">{forecastRun?.forecast.length ?? 0}</div><div><p className="text-xs text-[#55708c]">Model Outputs</p><b className="mt-1 block text-base text-[#193b67]">CatBoost horizons</b><p className="mt-1 text-[11px] text-slate-500">14, 30 and 60 days</p></div></article>
    </div>

    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#153a70]">{vesselType} Freight Rate Forecast</h2><p className="mt-1 text-xs text-[#66809b]">CatBoost prediction output · USD / MT</p></div><button className="rounded-md border border-[#d8e6ef] px-3 py-2 text-xs font-semibold text-[#42617f]" onClick={() => setShowEvents((visible) => !visible)} type="button">{showEvents ? 'Hide Values' : 'Show Values'}⌄</button></div>
        <div className="mt-3 h-[238px] overflow-hidden rounded-lg bg-[linear-gradient(180deg,#fff,#f8fcff)]">
          {modelSeries.length ? <svg aria-label="CatBoost freight-rate forecast chart" className="h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none">
            <g stroke="#e4edf3" strokeWidth="1">{[25, 67, 109, 151, 193, 235].map((y) => <line key={y} x1="38" x2="880" y1={y} y2={y} />)}{[70, 326, 583, 840].map((x) => <line key={x} x1={x} x2={x} y1="25" y2="235" />)}</g>
            <path d={chartPath(modelSeries)} fill="none" stroke="#1477d4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {modelSeries.map((point, index) => { const values = modelSeries.map((item) => item.value); const range = Math.max(.01, Math.max(...values) - Math.min(...values)); const x = 70 + (index / Math.max(1, modelSeries.length - 1)) * 770; const y = 190 - ((point.value - Math.min(...values)) / range) * 115; return <g key={point.day}><circle cx={x} cy={y} fill="#fff" r="6" stroke="#1477d4" strokeWidth="3" />{showEvents ? <text fill="#285b8c" fontSize="11" textAnchor="middle" x={x} y={y - 13}>{point.day === 0 ? `Now $${point.value.toFixed(2)}` : `${point.day}d $${point.value.toFixed(2)}`}</text> : null}</g>; })}
          </svg> : <div className="grid h-full place-items-center px-8 text-center"><div><p className="text-sm font-bold text-[#2d557e]">Run the CatBoost forecast to view prediction points.</p><p className="mt-1 text-xs text-[#66809b]">{marketSeries.data?.length ? `${marketSeries.data.length} historical rate observations are stored for this filter.` : 'No matching historical market observations are stored yet.'}</p></div></div>}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-5 text-[11px] text-[#58728c]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-[#1477d4] bg-white" />Current market input</span><span><i className="mr-1 inline-block h-0.5 w-5 bg-[#1477d4]" />CatBoost output</span><span>{forecastRun ? `Model source: ${forecastRun.source.model}` : 'Awaiting model run'}</span></div>
      </article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div className="flex justify-between"><h2 className="text-lg font-extrabold text-[#153a70]">☼ Key Insights</h2><button className="text-xs font-bold text-[#0e73ca]" onClick={() => setShowAllInsights((visible) => !visible)} type="button">{showAllInsights ? 'Show Less' : 'View All'}</button></div><div className="mt-2 divide-y divide-[#e6eef3]">{insights.slice(0, showAllInsights ? insights.length : 3).map(([icon, text, style]) => <div className="flex gap-3 py-3" key={text}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ${style}`}>{icon}</span><p className="text-xs leading-5 text-[#45617e]">{text}</p></div>)}</div><button className="mt-3 flex w-full items-center justify-between rounded-lg bg-[#edf6ff] px-3 py-3 text-left" onClick={() => setHorizon(30)} type="button"><span><small className="block text-[10px] text-[#66819b]">Recommended model view:</small><b className="text-sm text-[#1c4d83]">30-day forecast</b></span><strong className="text-[#0c75cf]">›</strong></button></article>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1.05fr_1fr_1.1fr]">
      <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#173b69]">Freight Rate Comparison</h2><span className="rounded bg-[#1479d6] px-3 py-1 text-[10px] font-bold text-white">Panamax</span></div><table className="mt-3 w-full text-left text-[10px]"><thead className="border-y border-[#e6eef3] text-[#698099]"><tr>{['Month', 'Panamax', 'Supramax', 'Capesize', 'Handysize'].map((label) => <th className="px-1 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr className="border-b border-[#eef3f6] text-[#48617e]" key={row[0]}>{row.map((cell) => <td className="px-1 py-1.5" key={cell}>{cell}</td>)}</tr>)}</tbody></table><p className="mt-2 text-[9px] text-slate-400">Placeholder market comparison · units USD per day</p></article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#173b69]">Supply vs Demand Drivers</h2><span className="rounded bg-[#1479d6] px-3 py-1 text-[10px] font-bold text-white">Supply</span></div><div className="mt-3 divide-y divide-[#edf2f6]">{drivers.map(([icon, label, level, detail]) => <div className="grid grid-cols-[20px_1fr_auto_105px] items-center gap-2 py-2 text-[10px]" key={label}><span className="text-[#1678d2]">{icon}</span><b className="font-medium text-[#48617e]">{label}</b><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${level === 'High' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{level}</span><span className="text-slate-400">{detail}</span></div>)}</div></article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#173b69]">Route Rate Heatmap <span className="font-normal text-slate-400">(USD / day)</span></h2><span className="rounded bg-[#1479d6] px-3 py-1 text-[10px] font-bold text-white">From Australia</span></div><table className="mt-3 w-full text-center text-[9px]"><thead className="text-[#698099]"><tr>{['Destination', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((label) => <th className="p-1 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{heatmap.map((row, rowIndex) => <tr key={row[0]}>{row.map((cell, index) => <td className={`${index === 0 ? 'bg-white text-left font-semibold text-[#48617e]' : rowIndex === 5 ? 'bg-rose-200' : index < 3 ? 'bg-orange-100' : index < 5 ? 'bg-amber-100' : 'bg-emerald-100'} p-1.5`} key={cell}>{cell}</td>)}</tr>)}</tbody></table><div className="mt-3 h-2 rounded-full bg-[linear-gradient(90deg,#53c88b,#f3e363,#f58a68,#ec4968)]" /><div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>Lower rates</span><span>Higher rates</span></div></article>
    </div>
  </section>;
}

function Metric({ icon, iconStyle, label, value, detail, detailStyle }: { icon: string; iconStyle: string; label: string; value: string; detail: string; detailStyle: string }) {
  return <article className="flex items-center gap-4 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><span className={`grid h-14 w-14 place-items-center rounded-full text-2xl font-extrabold ${iconStyle}`}>{icon}</span><div><p className="text-xs text-[#55708c]">{label}</p><b className="mt-1 block text-lg text-[#193b67]">{value}</b><p className={`mt-1 text-[11px] font-bold ${detailStyle}`}>{detail}</p></div></article>;
}
