import { useEffect, useState } from 'react';

import { getFreightForecast, getModelStatus, type FreightForecast } from '../services/marketApi';

const ports = {
  Paradip: {
    maxClass: 4,
    draft: '18.0m',
    note: 'Capesize calls can be conditional on berth and tide planning.',
  },
  Visakhapatnam: {
    maxClass: 3,
    draft: '16.5m',
    note: 'Suitable for Panamax and below under the reference constraint set.',
  },
  Dhamra: {
    maxClass: 4,
    draft: '18.0m',
    note: 'Deep-water bulk terminal; large vessel calls are generally feasible.',
  },
  Haldia: { maxClass: 1, draft: '8.5m', note: 'Draft constraint: limit planning to Handysize.' },
  Gangavaram: {
    maxClass: 4,
    draft: '21.0m',
    note: 'Deep-water port suitable for large bulk vessels.',
  },
};
type PortName = keyof typeof ports;

const vesselClasses = [
  { name: 'Handysize', capacity: 38000, rank: 1, draft: '10.4m' },
  { name: 'Supramax', capacity: 58000, rank: 2, draft: '12.2m' },
  { name: 'Panamax', capacity: 75000, rank: 3, draft: '13.8m' },
  { name: 'Capesize', capacity: 180000, rank: 4, draft: '17.5m' },
];

interface SavedScenario {
  id: string;
  savedAt: string;
  origin: PortName;
  destination: PortName;
  cargoVolume: number;
  currentRate: number;
  bunkerRate: number;
  forecasts: FreightForecast[];
}

const scenarioStorageKey = 'reroute.market-scenarios';

function dateToDayOfYear(date: string) {
  const value = new Date(date + 'T00:00:00');
  const beginning = new Date(value.getFullYear(), 0, 0);
  return Math.max(1, Math.floor((value.getTime() - beginning.getTime()) / 86400000));
}

function formatCurrency(value: number) {
  return 'USD ' + value.toFixed(2) + '/MT';
}

