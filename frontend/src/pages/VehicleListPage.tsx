import { Link } from 'react-router-dom';
import { useUpdateVehicle, useVehicles } from '../features/vehicles/hooks';

export function VehicleListPage() {
  const { data, isLoading } = useVehicles();
  const update = useUpdateVehicle();
  return <section><div className="flex justify-between gap-4"><div><p className="text-sm font-semibold text-cyan-700">TRANSPORTER FLEET</p><h1 className="text-3xl font-bold">Vehicles</h1></div><Link className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white" to="/vehicles/create">Add vehicle</Link></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2">{isLoading ? <p>Loading fleet…</p> : null}{data?.length === 0 ? <p className="rounded-xl bg-white p-6">No vehicles added yet.</p> : null}{data?.map(v => <article className="rounded-xl border border-slate-200 bg-white p-5" key={v.id}><div className="flex justify-between"><h2 className="font-bold">{v.registrationNumber}</h2><span className={'rounded-full px-2 py-1 text-xs font-bold ' + (v.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{v.isAvailable ? 'AVAILABLE' : v.status}</span></div><p className="mt-2 text-sm text-slate-500">{v.vehicleType.replace('_',' ')} · {v.capacityWeight.toLocaleString()} kg · {v.currentLocation.label}</p><button className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" disabled={update.isPending} onClick={() => update.mutate({id:v.id,input:{isAvailable:!v.isAvailable,status:!v.isAvailable ? 'AVAILABLE' : 'OFFLINE'}})}>{v.isAvailable ? 'Set unavailable' : 'Set available'}</button></article>)}</div>
  </section>;
}
