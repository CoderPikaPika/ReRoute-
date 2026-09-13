import { useState, type ReactNode } from 'react';

type Region = {
  id: string;
  flag: string;
  name: string;
  description: string;
  exports: string;
  ports: string;
  freightRate: string;
  commodities: string;
};

const regions: Region[] = [
  { id: 'australia', flag: '🇦🇺', name: 'Australia', description: 'Key Coal Supplier', exports: '412 Mt', ports: 'Newcastle, Hay Point, Gladstone, Abbot Point', freightRate: '$18,400 / day', commodities: 'Thermal Coal, Metallurgical Coal, LNG' },
  { id: 'us', flag: '🇺🇸', name: 'US', description: 'Growing Demand', exports: '218 Mt', ports: 'New Orleans, Baltimore, Norfolk', freightRate: '$19,100 / day', commodities: 'Coal, Grain, Pet Coke' },
  { id: 'mozambique', flag: '🇲🇿', name: 'Mozambique', description: 'Emerging Supplier', exports: '56 Mt', ports: 'Maputo, Beira, Nacala', freightRate: '$17,600 / day', commodities: 'Metallurgical Coal, LNG' },
  { id: 'russia', flag: '🇷🇺', name: 'Russia', description: 'Competitive Supply', exports: '334 Mt', ports: 'Vostochny, Nakhodka, Murmansk', freightRate: '$16,900 / day', commodities: 'Thermal Coal, Fertilizer' },
  { id: 'indonesia', flag: '🇮🇩', name: 'Indonesia', description: 'Thermal Coal & Nickel', exports: '508 Mt', ports: 'Samarinda, Balikpapan, Tarahan', freightRate: '$17,200 / day', commodities: 'Thermal Coal, Nickel' },
];

const developments = [
  ['bg-emerald-500', 'Australia increases coal export guidance for 2026', '12 Sep 2026'],
  ['bg-rose-500', 'Labor action risk at Newcastle port', '10 Sep 2026'],
  ['bg-emerald-500', 'Strong Indian demand expected in Q4', '08 Sep 2026'],
  ['bg-amber-400', 'Cyclone season watch (Eastern Australia)', '06 Sep 2026'],
  ['bg-blue-500', 'New environmental regulations under review', '03 Sep 2026'],
];

const drivers = [
  ['⌂', 'Chinese demand', 'High', 'text-emerald-600'],
  ['♜', 'Indian coal imports', 'High', 'text-emerald-600'],
  ['▥', 'Australian production', 'Stable', 'text-[#46627f]'],
  ['♧', 'Freight rate volatility', 'Moderate', 'text-amber-600'],
  ['☼', 'Weather disruptions', 'Low', 'text-[#46627f]'],
];