export function MarketIntelligencePage() {
  const [origin, setOrigin] = useState<PortName>('Paradip');
  const [destination, setDestination] = useState<PortName>('Visakhapatnam');
  const [cargoVolume, setCargoVolume] = useState(70000);
  const [contractHorizon, setContractHorizon] = useState(30);
  const [forecastDate, setForecastDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentRate, setCurrentRate] = useState(21.8);
  const [bunkerRate, setBunkerRate] = useState(4.2);
  const [daysSinceStart, setDaysSinceStart] = useState(365);
  const [forecasts, setForecasts] = useState<FreightForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelOnline, setModelOnline] = useState<boolean | null>(null);
  const [recentScenarios, setRecentScenarios] = useState<SavedScenario[]>(() => {
    try {
      const stored = localStorage.getItem(scenarioStorageKey);
      return stored ? (JSON.parse(stored) as SavedScenario[]) : [];
    } catch {
      return [];
    }
  });

  const vesselByCargo =
    vesselClasses.find((item) => cargoVolume <= item.capacity) ?? vesselClasses[3];
  const portLimit = Math.min(ports[origin].maxClass, ports[destination].maxClass);
  const recommendedVessel = vesselClasses[Math.min(vesselByCargo.rank, portLimit) - 1];
  const portConstraint = vesselByCargo.rank > portLimit;
  const selectedForecast = forecasts.find((item) => item.forecast_days === contractHorizon);
  const lowestForecast = forecasts.length
    ? forecasts.reduce((lowest, item) =>
        item.predicted_freight_rate_usd_mt < lowest.predicted_freight_rate_usd_mt ? item : lowest,
      )
    : undefined;
  const chartValues = [currentRate, ...forecasts.map((item) => item.predicted_freight_rate_usd_mt)];
  const chartMin = Math.min(...chartValues) - 1;
  const chartRange = Math.max(1, Math.max(...chartValues) - chartMin + 1);
  const chartPoints = chartValues
    .map((value, index) => {
      const x = 42 + index * 100;
      const y = 214 - ((value - chartMin) / chartRange) * 160;
      return x + ',' + y;
    })
    .join(' ');

  useEffect(() => {
    const checkModel = async () => {
      try {
        const status = await getModelStatus();
        setModelOnline(status.status === 'ok');
      } catch {
        setModelOnline(false);
      }
    };
    void checkModel();
    const timer = window.setInterval(() => void checkModel(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const persistScenario = (results: FreightForecast[]) => {
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      savedAt: new Date().toLocaleString(),
      origin,
      destination,
      cargoVolume,
      currentRate,
      bunkerRate,
      forecasts: results,
    };
    const next = [scenario, ...recentScenarios].slice(0, 4);
    setRecentScenarios(next);
    localStorage.setItem(scenarioStorageKey, JSON.stringify(next));
  };

  const loadScenario = (scenario: SavedScenario) => {
    setOrigin(scenario.origin);
    setDestination(scenario.destination);
    setCargoVolume(scenario.cargoVolume);
    setCurrentRate(scenario.currentRate);
    setBunkerRate(scenario.bunkerRate);
    setForecasts(scenario.forecasts);
  };

  const exportReport = () => {
    if (!forecasts.length) return;
    const rows = [
      ['ReRoute freight forecast report'],
      ['Route', origin + ' to ' + destination],
      ['Cargo volume MT', cargoVolume.toString()],
      ['Current freight USD/MT', currentRate.toString()],
      [],
      ['Forecast day', 'Prediction USD/MT', 'Change USD/MT', 'Change percent', 'Direction'],
      ...forecasts.map((item) => [
        item.forecast_days.toString(),
        item.predicted_freight_rate_usd_mt.toString(),
        item.change_usd_mt.toString(),
        item.change_percent.toString(),
        item.direction,
      ]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reroute-freight-forecast.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const runModel = async () => {
    setIsLoading(true);
    setError('');
    try {
      const results = await getFreightForecast({
        dayOfYear: dateToDayOfYear(forecastDate),
        freightRateUsdMt: currentRate,
        bunkerPriceUsdMt: bunkerRate,
        daysSinceStart,
      });
      setForecasts(results);
      persistScenario(results);
    } catch {
      setError(
        'Forecast unavailable. Make sure the backend and the Python ML service are both running.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-cyan-300">
              REROUTE / MARKET INTELLIGENCE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Make the freight decision before the market moves.
            </h1>
            <p className="mt-3 max-w-2xl leading-6 text-slate-300">
              Run the connected CatBoost model, compare its 14, 30 and 60-day predictions, then
              check vessel feasibility for the selected ports.
            </p>
          </div>
          <span
            className={
              modelOnline
                ? 'w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100'
                : 'w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100'
            }
          >
            {modelOnline
              ? '● Model online · 3 horizons'
              : modelOnline === false
                ? '● Model offline · check Python service'
                : 'Checking model connection…'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runModel();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-slate-900">Forecast inputs</h2>
          <p className="mt-1 text-sm text-slate-500">
            These values are sent to your trained model.
          </p>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Forecast date
            <input
              required
              type="date"
              value={forecastDate}
              onChange={(event) => setForecastDate(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              Current rate
              <input
                required
                min="0.1"
                step="0.01"
                type="number"
                value={currentRate}
                onChange={(event) => setCurrentRate(Number(event.target.value))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Bunker cost
              <input
                required
                min="0.1"
                step="0.01"
                type="number"
                value={bunkerRate}
                onChange={(event) => setBunkerRate(Number(event.target.value))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Days since training-data start
            <input
              required
              min="0"
              type="number"
              value={daysSinceStart}
              onChange={(event) => setDaysSinceStart(Number(event.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <button
            disabled={isLoading}
            className="mt-5 w-full rounded-lg bg-slate-950 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Running model…' : 'Run forecast'}
          </button>
          {error ? (
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
          ) : null}
        </form>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Freight-rate forecast</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current input plus actual outputs returned from the model.
              </p>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {[14, 30, 60].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setContractHorizon(item)}
                  className={
                    contractHorizon === item
                      ? 'rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm'
                      : 'px-3 py-1.5 text-sm text-slate-500'
                  }
                >
                  {item}d
                </button>
              ))}
            </div>
          </div>
          {forecasts.length ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {forecasts.map((item) => (
                  <div
                    key={item.forecast_days}
                    className={
                      item.forecast_days === contractHorizon
                        ? 'rounded-xl border border-cyan-300 bg-cyan-50 p-4 shadow-sm'
                        : 'rounded-xl border border-slate-200 p-4'
                    }
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.forecast_days}-day output
                    </p>
                    <b className="mt-2 block text-xl text-slate-950">
                      {formatCurrency(item.predicted_freight_rate_usd_mt)}
                    </b>
                    <p
                      className={
                        item.change_usd_mt > 0
                          ? 'mt-2 text-sm text-amber-700'
                          : 'mt-2 text-sm text-emerald-700'
                      }
                    >
                      {item.direction} {Math.abs(item.change_percent)}%
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-[linear-gradient(180deg,#f0fdfa,#f8fafc)] p-3">
                <svg
                  viewBox="0 0 360 240"
                  className="h-64 w-full"
                  aria-label="Model forecast chart"
                >
                  <line x1="42" y1="214" x2="342" y2="214" stroke="#cbd5e1" />
                  <line x1="42" y1="30" x2="42" y2="214" stroke="#cbd5e1" />
                  <polygon
                    points={'42,214 ' + chartPoints + ' 342,214'}
                    fill="#0891b2"
                    opacity="0.12"
                  />
                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartPoints.split(' ').map((point) => (
                    <circle
                      key={point}
                      cx={Number(point.split(',')[0])}
                      cy={Number(point.split(',')[1])}
                      r="6"
                      fill="#fff"
                      stroke="#0891b2"
                      strokeWidth="4"
                    />
                  ))}
                  <text x="34" y="232" textAnchor="middle" fill="#64748b" fontSize="12">
                    Now
                  </text>
                  <text x="142" y="232" textAnchor="middle" fill="#64748b" fontSize="12">
                    14d
                  </text>
                  <text x="242" y="232" textAnchor="middle" fill="#64748b" fontSize="12">
                    30d
                  </text>
                  <text x="342" y="232" textAnchor="middle" fill="#64748b" fontSize="12">
                    60d
                  </text>
                </svg>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={exportReport}
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Download forecast CSV
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6 grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <p className="font-semibold text-slate-700">No prediction yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Run the model to display its real 14, 30 and 60-day outputs here.
                </p>
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
        <form
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(event) => event.preventDefault()}
        >
          <h2 className="text-lg font-bold text-slate-900">Cargo & port constraints</h2>
          <p className="mt-1 text-sm text-slate-500">
            Rule-based feasibility check using the documented port constraints.
          </p>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Loading port
            <select
              value={origin}
              onChange={(event) => setOrigin(event.target.value as PortName)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              {Object.keys(ports).map((port) => (
                <option key={port}>{port}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Discharge port
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value as PortName)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            >
              {Object.keys(ports).map((port) => (
                <option key={port}>{port}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Cargo volume (MT)
            <input
              required
              min="1"
              type="number"
              value={cargoVolume}
              onChange={(event) => setCargoVolume(Number(event.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
        </form>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Chartering decision</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-slate-400">Recommended vessel</p>
              <b className="mt-2 block text-2xl">{recommendedVessel.name}</b>
              <p className="mt-2 text-sm text-slate-400">
                {recommendedVessel.capacity.toLocaleString()} MT capacity ·{' '}
                {recommendedVessel.draft} draft
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Port assessment
              </p>
              <b
                className={
                  portConstraint
                    ? 'mt-2 block text-lg text-amber-700'
                    : 'mt-2 block text-lg text-emerald-700'
                }
              >
                {portConstraint ? 'Cargo class constrained' : 'Feasible route'}
              </b>
              <p className="mt-2 text-sm text-slate-600">
                {origin}: {ports[origin].draft} · {destination}: {ports[destination].draft}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Market entry
              </p>
              <b className="mt-2 block text-lg text-slate-900">
                {lowestForecast
                  ? 'Review ' + lowestForecast.forecast_days + '-day window'
                  : 'Run model first'}
              </b>
              <p className="mt-2 text-sm text-slate-600">
                {lowestForecast
                  ? 'Lowest model output: ' +
                    formatCurrency(lowestForecast.predicted_freight_rate_usd_mt)
                  : 'Recommendation is calculated from your model outputs.'}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
            <b className="text-slate-900">Reasoning: </b>
            {portConstraint
              ? 'The cargo-volume vessel class exceeds a port restriction, so the vessel recommendation is reduced to the largest feasible class. Consider splitting the cargo into voyages.'
              : 'The cargo class is feasible for both selected ports under the reference rules.'}{' '}
            {selectedForecast
              ? ' The selected ' +
                contractHorizon +
                '-day model output is ' +
                formatCurrency(selectedForecast.predicted_freight_rate_usd_mt) +
                '.'
              : ''}
          </div>
        </article>
      </div>
      {recentScenarios.length ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent forecast scenarios</h2>
              <p className="text-sm text-slate-500">Saved in this browser after each model run.</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">LOCAL</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recentScenarios.map((scenario) => (
              <button
                type="button"
                onClick={() => loadScenario(scenario)}
                key={scenario.id}
                className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50"
              >
                <p className="font-semibold text-slate-900">
                  {scenario.origin} → {scenario.destination}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {scenario.cargoVolume.toLocaleString()} MT · {scenario.savedAt}
                </p>
                <p className="mt-3 text-sm font-semibold text-cyan-700">Load scenario</p>
              </button>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
