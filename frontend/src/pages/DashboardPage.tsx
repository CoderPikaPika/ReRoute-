import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';
import { useDashboard } from '../features/dashboard/hooks';
import { getFreightForecast, type FreightForecast } from '../services/marketApi';

const portOptions = ['Hay Point (AUS)', 'Newcastle (AUS)', 'Paradip (IND)', 'Visakhapatnam (IND)', 'Dhamra (IND)', 'Gangavaram (IND)'];

const portSnapshot = [
  ['Paradip', 'Normal', '1–2 days', 'emerald'],
  ['Vizag', 'Normal', '1–3 days', 'emerald'],
  ['Gangavaram', 'Moderate', '2–4 days', 'amber'],
  ['Gopalpur', 'Normal', '1–2 days', 'emerald'],
  ['Dhamra', 'Moderate', '2–5 days', 'amber'],
  ['Haldia', 'Normal', '1–3 days', 'emerald'],
];

const demoVessels = [
  ['MV Ocean Pride', 'Panamax', 'En route', '12 Oct', 'emerald'],
  ['Cape Harmony', 'Capesize', 'At port', '8 Oct', 'amber'],
  ['Eastern Star', 'Supramax', 'En route', '6 Oct', 'emerald'],
  ['Sea Voyager', 'Handysize', 'At port', '14 Oct', 'amber'],
];

function formatRate(value: number) {
  return 'USD ' + value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '/MT';
}

