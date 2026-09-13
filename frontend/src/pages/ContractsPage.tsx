import { useState, type ReactNode } from 'react';

type ContractKind = 'Spot Charter' | 'Short-term (3–6 months)' | 'Medium-term (6–12 months)' | 'Long-term (1+ years)';

const options: Array<{ label: ContractKind; short: string; rate: number }> = [
  { label: 'Spot Charter', short: 'Spot', rate: 22500 },
  { label: 'Short-term (3–6 months)', short: 'Short-term', rate: 18200 },
  { label: 'Medium-term (6–12 months)', short: 'Medium-term', rate: 16400 },
  { label: 'Long-term (1+ years)', short: 'Long-term', rate: 15800 },
];

const vessels = [
  { id: 'ocean', name: 'MV Ocean Pride', type: 'Panamax', dwt: '82,341', availability: 'Available', rate: 16400, tone: 'text-emerald-600' },
  { id: 'cape', name: 'Cape Harmony', type: 'Capesize', dwt: '180,000', availability: 'Available', rate: 18200, tone: 'text-emerald-600' },
  { id: 'eastern', name: 'Eastern Star', type: 'Supramax', dwt: '56,743', availability: 'In 5 days', rate: 17800, tone: 'text-amber-600' },
  { id: 'voyager', name: 'Sea Voyager', type: 'Handysize', dwt: '32,500', availability: 'Available', rate: 19100, tone: 'text-emerald-600' },
];

