import { useMemo, useState } from 'react';

import { getFreightForecast, type FreightForecast } from '../services/marketApi';

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

function dayOfYear(): number {
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000));
}

function currency(value: number): string {
  return `$ ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} / day`;
}

export function FreightForecastPage() {
  const [vesselType, setVesselType] = useState('Panamax');
  const [cargo, setCargo] = useState('Coal');
  const [route, setRoute] = useState('Australia → India (East Coast)');
  const [horizon, setHorizon] = useState(90);
  const [forecasts, setForecasts] = useState<FreightForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showAllInsights, setShowAllInsights] = useState(false);

  const selectedForecast = forecasts.find((forecast) => forecast.forecast_days === (horizon === 90 ? 60 : horizon === 180 ? 60 : 30));
  const forecastRate = selectedForecast ? selectedForecast.predicted_freight_rate_usd_mt * 1000 : 19800;
  const currentRate = 21300;
  const chartForecast = useMemo(() => forecasts.length ? forecasts.map((item) => item.predicted_freight_rate_usd_mt * 1000) : [19800, 19200, 18800], [forecasts]);

  async function applyForecast(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await getFreightForecast({
        dayOfYear: dayOfYear(),
        freightRateUsdMt: 21.3,
        bunkerPriceUsdMt: 4.2,
        daysSinceStart: 365,
      });
      setForecasts(result);
    } catch {
      setError('The forecast model is unavailable. Start the backend and Python ML service, then apply again.');
    } finally {
      setLoading(false);
    }
  }

  function exportReport(): void {
    const rows = [['SeaNexus freight forecast report'], ['Vessel', vesselType], ['Cargo', cargo], ['Route', route], ['Horizon', `${horizon} days`], [], ['Model horizon', 'Predicted USD/MT', 'Direction'], ...forecasts.map((item) => [String(item.forecast_days), String(item.predicted_freight_rate_usd_mt), item.direction])];
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
      <label className="text-[11px] font-semibold text-[#58728d]">Cargo Type<select className="mt-1 block w-full rounded-md border border-[#dce8f0] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#1e416a]" onChange={(event) => setCargo(event.target.value)} value={cargo}><option>Coal</option><option>Iron Ore</option><option>Pet Coke</option><option>Fertilizer</option></select></label>
      <label className="text-[11px] font-semibold text-[#58728d]">Route<select className="mt-1 block w-full rounded-md border border-[#dce8f0] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#1e416a]" onChange={(event) => setRoute(event.target.value)} value={route}><option>Australia → India (East Coast)</option><option>Indonesia → India (East Coast)</option><option>Mozambique → India (East Coast)</option></select></label>
      <div className="flex items-end rounded-md bg-[#f7fbfe] p-1">{[90, 180, 365, 730].map((value, index) => <button className={`min-w-12 rounded-md px-2 py-2 text-xs font-bold ${horizon === value ? 'bg-[#126cbe] text-white shadow-sm' : 'text-[#45617e]'}`} key={value} onClick={() => setHorizon(value)} type="button">{['3M', '6M', '1Y', '2Y'][index]}</button>)}</div>
      <button className="rounded-md bg-[#104f97] px-7 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0b4381] disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Applying…' : 'Apply'}</button>
    </form>
    {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon="$" iconStyle="bg-[#e7f3ff] text-[#1479d0]" label="Current Rate" value={currency(currentRate)} detail="▲ +4.2%" detailStyle="text-emerald-600" />
      <Metric icon="↗" iconStyle="bg-[#ffedef] text-[#e54858]" label="Forecast (Next 3 Months)" value={currency(forecastRate)} detail={selectedForecast ? `${selectedForecast.direction} ${Math.abs(selectedForecast.change_percent).toFixed(1)}%` : '▼ -7.0%'} detailStyle="text-rose-600" />
      <Metric icon="↗" iconStyle="bg-[#e9f9f2] text-[#1ba76b]" label="Market Trend" value={selectedForecast?.direction === 'Increase' ? 'Strengthening' : 'Softening'} detail="Rates likely to stabilize" detailStyle="text-[#668099]" />
      <article className="flex items-center gap-4 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm"><div className="grid h-14 w-14 place-items-center rounded-full border-[7px] border-emerald-500 border-r-[#d8ecf0] text-sm font-extrabold text-[#173a67]">78%</div><div><p className="text-xs text-[#55708c]">Confidence Level</p><b className="mt-1 block text-base text-[#193b67]">Model confidence</b><p className="mt-1 text-[11px] text-slate-500">Model + input data</p></div></article>
    </div>

    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_350px]">
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#153a70]">{vesselType} Freight Rate Forecast</h2><p className="mt-1 text-xs text-[#66809b]">USD / day · Historical-rate visual is a prototype placeholder</p></div><button className="rounded-md border border-[#d8e6ef] px-3 py-2 text-xs font-semibold text-[#42617f]" onClick={() => setShowEvents((visible) => !visible)} type="button">{showEvents ? 'Hide Events' : 'Show Events'}⌄</button></div><div className="mt-3 h-[238px] overflow-hidden rounded-lg bg-[linear-gradient(180deg,#fff,#f8fcff)]"><svg aria-label="Freight rate forecast chart" className="h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none"><g stroke="#e4edf3" strokeWidth="1">{[25, 67, 109, 151, 193, 235].map((y) => <line key={y} x1="38" x2="880" y1={y} y2={y} />)}{[38, 145, 252, 359, 466, 573, 680, 787].map((x) => <line key={x} x1={x} x2={x} y1="25" y2="235" />)}</g><path d="M38 58 C90 68 112 55 145 85 S210 84 252 99 S312 112 359 126 S420 132 466 143" fill="none" stroke="#1477d4" strokeLinecap="round" strokeWidth="4" /><path d="M466 143 C540 147 620 139 680 150 S770 132 880 109" fill="none" stroke="#1477d4" strokeDasharray="9 7" strokeLinecap="round" strokeWidth="3" /><path d="M466 119 C540 105 620 112 680 98 S770 83 880 64 L880 151 C770 175 690 174 680 181 S540 171 466 166Z" fill="#b8ddf2" opacity=".52" /><line x1="466" x2="466" y1="25" y2="235" stroke="#7096bd" strokeDasharray="4 4" /><circle cx="466" cy="143" fill="#fff" r="7" stroke="#1477d4" strokeWidth="4" />{showEvents ? <g fill="#e63950"><circle cx="144" cy="85" r="5" /><circle cx="347" cy="121" r="5" /><circle cx="466" cy="143" r="5" /><circle cx="770" cy="143" r="5" /></g> : null}{chartForecast.map((value, index) => <text key={value} fill="#2c6ba8" fontSize="10" x={580 + index * 80} y={220}>{Math.round(value / 1000)}k</text>)}</svg></div><div className="mt-3 flex flex-wrap justify-center gap-5 text-[11px] text-[#58728c]"><span><i className="mr-1 inline-block h-0.5 w-5 bg-[#1477d4]" />Historical Rate</span><span><i className="mr-1 inline-block h-0.5 w-5 border-t-2 border-dashed border-[#1477d4]" />Model forecast</span><span><i className="mr-1 inline-block h-2 w-5 bg-[#b8ddf2]" />Confidence band</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#e63950]" />Market events</span></div></article>
      <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm"><div className="flex justify-between"><h2 className="text-lg font-extrabold text-[#153a70]">☼ Key Insights</h2><button className="text-xs font-bold text-[#0e73ca]" onClick={() => setShowAllInsights((visible) => !visible)} type="button">{showAllInsights ? 'Show Less' : 'View All'}</button></div><div className="mt-2 divide-y divide-[#e6eef3]">{insights.slice(0, showAllInsights ? insights.length : 3).map(([icon, text, style]) => <div className="flex gap-3 py-3" key={text}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ${style}`}>{icon}</span><p className="text-xs leading-5 text-[#45617e]">{text}</p></div>)}</div><button className="mt-3 flex w-full items-center justify-between rounded-lg bg-[#edf6ff] px-3 py-3 text-left" onClick={() => setHorizon(90)} type="button"><span><small className="block text-[10px] text-[#66819b]">Best time to enter:</small><b className="text-sm text-[#1c4d83]">Feb – Apr 2026</b></span><strong className="text-[#0c75cf]">›</strong></button></article>
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
