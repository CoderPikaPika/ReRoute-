import { Link, useParams } from 'react-router-dom';

import { StatusBadge } from '../components/shipment/StatusBadge';
import { useShipment } from '../features/shipments/hooks';

export function ShipmentDetailPage() {
  const { id = '' } = useParams();
  const { data: shipment, isLoading } = useShipment(id);
  if (isLoading) return <p>Loading shipment…</p>;
  if (!shipment) return <p>Shipment not found.</p>;
  return <section><Link className="text-sm font-semibold text-cyan-700" to="/shipments">← All shipments</Link>
    <div className="mt-5 flex flex-wrap justify-between gap-4"><div><p className="text-sm text-slate-500">Shipment {shipment.id}</p><h1 className="text-3xl font-bold">{shipment.source.label} → {shipment.destination.label}</h1></div><StatusBadge status={shipment.status}/></div>
    <div className="mt-7 grid gap-5 md:grid-cols-2"><article className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Cargo & delivery</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Cargo</dt><dd>{shipment.cargoType}</dd></div><div className="flex justify-between"><dt>Weight</dt><dd>{shipment.weight.toLocaleString()} kg</dd></div><div className="flex justify-between"><dt>Vehicle</dt><dd>{shipment.vehicleTypeRequired.replace('_',' ')}</dd></div><div className="flex justify-between"><dt>Distance</dt><dd>{shipment.estimatedDistance ?? '—'} km</dd></div><div className="flex justify-between"><dt>Estimated cost</dt><dd>₹{shipment.estimatedCost?.toLocaleString() ?? '—'}</dd></div></dl></article>
    <article className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Shipment lifecycle</h2><div className="mt-4 space-y-3">{['CREATED','MATCHED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED'].map(status => <div className={'flex items-center gap-3 text-sm ' + (shipment.status === status || ['MATCHED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED'].indexOf(shipment.status) >= ['MATCHED','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED'].indexOf(status) ? 'text-slate-900' : 'text-slate-400')} key={status}><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />{status.replace('_',' ')}</div>)}</div></article></div>
  </section>;
}