export function ContractsPage() {
  const [comparison, setComparison] = useState<ContractKind>('Medium-term (6–12 months)');
  const [current, setCurrent] = useState<ContractKind>('Spot Charter');
  const [months, setMonths] = useState(6);
  const [selectedVessel, setSelectedVessel] = useState('ocean');
  const [saved, setSaved] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const currentRate = options.find((item) => item.label === current)?.rate ?? 22500;
  const selectedRate = options.find((item) => item.label === comparison)?.rate ?? 16400;
  const savings = Math.max(0, (currentRate - selectedRate) * 20 * months);
  const savingsPercent = Math.round((1 - selectedRate / currentRate) * 100);

  return (
    <section className="w-full space-y-3 text-[#17345d]">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[.25em] text-[#617a96]">CONTRACT OPTIMIZER</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12396e] sm:text-4xl">Smarter Contracts, Greater Value.</h1>
          <p className="mt-1 text-base text-[#55708e]">Compare chartering options and find the most cost-effective contract for your cargo and route.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button className={`rounded-md border px-4 py-3 text-xs font-bold shadow-sm ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d5e4ee] bg-white text-[#24527c]'}`} onClick={() => setSaved((value) => !value)} type="button">▣ {saved ? 'Scenario Saved' : 'Saved Scenarios'}</button>
          <button className="rounded-md bg-[#0873dc] px-5 py-3 text-xs font-bold text-white shadow-sm" onClick={() => { setComparison('Medium-term (6–12 months)'); setSelectedVessel('ocean'); }} type="button">＋ New Analysis</button>
        </div>
      </header>

      <form className="grid gap-3 rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm" style={{ gridTemplateColumns: '.8fr 1.35fr .8fr .8fr auto' }} onSubmit={(event) => { event.preventDefault(); setComparison('Medium-term (6–12 months)'); }}>
        <SelectField label="Cargo Type"><select defaultValue="Coal"><option>Coal</option><option>Iron Ore</option><option>Pet Coke</option></select></SelectField>
        <SelectField label="Route"><select defaultValue="Hay Point (AUS) → Paradip (IND)"><option>Hay Point (AUS) → Paradip (IND)</option><option>Gladstone (AUS) → Vizag (IND)</option><option>Newcastle (AUS) → Dhamra (IND)</option></select></SelectField>
        <SelectField label="Vessel Type"><select defaultValue="Panamax"><option>Panamax</option><option>Supramax</option><option>Capesize</option><option>Handysize</option></select></SelectField>
        <SelectField label="Contract Duration"><select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select></SelectField>
        <button className="mt-auto rounded-md bg-[#0873dc] px-6 py-3 text-sm font-bold text-white shadow-sm" type="submit">Optimize Contract →</button>
      </form>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1.18fr .88fr .95fr' }}>
        <article className="rounded-xl border border-[#dceaf2] bg-white p-4 shadow-sm" style={{ minWidth: 0 }}>
          <h2 className="text-lg font-extrabold text-[#153a70]">Contract Options Comparison</h2>
          <p className="mt-1 text-[11px] text-[#617b94]">Estimated Cost per Day (USD)</p>
          <div className="mt-4 flex items-end justify-around border-b border-[#e5edf3] px-2" style={{ height: 172 }}>
            {options.map((option, index) => (
              <button className="group flex h-full w-1/5 flex-col items-center justify-end" key={option.label} onClick={() => setComparison(option.label)} type="button">
                <b className="mb-2 text-xs text-[#153a70]">${option.rate.toLocaleString()}</b>
                <i className={`relative block w-full max-w-16 rounded-t-md ${option.label === comparison ? 'bg-[#08ad73]' : index === 1 ? 'bg-[#1479d6]' : 'bg-[#62a9e8]'}`} style={{ height: option.rate / 225 }}>
                  {option.label === comparison ? <small className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#12a971] px-2 py-1 text-[9px] font-bold text-white">Recommended</small> : null}
                </i>
                <span className="mt-2 text-center text-[10px] font-semibold text-[#4e6885]">{option.short}<br />{index === 1 ? '(3–6 months)' : index === 2 ? '(6–12 months)' : index === 3 ? '(1+ years)' : ''}</span>
              </button>
            ))}
          </div>
        </article>

        <Card title="Key Insights">
          <div className="mt-3" style={{ display: 'grid', gap: 11 }}>
            {[
              ['↗', 'You can save ~27% by opting for a 6–12 month contract vs. spot.', 'bg-emerald-50 text-emerald-600'],
              ['◴', 'Freight rates are expected to rise by 12–18% in the next 3 months.', 'bg-sky-50 text-sky-600'],
              ['♧', 'Medium-term contracts provide the best balance of cost and flexibility.', 'bg-blue-50 text-blue-600'],
              ['♧', 'Securing now reduces exposure to seasonal volatility.', 'bg-emerald-50 text-emerald-600'],
            ].map(([icon, text, tone]) => <div className="flex gap-3" key={text}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${tone}`}>{icon}</span><p className="text-xs leading-5 text-[#4d6682]">{text}</p></div>)}
          </div>
        </Card>

        <article className="rounded-xl border border-[#dceaf2] bg-[linear-gradient(145deg,#f0fff8,#fff)] p-4 shadow-sm" style={{ minWidth: 0 }}>
          <div className="flex justify-between"><h2 className="text-lg font-extrabold text-[#153a70]">AI Recommendation</h2><span className="rounded bg-[#18ac74] px-2 py-1 text-[10px] font-bold text-white">Highest Value</span></div>
          <div className="mt-4 flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-600">✓</span><div><b className="text-sm text-[#127153]">Recommended: Medium-term Charter<br />(6–12 months)</b><p className="mt-2 text-xs leading-5 text-[#527468]">A medium-term contract offers the best value for this route under the current prototype market scenario.</p></div></div>
          <div className="mt-4 grid grid-cols-3 border-y border-emerald-100 py-3"><MetricBox value={`$${selectedRate.toLocaleString()}`} label="Est. Daily Rate" /><MetricBox value={`~${savingsPercent}%`} label="Cost Savings (vs. Spot)" green /><MetricBox value="High" label="Contract Stability" green /></div>
          <button className="mt-4 w-full rounded-md bg-[#10a66e] py-3 text-sm font-bold text-white shadow-sm" onClick={() => setShowAnalysis((open) => !open)} type="button">{showAnalysis ? 'Hide Detailed Analysis' : 'View Detailed Analysis'} →</button>
          {showAnalysis ? <p className="mt-3 rounded-md bg-white/80 p-3 text-xs leading-5 text-[#527468]">The expected contract window balances price certainty with flexibility. This is a prototype recommendation until live market data is connected.</p> : null}
        </article>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '.82fr 1.18fr .9fr' }}>
        <Card title="Cost Breakdown"><div className="mt-3 flex items-center gap-4"><Donut value={selectedRate} /><div className="space-y-3 text-[11px] text-[#4e6885]">{[['bg-[#1479d6]', 'Base Charter Rate', '68%'], ['bg-[#e84558]', 'Fuel Adjustment', '12%'], ['bg-[#c49b23]', 'Port Charges', '8%'], ['bg-[#f2a527]', 'Canal / Transit', '6%'], ['bg-[#718da9]', 'Others', '6%']].map(([color, label, percent]) => <p key={label}><i className={`mr-2 inline-block h-2 w-2 rounded-full ${color}`} />{label}<b className="ml-4">{percent}</b></p>)}</div></div></Card>
        <Card title="Rate Trend & Contract Window" subtitle="USD / day"><ContractTrend /></Card>
        <Card title="Market Factors" action="View All →"><div className="mt-2 divide-y divide-[#e8f0f4]">{[['↗', 'Rising coal demand from India', 'High Impact', 'text-emerald-600'], ['▣', 'Increased vessel delivery in Q4', 'Moderate', 'text-[#58708a]'], ['◉', 'Seasonal congestion at Paradip', 'Moderate', 'text-amber-600'], ['♧', 'Fuel prices expected to stabilize', 'Low', 'text-[#58708a]'], ['♧', 'Geopolitical stability in the region', 'Low', 'text-[#58708a]']].map(([icon, label, impact, tone]) => <div className="grid items-center gap-2 py-2 text-[11px]" key={label} style={{ gridTemplateColumns: '24px minmax(0,1fr) auto' }}><span className="grid h-6 w-6 place-items-center rounded-full bg-[#eef7ff] text-[#1978cb]">{icon}</span><span className="text-[#4c6682]">{label}</span><b className={tone}>{impact}</b></div>)}</div></Card>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr .95fr' }}>
        <Card title="Available Vessels for Contract" action="View All →"><div className="mt-2 overflow-hidden"><table className="w-full text-left text-[10px]"><thead className="border-y border-[#e4edf3] text-[#6c8298]"><tr>{['Vessel Name', 'Type', 'DWT', 'Availability', 'Est. Rate (USD/day)', 'Action'].map((label) => <th className="px-1.5 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{vessels.map((vessel) => <tr className={`border-b border-[#edf2f5] ${vessel.id === selectedVessel ? 'bg-[#f1f8ff]' : ''}`} key={vessel.id}><td className="px-1.5 py-2"><span className="flex items-center gap-2 font-bold text-[#36557a]">{shipThumb()}{vessel.name}</span></td><td>{vessel.type}</td><td>{vessel.dwt}</td><td className={`font-semibold ${vessel.tone}`}>● {vessel.availability}</td><td>{vessel.rate.toLocaleString()}</td><td><button className={`rounded border px-3 py-1 font-bold ${vessel.id === selectedVessel ? 'border-[#1479d6] bg-[#1479d6] text-white' : 'border-[#8cbde3] text-[#1372c6]'}`} onClick={() => setSelectedVessel(vessel.id)} type="button">{vessel.id === selectedVessel ? 'Selected' : 'Select'}</button></td></tr>)}</tbody></table></div></Card>
        <Card title="Savings Calculator"><div className="mt-3 grid gap-3" style={{ gridTemplateColumns: '1fr 1fr .9fr' }}><SelectField label="Current Option"><select value={current} onChange={(event) => setCurrent(event.target.value as ContractKind)}>{options.map((option) => <option key={option.label}>{option.label}</option>)}</select></SelectField><SelectField label="Compare With"><select value={comparison} onChange={(event) => setComparison(event.target.value as ContractKind)}>{options.map((option) => <option key={option.label}>{option.label}</option>)}</select></SelectField><div className="rounded-lg bg-[linear-gradient(145deg,#effff7,#fff)] p-3"><small className="text-[10px] text-[#55758a]">Estimated Savings</small><b className="mt-2 block text-2xl text-[#12825e]">${savings.toLocaleString()}</b><span className="text-[10px] text-[#55758a]">over {months} months</span></div></div><SelectField label="Contract Duration"><input max="24" min="1" onChange={(event) => setMonths(Number(event.target.value))} type="number" value={months} /></SelectField><p className="mt-4 text-[10px] text-[#667e95]">ⓘ Savings are estimates based on current market rates and may vary due to market conditions.</p></Card>
      </div>
    </section>
  );
}

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: string; children: ReactNode }) {
  return <article className="overflow-hidden rounded-xl border border-[#dceaf2] bg-white p-3 shadow-sm" style={{ minWidth: 0 }}><div className="flex justify-between gap-2"><div><h2 className="text-base font-extrabold text-[#153a70]">{title}</h2>{subtitle ? <p className="text-[10px] text-[#617b94]">{subtitle}</p> : null}</div>{action ? <button className="text-xs font-bold text-[#0f75cb]" type="button">{action}</button> : null}</div>{children}</article>;
}

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[11px] font-semibold text-[#58728d]">{label}<span className="mt-1 block [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-[#dbe8f0] [&_input]:bg-[#f8fbfd] [&_input]:px-3 [&_input]:py-2 [&_input]:text-xs [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-[#dbe8f0] [&_select]:bg-[#f8fbfd] [&_select]:px-3 [&_select]:py-2 [&_select]:text-xs">{children}</span></label>;
}

function MetricBox({ value, label, green }: { value: string; label: string; green?: boolean }) { return <div><b className={`block text-xl ${green ? 'text-[#168763]' : 'text-[#153a70]'}`}>{value}</b><small className="text-[10px] text-[#667d91]">{label}</small></div>; }
function shipThumb() { return <span className="grid h-7 w-8 place-items-center rounded bg-[linear-gradient(145deg,#c8e1ed,#376884)] text-sm">⚓</span>; }
function Donut({ value }: { value: number }) { return <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: 'conic-gradient(#1479d6 0 68%,#e84558 68% 80%,#c49b23 80% 88%,#f2a527 88% 94%,#718da9 94% 100%)' }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><b className="text-xl text-[#173b70]">${value.toLocaleString()}</b><small className="-mt-1 text-[10px] text-slate-500">/day</small></div></div>; }
function ContractTrend() { return <><svg aria-label="Contract rate trend" className="mt-2 w-full" style={{ height: 136 }} viewBox="0 0 430 140" preserveAspectRatio="none"><g stroke="#e6eef3">{[20, 48, 76, 104, 132].map((y) => <line key={y} x1="25" x2="420" y1={y} y2={y} />)}</g><rect fill="#d8f7e8" height="111" opacity=".7" width="60" x="315" y="20" /><path d="M25 42 L54 52 L83 61 L112 57 L141 68 L170 79 L199 76 L228 80 L257 75 L286 86" fill="none" stroke="#1479d6" strokeWidth="3" /><path d="M286 86 C320 94 344 67 370 64 S400 71 420 76" fill="none" stroke="#1479d6" strokeDasharray="7 6" strokeWidth="3" /><path d="M286 86 C315 82 340 55 365 55 S400 65 420 62" fill="none" stroke="#19a876" strokeDasharray="5 5" strokeWidth="2" />{['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((month, index) => <text fill="#71879c" fontSize="9" key={month} x={25 + index * 73} y="139">{month}</text>)}</svg><div className="flex justify-center gap-4 text-[10px] text-[#58728c]"><span>━ Historical Rate</span><span>┄ Forecast</span><span className="text-[#18a875]">━ Recommended Window</span></div></>; }
