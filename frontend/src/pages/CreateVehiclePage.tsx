import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useCreateVehicle } from '../features/vehicles/hooks';
import { VEHICLE_TYPES } from '../types/shipment';
import type { CreateVehicleInput } from '../types/vehicle';

const schema = z.object({ registrationNumber:z.string().min(4), vehicleType:z.enum(VEHICLE_TYPES), capacityWeight:z.number().positive(), capacityVolume:z.number().positive().optional(), currentLocation:z.string().min(2) });
export function CreateVehiclePage() {
 const navigate=useNavigate(); const create=useCreateVehicle(); const {register,handleSubmit}=useForm<CreateVehicleInput>({resolver:zodResolver(schema),defaultValues:{vehicleType:'HEAVY_TRUCK',isAvailable:true}});
 const field='mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5';
 return <section className="max-w-2xl"><p className="text-sm font-semibold text-cyan-700">TRANSPORTER FLEET</p><h1 className="text-3xl font-bold">Add vehicle</h1><form className="mt-7 grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2" onSubmit={handleSubmit(async v=>{await create.mutateAsync(v);navigate('/vehicles')})}>
 <label>Registration number<input className={field} {...register('registrationNumber')}/></label><label>Vehicle type<select className={field} {...register('vehicleType')}>{VEHICLE_TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label>Capacity kg<input className={field} type="number" {...register('capacityWeight',{valueAsNumber:true})}/></label><label>Capacity m³<input className={field} type="number" {...register('capacityVolume',{valueAsNumber:true})}/></label><label className="sm:col-span-2">Current city<input className={field} {...register('currentLocation')}/></label><button className="sm:col-span-2 rounded-lg bg-slate-950 py-3 font-bold text-white" disabled={create.isPending}>{create.isPending?'Adding…':'Add vehicle'}</button></form></section>;
}
