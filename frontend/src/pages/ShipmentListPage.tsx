import { Link } from 'react-router-dom';

import { StatusBadge } from '../components/shipment/StatusBadge';
import { useShipments } from '../features/shipments/hooks';

export function ShipmentListPage() {
  const { data: shipments, isLoading, error } = useShipments();

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-cyan-700">SHIPPER OPERATIONS</p><h1 className="text-3xl font-bold">Shipments</h1></div>
        <Link className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white" to="/shipments/create">Create shipment</Link>
      </div>
      <div className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? <p className="p-6 text-slate-500">Loading shipments…</p> : null}
        {error ? <p className="p-6 text-rose-600">Unable to load shipments.</p> : null}
        {shipments?.length === 0 ? <p className="p-6 text-slate-500">No shipments yet. Create your first request.</p> : null}
        {shipments?.map((shipment) => (
          <Link className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 hover:bg-slate-50" key={shipment.id} to={'/shipments/' + shipment.id}>
            <div><p className="font-bold text-slate-900">{shipment.source.label} → {shipment.destination.label}</p><p className="mt-1 text-sm text-slate-500">{shipment.cargoType} · {shipment.weight.toLocaleString()} kg · {shipment.vehicleTypeRequired.replace('_', ' ')}</p></div>
            <StatusBadge status={shipment.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}