function vesselForQuantity(quantity: number) {
  if (quantity <= 38000) return 'Handysize';
  if (quantity <= 58000) return 'Supramax';
  if (quantity <= 75000) return 'Panamax';
  return 'Capesize';
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard(user?.role ?? 'SHIPPER');
  const [origin, setOrigin] = useState('Hay Point (AUS)');
  const [destination, setDestination] = useState('Paradip (IND)');
  const [cargoType, setCargoType] = useState('Thermal coal');
  const [quantity, setQuantity] = useState(70000);
  const [duration, setDuration] = useState(30);
  const [forecasts, setForecasts] = useState<FreightForecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const currentRate = 21.8;
  const selectedForecast = forecasts.find((item) => item.forecast_days === duration);
  const recommendedVessel = vesselForQuantity(quantity);
  const activeValue = data?.metrics.active ?? data?.metrics.activeShipments ?? data?.metrics.inTransit ?? 0;
  const totalValue = data?.metrics.total ?? data?.metrics.totalVehicles ?? data?.metrics.totalUsers ?? 0;
  const chartPoints = useMemo(() => {
    const values = [currentRate, ...forecasts.map((item) => item.predicted_freight_rate_usd_mt)];
    const minimum = Math.min(...values) - 1;
    const range = Math.max(1, Math.max(...values) - minimum + 1);
    return values.map((value, index) => {
      const x = 38 + index * 85;
      const y = 176 - ((value - minimum) / range) * 125;
      return x + ',' + y;
    }).join(' ');
  }, [forecasts]);

  async function generateRecommendation() {
    setForecastLoading(true);
    setForecastError('');
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 0);
      const day = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000));
      const result = await getFreightForecast({
        dayOfYear: day,
        freightRateUsdMt: currentRate,
        bunkerPriceUsdMt: 4.2,
        daysSinceStart: 365,
      });
      setForecasts(result);
    } catch {
      setForecastError('Forecast service is offline. Start the backend and Python service, then try again.');
    } finally {
      setForecastLoading(false);
    }
  }

  return (
    <section className="space-y-5 pb-5">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#fff_0%,#f6fbff_52%,#dff2fb_100%)] px-6 py-7 sm:px-8">
        <div className="relative z-10 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Welcome to SeaNexus</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b2b5c] sm:text-4xl">From Data to Decisions</h1><p className="mt-2 text-base text-slate-600">AI-powered insights for smarter vessel chartering to India’s East Coast.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-lg">▰</span>Lower costs</div><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-lg">◷</span>Higher utilization</div><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-lg">◈</span>Safer operations</div><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-lg text-emerald-700">◌</span>Greener tomorrow</div></div>
        </div>
        <div className="absolute -right-4 bottom-0 hidden h-56 w-[47%] bg-[radial-gradient(ellipse_at_72%_90%,#0369a1_0%,#0f4c81_28%,transparent_29%),linear-gradient(180deg,transparent_35%,rgba(2,132,199,.2)_36%,rgba(2,132,199,.15)_100%)] lg:block"><div className="absolute bottom-12 right-20 h-16 w-64 rounded-t-[60%] bg-[#173c63] shadow-2xl"><div className="absolute -top-14 right-14 h-16 w-20 rounded-t bg-slate-700" /><div className="absolute -top-20 right-20 h-11 w-3 bg-slate-600" /></div><p className="absolute right-12 top-7 max-w-36 text-right text-lg italic font-semibold text-white/90">“Better insights.<br />Smoother voyages.”</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">CURRENT MODEL RATE</p><div className="mt-2 flex items-end justify-between"><b className="text-2xl text-[#0b2b5c]">{selectedForecast ? formatRate(selectedForecast.predicted_freight_rate_usd_mt) : formatRate(currentRate)}</b><span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">Forecast</span></div></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">ACTIVE OPERATIONS</p><div className="mt-2 flex items-end justify-between"><b className="text-3xl text-[#0b2b5c]">{isLoading ? '—' : activeValue}</b><span className="text-sm font-semibold text-emerald-600">Live DB</span></div></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">NETWORK RECORDS</p><div className="mt-2 flex items-end justify-between"><b className="text-3xl text-[#0b2b5c]">{isLoading ? '—' : totalValue}</b><span className="text-sm font-semibold text-slate-500">{user?.role}</span></div></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">MARKET OUTLOOK</p><div className="mt-2 flex items-end justify-between"><b className={selectedForecast?.change_usd_mt && selectedForecast.change_usd_mt > 0 ? 'text-xl text-amber-700' : 'text-xl text-emerald-700'}>{selectedForecast ? selectedForecast.direction : 'Run forecast'}</b><span className="text-xs text-slate-500">{selectedForecast ? Math.abs(selectedForecast.change_percent) + '% change' : 'Model ready'}</span></div></article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
        <form onSubmit={(event) => { event.preventDefault(); void generateRecommendation(); }} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#0b2b5c]">Plan your next charter</h2><div className="mt-4 flex rounded-lg bg-slate-100 p-1 text-xs font-semibold"><span className="rounded-md bg-sky-600 px-3 py-2 text-white">Single voyage</span><span className="px-3 py-2 text-slate-600">Multiple voyage</span></div><label className="mt-4 block text-xs font-bold text-slate-600">CARGO TYPE<select value={cargoType} onChange={(event) => setCargoType(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"><option>Thermal coal</option><option>Iron ore</option><option>Metallurgical coal</option></select></label><label className="mt-3 block text-xs font-bold text-slate-600">ORIGIN PORT<select value={origin} onChange={(event) => setOrigin(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800">{portOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-3 block text-xs font-bold text-slate-600">DESTINATION PORT<select value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800">{portOptions.slice(2).map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">QUANTITY (MT)<input type="number" min="1000" step="1000" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-slate-600">CONTRACT<select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select></label></div><button disabled={forecastLoading} className="mt-5 w-full rounded-lg bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{forecastLoading ? 'Running model…' : 'Get recommendations →'}</button>{forecastError ? <p className="mt-3 text-xs text-rose-600">{forecastError}</p> : null}</form>

        <article className="relative min-h-[470px] overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_52%_48%,#9ed4c4_0%,#347b91_38%,#155a7a_70%,#10405e_100%)] p-5 shadow-sm"><div className="relative z-10 flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">Live vessel activity</h2><p className="text-xs text-sky-100">Prototype AIS route visual · replaceable provider</p></div><span className="rounded-md bg-emerald-300/90 px-2 py-1 text-xs font-bold text-emerald-950">LIVE DEMO</span></div><div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:70px_70px]" /><p className="absolute left-[36%] top-[20%] text-xl font-bold tracking-[.2em] text-white/75">INDIA</p><p className="absolute right-[18%] top-[12%] text-lg font-bold tracking-[.16em] text-white/65">CHINA</p><p className="absolute bottom-[12%] right-[19%] text-lg font-bold tracking-[.16em] text-white/65">AUSTRALIA</p><div className="absolute left-[18%] top-[44%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(167,243,208,.22)]" /><div className="absolute left-[49%] top-[35%] h-3 w-3 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,.2)]" /><div className="absolute right-[20%] top-[57%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_0_5px_rgba(253,230,138,.24)]" /><svg className="absolute inset-0 h-full w-full" viewBox="0 0 650 470" preserveAspectRatio="none"><path d="M80 275 C190 190 280 290 365 160 S510 160 570 250" fill="none" stroke="rgba(255,255,255,.72)" strokeDasharray="7 8" strokeWidth="2" /></svg><div className="absolute bottom-6 left-6 max-w-60 rounded-xl bg-white/95 p-4 shadow-lg"><div className="flex items-center justify-between"><b className="text-sm text-slate-900">MV Ocean Pride</b><span className="text-xs font-semibold text-emerald-700">● En route</span></div><p className="mt-1 text-xs text-slate-600">{recommendedVessel} · {quantity.toLocaleString()} MT</p><p className="mt-2 text-xs text-slate-700">From: {origin}<br />To: {destination}<br />ETA: prototype route estimate</p><button type="button" onClick={() => navigate('/market-intelligence')} className="mt-2 text-xs font-bold text-sky-700">Open charter analysis →</button></div></article>

        <article className="rounded-xl border border-sky-100 bg-[linear-gradient(160deg,#ffffff,#f0fdf8)] p-5 shadow-sm"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-sky-700">✦</span><div><h2 className="font-bold text-[#0b2b5c]">AI recommendation</h2><p className="text-xs text-slate-500">From live model output</p></div></div>{selectedForecast ? <><div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="text-sm font-bold text-emerald-800">{selectedForecast.change_usd_mt > 0 ? 'Secure charter early' : 'Review later entry window'}</p><p className="mt-1 text-xs leading-5 text-emerald-700">The model predicts a {Math.abs(selectedForecast.change_percent)}% {selectedForecast.direction.toLowerCase()} at {duration} days.</p></div><dl className="mt-5 space-y-4 text-sm"><div className="border-b border-slate-100 pb-3"><dt className="text-xs font-semibold text-slate-500">RECOMMENDED VESSEL</dt><dd className="mt-1 font-bold text-slate-900">{recommendedVessel} (best fit)</dd></div><div className="border-b border-slate-100 pb-3"><dt className="text-xs font-semibold text-slate-500">MODEL RATE</dt><dd className="mt-1 font-bold text-slate-900">{formatRate(selectedForecast.predicted_freight_rate_usd_mt)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">OPTIMAL ENTRY WINDOW</dt><dd className="mt-1 font-bold text-slate-900">{duration}-day scenario</dd></div></dl><button type="button" onClick={() => navigate('/market-intelligence')} className="mt-6 w-full rounded-lg border border-sky-200 bg-white py-2.5 text-sm font-bold text-sky-700">View full analysis →</button></> : <div className="mt-8 rounded-lg border border-dashed border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-600">Set cargo details and select <b>Get recommendations</b>. Your XGBoost forecast will drive the rate recommendation.</div>}</article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr_.85fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#0b2b5c]">Freight rate trend</h2><p className="text-xs text-slate-500">Only model outputs are charted</p></div><button type="button" onClick={() => navigate('/market-intelligence')} className="text-xs font-bold text-sky-700">Full forecast →</button></div>{forecasts.length ? <svg viewBox="0 0 295 215" className="mt-4 h-48 w-full"><line x1="35" y1="178" x2="282" y2="178" stroke="#cbd5e1" /><line x1="35" y1="30" x2="35" y2="178" stroke="#e2e8f0" /><polygon points={'38,178 ' + chartPoints + ' 293,178'} fill="#0ea5e9" opacity=".12" /><polyline points={chartPoints} fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.split(' ').map((point) => <circle key={point} cx={Number(point.split(',')[0])} cy={Number(point.split(',')[1])} r="4" fill="white" stroke="#0284c7" strokeWidth="3" />)}<text x="38" y="201" fill="#64748b" fontSize="11">Now</text><text x="123" y="201" fill="#64748b" fontSize="11">14d</text><text x="208" y="201" fill="#64748b" fontSize="11">30d</text><text x="278" y="201" fill="#64748b" fontSize="11">60d</text></svg> : <div className="mt-5 grid h-48 place-items-center rounded-lg bg-slate-50 text-center text-sm text-slate-500">Run a charter recommendation to visualize<br />your model’s forecast points.</div>}</article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-[#0b2b5c]">Recently tracked vessels</h2><span className="text-xs font-semibold text-slate-400">DEMO AIS</span></div><div className="mt-3 divide-y divide-slate-100">{demoVessels.map((vessel) => <div key={vessel[0]} className="grid grid-cols-[1.3fr_.9fr_.8fr_.55fr] gap-2 py-3 text-xs"><b className="text-slate-800">{vessel[0]}</b><span className="text-slate-500">{vessel[1]}</span><span className={vessel[4] === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}>● {vessel[2]}</span><span className="text-right text-slate-500">{vessel[3]}</span></div>)}</div></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-[#0b2b5c]">Key East Coast ports</h2><button type="button" onClick={() => navigate('/market-intelligence')} className="text-xs font-bold text-sky-700">View rules →</button></div><div className="mt-3 divide-y divide-slate-100">{portSnapshot.map((port) => <div key={port[0]} className="grid grid-cols-[1fr_.9fr_.7fr] gap-2 py-2 text-xs"><b className="text-slate-800">{port[0]}</b><span className={port[3] === 'emerald' ? 'text-emerald-700' : 'text-amber-700'}>● {port[1]}</span><span className="text-right text-slate-500">{port[2]}</span></div>)}</div></article>
      </div>
    </section>
  );
}
