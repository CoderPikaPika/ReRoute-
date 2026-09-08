import type { ShipmentStatus } from '../../types/shipment';

const colors: Record<ShipmentStatus, string> = {
  CREATED: 'bg-slate-100 text-slate-700',
  MATCHED: 'bg-violet-100 text-violet-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-amber-100 text-amber-700',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + colors[status]}>{status.replace('_', ' ')}</span>;
}
