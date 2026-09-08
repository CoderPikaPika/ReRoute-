import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useCreateShipment } from '../features/shipments/hooks';
import { getApiErrorMessage } from '../lib/api-error';
import { VEHICLE_TYPES, type CreateShipmentInput } from '../types/shipment';

const schema = z.object({
  source: z.string().min(2),
  destination: z.string().min(2),
  cargoType: z.string().min(2),
  weight: z.number().positive(),
  volume: z.number().positive().optional(),
  vehicleTypeRequired: z.enum(VEHICLE_TYPES),
  pickupDate: z.string().min(1),
  deliveryDeadline: z.string().min(1),
});

export function CreateShipmentPage() {
  const navigate = useNavigate();
  const createShipment = useCreateShipment();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateShipmentInput>({ resolver: zodResolver(schema), defaultValues: { vehicleTypeRequired: 'HEAVY_TRUCK' } });

  async function submit(values: CreateShipmentInput) {
    try {
      const shipment = await createShipment.mutateAsync({
        ...values,
        pickupDate: new Date(values.pickupDate).toISOString(),
        deliveryDeadline: new Date(values.deliveryDeadline).toISOString(),
      });
      navigate('/shipments/' + shipment.id);
    } catch { /* error displayed below */ }
  }

  const field = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100';
  return <section className="max-w-3xl"><p className="text-sm font-semibold text-cyan-700">NEW FREIGHT REQUEST</p><h1 className="mt-1 text-3xl font-bold">Create shipment</h1>
    <form className="mt-7 grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      {([['source','Source city'],['destination','Destination city'],['cargoType','Cargo type'],['weight','Weight (kg)'],['volume','Volume (m³)'],['pickupDate','Pickup date'],['deliveryDeadline','Delivery deadline']] as const).map(([name,label]) => <label className="text-sm font-semibold text-slate-700" key={name}>{label}<input className={field} type={name.includes('Date') ? 'datetime-local' : name === 'weight' || name === 'volume' ? 'number' : 'text'} {...register(name, name === 'weight' || name === 'volume' ? { valueAsNumber: true } : {})} />{errors[name] && <span className="text-xs text-rose-600">Required / invalid value</span>}</label>)}
      <label className="text-sm font-semibold text-slate-700">Required vehicle<select className={field} {...register('vehicleTypeRequired')}>{VEHICLE_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
      {createShipment.error && <p className="sm:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{getApiErrorMessage(createShipment.error)}</p>}
      <button className="sm:col-span-2 rounded-lg bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-60" disabled={createShipment.isPending}>{createShipment.isPending ? 'Creating…' : 'Create shipment'}</button>
    </form>
  </section>;
}
