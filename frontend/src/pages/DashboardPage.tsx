import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MaritimeVesselMap } from '../components/map/MaritimeVesselMap';
import {
  useLatestMaritimeForecastRun,
  useMaritimeMarketObservations,
  useMaritimePorts,
  useMaritimeVesselTrack,
  useMaritimeVessels,
} from '../features/maritime/hooks';
import {
  type MaritimeForecastRun,
  type MaritimeMarketObservation,
  type VesselClass,
} from '../services/maritimeApi';

const horizonOptions = [14, 30, 60] as const;

function vesselClassLabel(value: VesselClass): string {
  return value === 'HANDYSIZE'
    ? 'Handysize'
    : value === 'SUPRAMAX'
      ? 'Supramax'
      : value === 'PANAMAX'
        ? 'Panamax'
        : value === 'CAPESIZE'
          ? 'Capesize'
          : 'Other';
}

function formatRate(value: number | undefined): string {
  return value === undefined
    ? '—'
    : `USD ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}/MT`;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return 'Awaiting data';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusTone(status: string | undefined): string {
  if (status === 'LOW' || status === 'OPERATIONAL' || status === 'UNDER_WAY')
    return 'text-emerald-700';
  if (status === 'MODERATE' || status === 'AT_PORT' || status === 'MOORED') return 'text-amber-700';
  if (status === 'HIGH' || status === 'CLOSED') return 'text-rose-700';
  return 'text-slate-500';
}

function sourceLabel(source: string | undefined, estimated?: boolean): string {
  if (!source) return 'No source';
  if (estimated) return `${source} · estimated`;
  if (/aisstream/i.test(source)) return 'AISStream feed';
  if (/open-meteo/i.test(source)) return 'Open-Meteo';
  return source.replace(/[_-]/g, ' ');
}

function marketCargoForSeries(cargo: string): string {
  return cargo === 'Thermal coal' ? cargo : 'Thermal coal';
}

interface TrendChartProps {
  observations: MaritimeMarketObservation[];
  forecast: MaritimeForecastRun | null;
  activeHorizon: number;
}

function RateTrendChart({ observations, forecast, activeHorizon }: TrendChartProps) {
  const { actual, actualPath, forecastPath, points, maxValue, minValue } = useMemo(() => {
    const actual = [...observations]
      .sort((left, right) => new Date(left.asOf).getTime() - new Date(right.asOf).getTime())
      .slice(-12);
    const forecastValues = forecast?.forecast ?? [];
    const values = [
      ...actual.map((item) => item.value),
      ...forecastValues.map((item) => item.predicted_freight_rate_usd_mt),
    ];
    const minimum = values.length ? Math.min(...values) * 0.94 : 0;
    const maximum = values.length ? Math.max(...values) * 1.06 : 1;
    const range = Math.max(maximum - minimum, 1);
    const x = (index: number) => 34 + (index / Math.max(values.length - 1, 1)) * 254;
    const y = (value: number) => 164 - ((value - minimum) / range) * 123;
    const actualPoints = actual.map((item, index) => ({
      x: x(index),
      y: y(item.value),
      value: item.value,
      label: item.asOf,
    }));
    const forecastPoints = forecastValues.map((item, index) => ({
      x: x(actual.length + index),
      y: y(item.predicted_freight_rate_usd_mt),
      value: item.predicted_freight_rate_usd_mt,
      label: `${item.forecast_days} days`,
    }));
    const actualPath = actualPoints.map((point) => `${point.x},${point.y}`).join(' ');
    const forecastPath =
      actualPoints.length && forecastPoints.length
        ? `${actualPoints[actualPoints.length - 1].x},${actualPoints[actualPoints.length - 1].y} ${forecastPoints.map((point) => `${point.x},${point.y}`).join(' ')}`
        : '';
    return {
      actual,
      actualPath,
      forecastPath,
      points: forecastPoints,
      maxValue: maximum,
      minValue: minimum,
    };
  }, [forecast, observations]);

  if (!actual.length) {
    return (
      <div className="mt-4 grid h-48 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500">
        No matching market observations are loaded for this vessel class yet.
      </div>
    );
  }

  return (
    <div className="mt-3">
      <svg
        viewBox="0 0 320 212"
        className="h-48 w-full"
        aria-label="Historical market rate and CatBoost forecast"
      >
        {[42, 82, 122, 164].map((y) => (
          <line key={y} x1="34" y1={y} x2="288" y2={y} stroke="#e5edf6" />
        ))}
        <text x="2" y="46" fill="#73849a" fontSize="10">
          {maxValue.toFixed(1)}
        </text>
        <text x="2" y="168" fill="#73849a" fontSize="10">
          {minValue.toFixed(1)}
        </text>
        <polyline
          points={actualPath}
          fill="none"
          stroke="#0879df"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {forecastPath ? (
          <polyline
            points={forecastPath}
            fill="none"
            stroke="#18a871"
            strokeWidth="3"
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r={forecast?.forecast[index]?.forecast_days === activeHorizon ? 5 : 3.3}
            fill="white"
            stroke="#18a871"
            strokeWidth="2.5"
          />
        ))}
        <text x="34" y="190" fill="#73849a" fontSize="10">
          Historical observations
        </text>
        <text x="205" y="190" fill="#73849a" fontSize="10">
          14 / 30 / 60d
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
        <span>
          <i className="mr-1 inline-block h-0.5 w-4 bg-[#0879df] align-middle" />
          Observed market rate
        </span>
        <span>
          <i className="mr-1 inline-block h-0.5 w-4 border-t-2 border-dashed border-emerald-500 align-middle" />
          CatBoost forecast
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const portsQuery = useMaritimePorts({ limit: 100 });
  const vesselsQuery = useMaritimeVessels({ limit: 2000 });
  const latestForecastQuery = useLatestMaritimeForecastRun();
  const [horizon, setHorizon] = useState<number>(30);
  const [selectedVesselId, setSelectedVesselId] = useState<string>();

  const ports = portsQuery.data ?? [];
  const vessels = vesselsQuery.data?.items ?? [];
  const forecast = latestForecastQuery.data ?? null;
  const selectedVessel = vessels.find((vessel) => vessel.id === selectedVesselId);
  const vesselTrackQuery = useMaritimeVesselTrack(selectedVesselId);
  const vesselClass = forecast?.vesselClass ?? 'PANAMAX';
  const marketFrom = useMemo(() => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), []);
  const marketQuery = useMaritimeMarketObservations({
    cargoType: marketCargoForSeries(forecast?.cargoType ?? 'Thermal coal'),
    vesselClass,
    rateType: 'SPOT',
    unit: 'USD_PER_MT',
    from: marketFrom,
  });

  useEffect(() => {
    if (selectedVesselId || !vessels.length) return;
    setSelectedVesselId(
      vessels.find((vessel) => vessel.position?.navigationStatus === 'UNDER_WAY')?.id ??
        vessels.find((vessel) => vessel.position)?.id,
    );
  }, [selectedVesselId, vessels]);

  const observations = marketQuery.data ?? [];
  const latestMarket = useMemo(
    () =>
      [...observations].sort(
        (left, right) => new Date(right.asOf).getTime() - new Date(left.asOf).getTime(),
      )[0],
    [observations],
  );
  const selectedForecast =
    forecast?.forecast.find((item) => item.forecast_days === horizon) ?? forecast?.forecast[0];
  const forecastWarnings = forecast?.warnings ?? [];
  const underway = vessels.filter((vessel) => vessel.position?.navigationStatus === 'UNDER_WAY');
  const reportingPorts = ports.filter((port) => Boolean(port.observation));
  const operationalPorts = ports.filter((port) => port.operationalStatus === 'OPERATIONAL');
  const indiaPorts = ports.filter((port) => port.country === 'India').slice(0, 6);
  const visibleVessels = [...vessels]
    .filter((vessel) => vessel.position)
    .sort(
      (left, right) =>
        new Date(right.position!.observedAt).getTime() -
        new Date(left.position!.observedAt).getTime(),
    )
    .slice(0, 5);
  const vesselSource =
    selectedVessel?.position?.source ?? vessels.find((vessel) => vessel.position)?.position?.source;
  const mapIsEstimated =
    selectedVessel?.position?.isEstimated ??
    vessels.find((vessel) => vessel.position)?.position?.isEstimated;

  return (
    <section className="space-y-4 pb-6">
      <header className="relative overflow-hidden rounded-2xl border border-sky-100 bg-[linear-gradient(100deg,#ffffff_0%,#f4fbff_58%,#dff3fb_100%)] px-6 py-6 shadow-sm sm:px-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700">
            SeaNexus command centre
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#0b2b5c] sm:text-4xl">
            From data to decisions
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Current vessel activity, port operations and model-driven chartering decisions for
            India’s East Coast.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
              ◒ Vessel positions refresh every minute
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
              ◉ Port and market source status is visible
            </span>
          </div>
        </div>
        <div className="absolute -right-4 bottom-0 hidden h-48 w-[42%] bg-[radial-gradient(ellipse_at_72%_90%,#1675a5_0%,#0e4e75_32%,transparent_33%),linear-gradient(180deg,transparent_35%,rgba(2,132,199,.2)_36%,rgba(2,132,199,.13)_100%)] lg:block">
          <div className="absolute bottom-10 right-20 h-14 w-60 rounded-t-[60%] bg-[#173c63] shadow-2xl">
            <div className="absolute -top-12 right-14 h-14 w-20 rounded-t bg-slate-700" />
            <div className="absolute -top-[74px] right-20 h-9 w-3 bg-slate-600" />
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current market rate"
          value={formatRate(latestMarket?.value)}
          detail={
            latestMarket
              ? `${latestMarket.cargoType} · ${vesselClassLabel(vesselClass)}`
              : 'No matching observation'
          }
          tone="sky"
          source={
            latestMarket ? sourceLabel(latestMarket.source, latestMarket.isEstimated) : undefined
          }
        />
        <MetricCard
          label="Tracked vessels"
          value={vesselsQuery.isLoading ? '—' : String(vessels.length)}
          detail={`${underway.length} currently under way`}
          tone="blue"
          source={vesselSource ? sourceLabel(vesselSource, mapIsEstimated) : undefined}
        />
        <MetricCard
          label="Port reporting"
          value={portsQuery.isLoading ? '—' : `${reportingPorts.length}/${ports.length}`}
          detail={`${operationalPorts.length} operational`}
          tone="emerald"
          source={
            reportingPorts[0]?.observation
              ? sourceLabel(
                  reportingPorts[0].observation.source,
                  reportingPorts[0].observation.isEstimated,
                )
              : undefined
          }
        />
        <MetricCard
          label="Model outlook"
          value={selectedForecast ? selectedForecast.direction : 'Awaiting run'}
          detail={
            selectedForecast
              ? `${Math.abs(selectedForecast.change_percent).toFixed(1)}% over ${horizon} days`
              : 'Use Freight Forecast to create one'
          }
          tone={
            selectedForecast?.change_usd_mt && selectedForecast.change_usd_mt > 0
              ? 'amber'
              : 'emerald'
          }
          source={forecast ? sourceLabel(forecast.source.model) : 'No saved model run'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[292px_minmax(0,1fr)_280px]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0b2b5c]">Forecast status</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Home only displays saved model output.
              </p>
            </div>
            <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
              CatBoost
            </span>
          </div>
          {latestForecastQuery.isLoading ? (
            <div className="mt-6 grid h-52 place-items-center text-sm text-slate-500">
              Loading latest forecast…
            </div>
          ) : forecast ? (
            <>
              <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  Latest completed run
                </p>
                <p className="mt-1 text-lg font-bold text-[#0b2b5c]">
                  {forecast.cargoType} · {vesselClassLabel(forecast.vesselClass)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Saved {formatTimestamp(forecast.createdAt)}
                </p>
              </div>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Display horizon
                <select
                  value={horizon}
                  onChange={(event) => setHorizon(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-medium text-slate-800"
                >
                  {horizonOptions.map((days) => (
                    <option key={days} value={days}>
                      {days} days
                    </option>
                  ))}
                </select>
              </label>
              <dl className="mt-4 space-y-3">
                <RecommendationRow label="Model" value={sourceLabel(forecast.source.model)} />
                <RecommendationRow
                  label="Input quality"
                  value={forecast.qualityStatus.toLowerCase()}
                />
              </dl>
              <button
                type="button"
                onClick={() => navigate('/freight-forecast')}
                className="mt-4 w-full rounded-lg border border-sky-200 bg-white py-2.5 text-sm font-bold text-sky-700"
              >
                Open forecast workspace →
              </button>
            </>
          ) : (
            <>
              <div className="mt-5 rounded-lg border border-dashed border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-600">
                No completed forecast exists yet. Forecasting is intentionally available only in the
                Freight Forecast workspace.
              </div>
              <button
                type="button"
                onClick={() => navigate('/freight-forecast')}
                className="mt-4 w-full rounded-lg bg-[#0879df] py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0668c1]"
              >
                Run Freight Forecast →
              </button>
            </>
          )}
        </article>

        <article className="relative min-h-[470px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-32px)] items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#0b2b5c]">Live vessel activity</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {vessels.length} mapped positions · {sourceLabel(vesselSource, mapIsEstimated)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/vessel-tracking')}
              className="shrink-0 text-xs font-bold text-sky-700"
            >
              Open tracking →
            </button>
          </div>
          {vesselsQuery.isLoading ? (
            <div className="grid h-[470px] place-items-center text-sm text-slate-500">
              Loading vessel positions…
            </div>
          ) : vessels.length ? (
            <MaritimeVesselMap
              vessels={vessels}
              selectedVesselId={selectedVesselId}
              selectedTrack={vesselTrackQuery.data?.points}
              onSelect={setSelectedVesselId}
            />
          ) : (
            <div className="grid h-[470px] place-items-center px-8 text-center text-sm text-slate-500">
              No vessel positions are available. Configure an AIS provider or import vessel-position
              data to populate this map.
            </div>
          )}
          {selectedVessel ? (
            <div className="absolute bottom-4 left-4 z-10 max-w-[calc(100%-32px)] rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm">
              <div className="flex gap-3">
                <span
                  className={`mt-1 text-xs ${statusTone(selectedVessel.position?.navigationStatus)}`}
                >
                  ●
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedVessel.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {vesselClassLabel(selectedVessel.vesselClass)} ·{' '}
                    {selectedVessel.position?.navigationStatus.replace('_', ' ').toLowerCase()} ·
                    updated {formatTimestamp(selectedVessel.position?.observedAt)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-sky-100 bg-[linear-gradient(160deg,#fff_0%,#f0fbf7_100%)] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-sky-700">
              ✦
            </span>
            <div>
              <h2 className="font-bold text-[#0b2b5c]">Charter recommendation</h2>
              <p className="text-xs text-slate-500">Saved output from Freight Forecast</p>
            </div>
          </div>
          {selectedForecast ? (
            <>
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-sm font-bold text-emerald-800">
                  {selectedForecast.change_usd_mt > 0
                    ? 'Secure the charter early'
                    : 'Review the later entry window'}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  {selectedForecast.direction} of{' '}
                  {Math.abs(selectedForecast.change_percent).toFixed(1)}% projected at the {horizon}
                  -day horizon.
                </p>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <RecommendationRow label="Vessel class" value={vesselClassLabel(vesselClass)} />
                <RecommendationRow
                  label="Model rate"
                  value={formatRate(selectedForecast.predicted_freight_rate_usd_mt)}
                />
                <RecommendationRow
                  label="Current rate"
                  value={formatRate(forecast?.currentRateUsdMt)}
                />
                <RecommendationRow
                  label="Market input"
                  value={sourceLabel(forecast?.source.rate)}
                />
              </dl>
              {forecastWarnings.length ? (
                <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">
                  {forecastWarnings[0]}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/freight-forecast')}
                className="mt-4 w-full rounded-lg border border-sky-200 bg-white py-2.5 text-sm font-bold text-sky-700"
              >
                View forecast details →
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-600">
              No recommendation is shown until a model run is completed in Freight Forecast.
            </div>
          )}
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr_.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0b2b5c]">Freight rate trend</h2>
              <p className="text-xs text-slate-500">
                Observed market inputs and the latest model run
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/freight-forecast')}
              className="text-xs font-bold text-sky-700"
            >
              Full forecast →
            </button>
          </div>
          <RateTrendChart observations={observations} forecast={forecast} activeHorizon={horizon} />
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0b2b5c]">Recently tracked vessels</h2>
              <p className="text-xs text-slate-500">Latest stored positions</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/vessel-tracking')}
              className="text-xs font-bold text-sky-700"
            >
              All vessels →
            </button>
          </div>
          <div className="mt-2 divide-y divide-slate-100">
            {visibleVessels.length ? (
              visibleVessels.map((vessel) => (
                <button
                  type="button"
                  key={vessel.id}
                  onClick={() => setSelectedVesselId(vessel.id)}
                  className="grid w-full grid-cols-[minmax(0,1.25fr)_0.75fr_0.9fr] gap-2 py-2.5 text-left text-xs hover:bg-sky-50"
                >
                  <span>
                    <b className="block truncate text-slate-800">{vessel.name}</b>
                    <span className="text-slate-500">{vesselClassLabel(vessel.vesselClass)}</span>
                  </span>
                  <span className={statusTone(vessel.position?.navigationStatus)}>
                    ● {vessel.position?.navigationStatus.replace('_', ' ').toLowerCase()}
                  </span>
                  <span className="text-right text-slate-500">
                    {formatTimestamp(vessel.position?.observedAt)}
                  </span>
                </button>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No vessel positions are stored.
              </p>
            )}
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0b2b5c]">Key East Coast ports</h2>
              <p className="text-xs text-slate-500">Latest port observations</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ports')}
              className="text-xs font-bold text-sky-700"
            >
              Port intelligence →
            </button>
          </div>
          <div className="mt-2 divide-y divide-slate-100">
            {indiaPorts.length ? (
              indiaPorts.map((port) => (
                <button
                  type="button"
                  key={port.id}
                  onClick={() => navigate('/ports')}
                  className="grid w-full grid-cols-[1fr_.9fr_.7fr] gap-2 py-2.5 text-left text-xs hover:bg-sky-50"
                >
                  <b className="text-slate-800">{port.name}</b>
                  <span className={statusTone(port.observation?.congestionLevel)}>
                    {port.observation
                      ? `● ${port.observation.congestionLevel.toLowerCase()}`
                      : '● unavailable'}
                  </span>
                  <span className="text-right text-slate-500">
                    {port.observation?.averageWaitDays !== null &&
                    port.observation?.averageWaitDays !== undefined
                      ? `${port.observation.averageWaitDays.toFixed(1)}d wait`
                      : 'No wait data'}
                  </span>
                </button>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No Indian port records are stored.
              </p>
            )}
          </div>
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 shadow-sm">
        <span>
          Data updates automatically while this page is open: vessel positions every minute; ports
          every 5 minutes; market observations every 15 minutes.
        </span>
        <span className="font-medium text-slate-600">
          Latest market observation: {formatTimestamp(latestMarket?.asOf)}
        </span>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  source,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'sky' | 'blue' | 'emerald' | 'amber';
  source?: string;
}) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <b className="mt-1 block text-xl text-[#0b2b5c]">{value}</b>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-full text-sm ${tones[tone]}`}>
          ◌
        </span>
      </div>
      {source ? (
        <p className="mt-2 truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {source}
        </p>
      ) : null}
    </article>
  );
}

function RecommendationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 pb-2.5 last:border-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-bold text-slate-800" title={value}>
        {value}
      </dd>
    </div>
  );
}