export function MarketIntelligencePage() {
  const [selectedId, setSelectedId] = useState('australia');
  const [range, setRange] = useState('Sep 2025 – Sep 2026');
  const [compareMessage, setCompareMessage] = useState(false);
  const selected = regions.find((region) => region.id === selectedId) ?? regions[0];

  function exportReport(): void {
    const report = [
      ['SeaNexus market intelligence report'],
      ['Region', selected.name],
      ['Period', range],
      ['Exports', selected.exports],
      ['Indicative freight', selected.freightRate],
      ['Note', 'Prototype market-feed placeholder'],
    ].map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `seanexus-${selected.id}-market-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-3 text-[#17345d]">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">MARKET INTELLIGENCE</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Global Insights. Local Advantage.</h1>
          <p className="mt-1 text-[17px] text-[#55708e]">Track supply, demand, trade flows and geopolitical developments to make informed chartering decisions.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <select className="h-10 rounded-md border border-[#d8e6ef] bg-white px-4 text-xs font-semibold text-[#385573] shadow-sm transition hover:border-[#a8cde7]" onChange={(event) => setRange(event.target.value)} value={range}>
            <option>Sep 2025 – Sep 2026</option><option>Last 6 months</option><option>Last 3 years</option>
          </select>
          <button className="h-10 rounded-md border border-[#cde2f1] bg-[#edf8ff] px-4 text-xs font-bold text-[#176fbf] shadow-sm transition hover:bg-[#dff2ff]" onClick={exportReport} type="button">⇩ Export Report</button>
        </div>
      </header>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
        {regions.map((region) => (
          <button className={`flex items-center gap-3 overflow-hidden rounded-lg border px-3 text-left ${region.id === selected.id ? 'border-[#0b7bdd] bg-[#edf8ff]' : 'border-[#dceaf2] bg-white'}`} key={region.id} onClick={() => setSelectedId(region.id)} style={{ height: 74 }} type="button">
            <span className="grid h-10 w-12 shrink-0 place-items-center rounded bg-[#f3f8fc] text-2xl">{region.flag}</span>
            <span className="min-w-0"><b className="block truncate text-sm text-[#20466f]">{region.name}</b><small className="mt-1 block truncate text-[11px] text-[#617b95]">{region.description}</small></span>
          </button>
        ))}
        <button className="flex items-center justify-center gap-3 rounded-lg border border-[#dceaf2] bg-white text-sm font-bold text-[#1772c2]" onClick={() => setCompareMessage((value) => !value)} style={{ height: 74 }} type="button">▥ Compare Regions</button>
      </div>
      {compareMessage ? <p className="rounded-md border border-[#cfe3f0] bg-[#f5fbff] px-3 py-2 text-xs text-[#46627f]">Comparison is a placeholder until a multi-region market-data source is connected.</p> : null}

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.38fr .92fr 1fr', height: 264 }}>
        <Panel title={`${selected.name} Market Overview`}>
          <div className="grid gap-4" style={{ gridTemplateColumns: '205px minmax(0, 1fr)' }}>
            <VisualPlaceholder label="Market image placeholder" />
            <div className="text-xs" style={{ display: 'grid', gap: 4 }}>
              <OverviewLine icon="♜" label="Coal Exports (2025 YTD)" value={selected.exports} trend="▲ +6.8% YoY" />
              <OverviewLine icon="♧" label="Major Export Ports" value={selected.ports} />
              <OverviewLine icon="↗" label="Avg. Freight Rate to India" value={selected.freightRate} trend="▲ +12% vs last quarter" />
              <OverviewLine icon="▣" label="Key Commodities" value={selected.commodities} />
            </div>
          </div>
        </Panel>
        <Panel title={`Export Volume Trend (${selected.name} → India)`} subtitle="Million Tonnes">
          <ExportChart />
          <Legend items={[['■', 'Actual', 'text-[#176bb9]'], ['■', 'Forecast', 'text-[#a8cff0]']]} />
        </Panel>
        <Panel title={`Freight Rate Trend (${selected.name} → India)`} subtitle="USD / day">
          <FreightChart />
          <Legend items={[['━', 'Historical Rate', 'text-[#1479d6]'], ['┄', 'Forecast', 'text-[#58728c]'], ['━', 'Confidence Band', 'text-[#8cbed6]']]} />
        </Panel>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.28fr .91fr 1fr', height: 226 }}>
        <Panel title="Supply vs Demand Outlook" subtitle="Million Tonnes"><SupplyChart /><Legend items={[['━', 'Supply', 'text-[#1479d6]'], ['━', 'Demand', 'text-[#15a674]']]} /></Panel>
        <Panel title="Key Market Drivers"><div className="mt-1 divide-y divide-[#e8f0f4]">{drivers.map(([icon, label, impact, tone]) => <div className="grid items-center gap-2 text-xs" key={label} style={{ gridTemplateColumns: '25px minmax(0, 1fr) auto', padding: '5px 0' }}><span className="grid h-6 w-6 place-items-center rounded-full bg-[#eef7ff] text-[#1978cb]">{icon}</span><span className="text-[#4c6682]">{label}</span><b className={tone}>↗ {impact}</b></div>)}</div></Panel>
        <Panel title="Recent Developments" action="View All →"><div className="mt-1 divide-y divide-[#e8f0f4]">{developments.map(([dot, headline, date]) => <div className="grid gap-2 text-xs" key={headline} style={{ gridTemplateColumns: '11px minmax(0, 1fr) 70px', padding: '5px 0' }}><i className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} /><span className="text-[#4e6885]">{headline}</span><time className="text-right text-[10px] text-slate-400">{date}</time></div>)}</div></Panel>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.25fr 1fr .93fr', height: 214 }}>
        <Panel title={`Top Trade Routes from ${selected.name}`}>
          <table className="mt-2 w-full text-left text-[10px]"><thead className="border-y border-[#e7eff4] text-[#6b8299]"><tr><th className="py-2">ROUTE</th><th>AVG. RATE<br />(USD/day)</th><th>AVG. DURATION<br />(days)</th><th>DEMAND TREND</th></tr></thead><tbody>{[['Newcastle → Paradip', '18,200', '19 – 21', 'High'], ['Hay Point → Vizag', '17,800', '18 – 20', 'High'], ['Gladstone → Dhamra', '19,100', '20 – 23', 'Moderate'], ['Abbot Point → Haldia', '20,300', '21 – 24', 'Moderate']].map(([route, rate, duration, trend]) => <tr className="border-b border-[#edf2f5] text-[#48637e]" key={route}><td className="py-2 font-medium">{route}</td><td>{rate}</td><td>{duration}</td><td className={trend === 'High' ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>● {trend}</td></tr>)}</tbody></table>
        </Panel>
        <Panel title={`Commodity Breakdown (${selected.name} Exports)`}><div className="mt-3 flex items-center gap-5"><CommodityDonut /><div className="space-y-3 text-[11px] text-[#4e6885]"><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#174d8b]" />Thermal Coal <b className="ml-5">68%</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#318bdf]" />Metallurgical Coal <b className="ml-5">22%</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-400" />LNG <b className="ml-5">6%</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-400" />Others <b className="ml-5">4%</b></p></div></div></Panel>
        <Panel title="Market Sentiment"><div className="grid place-items-center pt-2"><SentimentGauge /><b className="mt-2 text-lg text-[#13815d]">Bullish</b><p className="mt-1 text-center text-xs leading-5 text-[#59728a]">Strong demand and stable supply<br />outlook for next 6 months</p></div></Panel>
      </div>
    </section>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: string; children: ReactNode }) {
  return <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm ring-1 ring-[#f4f9fc]" style={{ height: '100%', minWidth: 0 }}><div className="flex items-start justify-between gap-2"><div><h2 className="text-base font-extrabold text-[#153a70]">{title}</h2>{subtitle ? <p className="mt-1 text-[10px] text-[#617b94]">{subtitle}</p> : null}</div>{action ? <button className="text-xs font-bold text-[#0f75cb] transition hover:text-[#095da6]" type="button">{action}</button> : null}</div>{children}</article>;
}

function VisualPlaceholder({ label }: { label: string }) { return <div className="grid place-items-center rounded-lg text-center shadow-inner" style={{ background: 'linear-gradient(145deg, #d7b28c 0%, #7e9eab 45%, #24587d 100%)', height: 199 }}><span><b className="block text-4xl text-white">⚓</b><small className="mt-2 block rounded bg-white/80 px-2 py-1 text-[10px] text-[#294a6b]">{label}</small></span></div>; }
function OverviewLine({ icon, label, value, trend }: { icon: string; label: string; value: string; trend?: string }) { return <div className="grid gap-2" style={{ gridTemplateColumns: '28px minmax(0, 1fr)', minHeight: 42 }}><span className="grid h-6 w-6 place-items-center rounded-full bg-[#eef7ff] text-[#1978cb]">{icon}</span><span className="min-w-0"><small className="block text-[9px] leading-3 text-[#607991]">{label}</small><b className="block truncate text-[11px] leading-4 text-[#244a73]">{value}</b>{trend ? <em className="not-italic text-[9px] font-bold text-emerald-600">{trend}</em> : null}</span></div>; }
function Legend({ items }: { items: Array<[string, string, string]> }) { return <div className="mt-1 flex justify-center gap-4 text-[10px]">{items.map(([symbol, label, tone]) => <span className={tone} key={label}>{symbol} {label}</span>)}</div>; }
function ExportChart() { return <svg aria-label="Export volume placeholder chart" className="mt-2 w-full" style={{ height: 157 }} viewBox="0 0 310 170" preserveAspectRatio="none"><ChartGrid /><g>{[71,79,82,87,100,107,117,132,145].map((height,index) => <rect fill={index > 6 ? '#a8cff0' : '#176bb9'} height={height} key={index} rx="3" width="17" x={28 + index * 29} y={151 - height} />)}</g><ChartMonths /></svg>; }
function FreightChart() { return <svg aria-label="Freight rate placeholder chart" className="mt-2 w-full" style={{ height: 157 }} viewBox="0 0 310 170" preserveAspectRatio="none"><ChartGrid /><path d="M20 48 L55 62 L90 71 L125 77 L160 82" fill="none" stroke="#1479d6" strokeWidth="3" /><path d="M160 82 C202 81 240 75 290 66" fill="none" stroke="#1479d6" strokeDasharray="7 6" strokeWidth="3" /><path d="M160 70 C202 76 240 63 290 46 L290 99 C240 111 202 101 160 96Z" fill="#bde2e7" opacity=".55" /><circle cx="290" cy="66" fill="#1479d6" r="4" /><ChartMonths /></svg>; }
function SupplyChart() { return <svg aria-label="Supply demand placeholder chart" className="mt-2 w-full" style={{ height: 124 }} viewBox="0 0 440 150" preserveAspectRatio="none"><g stroke="#e4edf3">{[20,50,80,110,140].map((y) => <line key={y} x1="28" x2="425" y1={y} y2={y} />)}</g><rect fill="#e0f6ee" height="120" width="74" x="351" y="20" /><path d="M28 87 L93 76 L158 70 L223 68 L288 62 L353 49 L420 45" fill="none" stroke="#1479d6" strokeWidth="3" /><path d="M28 101 L93 91 L158 86 L223 80 L288 76 L353 70 L420 65" fill="none" stroke="#15a674" strokeWidth="3" />{['2023','2024','2025','2026','2027'].map((year,index) => <text fill="#71879c" fontSize="10" key={year} x={27 + index * 98} y="149">{year}</text>)}</svg>; }
function ChartGrid() { return <g stroke="#e4edf3">{[18,50,82,114,146].map((y) => <line key={y} x1="20" x2="300" y1={y} y2={y} />)}</g>; }
function ChartMonths() { return <g>{['Jan','Mar','May','Jul','Sep'].map((month,index) => <text fill="#71879c" fontSize="9" key={month} x={20 + index * 67} y="168">{month}</text>)}</g>; }
function CommodityDonut() { return <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: 'conic-gradient(#174d8b 0 68%,#318bdf 68% 90%,#f6a12a 90% 96%,#9aacbf 96% 100%)' }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><b className="text-xl text-[#173b70]">412 Mt</b><small className="-mt-1 text-[10px] text-slate-500">Total</small></div></div>; }
function SentimentGauge() { return <svg aria-label="Bullish market sentiment" height="74" viewBox="0 0 160 80" width="160"><path d="M20 70 A60 60 0 0 1 140 70" fill="none" stroke="#e7eff4" strokeWidth="14" /><path d="M20 70 A60 60 0 0 1 54 18" fill="none" stroke="#f05a55" strokeWidth="14" /><path d="M54 18 A60 60 0 0 1 96 12" fill="none" stroke="#ffb52b" strokeWidth="14" /><path d="M96 12 A60 60 0 0 1 140 70" fill="none" stroke="#16aa70" strokeWidth="14" /><line stroke="#173b70" strokeLinecap="round" strokeWidth="4" x1="80" x2="113" y1="70" y2="31" /><circle cx="80" cy="70" fill="#173b70" r="6" /></svg>; }
