import Link from 'next/link';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {equipment, equipmentRentalCents} from '@/lib/equipment';
import {parseEquipmentDate, validEquipmentDates} from '@/lib/equipment-dates';

export const revalidate = 0;

type EquipmentRequest = {
  id:string; reference_code:string; equipment_id:string; pickup_at:string; return_at:string;
  customer_name:string; customer_email:string; customer_phone:string; intended_use:string;
  quote_cents:number; deposit_cents:number; status:string; owner_notes:string|null; created_at:string;
};

async function requireStaff() {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect('/owner/login');
  const {data:profile} = await supabase.from('profiles').select('role').eq('id',user.id).single();
  if (!profile || !['owner','staff'].includes(profile.role)) throw new Error('Owner access required.');
}

function date(value:string) {return new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(value));}
function inputDate(value:string) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const part = (type:string) => parts.find(entry=>entry.type===type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

async function updateSchedule(formData:FormData) {
  'use server';
  await requireStaff();
  const id = String(formData.get('id')||'');
  const pickup = parseEquipmentDate(String(formData.get('pickup')||''));
  const returnAt = parseEquipmentDate(String(formData.get('returnAt')||''));
  if (!id || !validEquipmentDates(pickup,returnAt)) redirect('/owner/equipment?result=invalid');
  const admin = createAdminClient();
  const {data:request} = await admin.from('equipment_requests').select('equipment_id,status').eq('id',id).single();
  const item = equipment.find(entry=>entry.id===request?.equipment_id);
  if (!item || !['requested','declined'].includes(request!.status)) redirect('/owner/equipment?result=not_editable');
  const {data:updated,error} = await admin.from('equipment_requests').update({
    pickup_at:pickup!.toISOString(), return_at:returnAt!.toISOString(),
    quote_cents:equipmentRentalCents(item,returnAt!.getTime()-pickup!.getTime()),
    status:'requested',updated_at:new Date().toISOString(),
  }).eq('id',id).in('status',['requested','declined']).select('id').maybeSingle();
  if (error || !updated) redirect('/owner/equipment?result=save_failed');
  revalidatePath('/owner/equipment');
  redirect(`/owner/equipment?result=updated#request-${id}`);
}

async function changeStatus(formData:FormData) {
  'use server';
  await requireStaff();
  const id = String(formData.get('id')||'');
  const action = String(formData.get('action')||'');
  const allowed:Record<string,{from:string[];to:string}> = {
    hold:{from:['requested'],to:'held'}, decline:{from:['requested','held'],to:'declined'},
    reopen:{from:['declined'],to:'requested'}, start:{from:['held'],to:'active'},
    complete:{from:['active'],to:'completed'},
  };
  const transition = allowed[action];
  if (!id || !transition) redirect('/owner/equipment?result=invalid');
  const admin = createAdminClient();
  const {data:request} = await admin.from('equipment_requests').select('equipment_id,pickup_at,return_at,status').eq('id',id).single();
  if (!request || !transition.from.includes(request.status)) redirect('/owner/equipment?result=not_editable');
  if (action==='hold') {
    const {data:inventory} = await admin.from('equipment_inventory').select('status').eq('id',request.equipment_id).single();
    if (inventory?.status!=='available' || new Date(request.pickup_at).getTime()<Date.now()) redirect('/owner/equipment?result=unavailable');
  }
  const {data:updated,error} = await admin.from('equipment_requests').update({status:transition.to,updated_at:new Date().toISOString()})
    .eq('id',id).in('status',transition.from).select('id').maybeSingle();
  // The database overlap constraint prevents holding two rentals for the same item and dates.
  if (error) redirect(`/owner/equipment?result=${error.code==='23P01'?'conflict':'save_failed'}`);
  if (!updated) redirect('/owner/equipment?result=not_editable');
  revalidatePath('/owner/equipment');
  redirect(`/owner/equipment?result=${transition.to}#request-${id}`);
}

async function updateInventory(formData:FormData) {
  'use server';
  await requireStaff();
  const id=String(formData.get('id')||'');
  const status=String(formData.get('status')||'');
  if (!equipment.some(item=>item.id===id) || !['available','maintenance','inactive'].includes(status)) redirect('/owner/equipment?result=invalid');
  const {error}=await createAdminClient().from('equipment_inventory').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if (error) redirect('/owner/equipment?result=save_failed');
  revalidatePath('/owner/equipment');
  redirect('/owner/equipment?result=inventory_updated');
}

export default async function OwnerEquipmentPage({searchParams}:{searchParams:Promise<{result?:string}>}) {
  await requireStaff();
  const {result}=await searchParams;
  const admin=createAdminClient();
  const [inventoryResult,requestResult]=await Promise.all([
    admin.from('equipment_inventory').select('id,status').order('id'),
    admin.from('equipment_requests').select('*').order('created_at',{ascending:false}).limit(100),
  ]);
  const inventory=inventoryResult.data??[];
  const requests=(requestResult.data??[]) as EquipmentRequest[];
  const notices:Record<string,string>={invalid:'Choose a future pickup and a return within 30 days.',not_editable:'That request has changed. Refresh and try again.',unavailable:'This item is paused or its pickup time has passed.',conflict:'Those dates overlap an existing hold or active rental.',save_failed:'The change could not be saved. Please try again.',updated:'Dates and estimate updated. The request is awaiting review.',held:'Dates held. Contact the customer to arrange the equipment agreement and payment.',declined:'Request declined and dates released.',requested:'Request reopened for review.',active:'Rental marked picked up.',completed:'Rental marked returned.',inventory_updated:'Equipment availability updated.'};

  return <main><section><div className="container">
    <div className="owner-page-head"><div><span className="eyebrow">Private owner area</span><h1>Equipment rentals</h1><p className="muted">Review requests, hold dates, and track pickup and return. Agreements and payments are arranged separately.</p></div><Link className="btn2" href="/owner">Dashboard</Link></div>
    {result && notices[result] && <div className="notice" role="status">{notices[result]}</div>}
    {(inventoryResult.error || requestResult.error) && <div className="notice">Equipment tracking is not connected yet. Requests still arrive by email. The database setup must be completed before this page can track them.</div>}
    <div className="grid three" style={{margin:'22px 0'}}>{equipment.map(item=>{
      const state=inventory.find(row=>row.id===item.id)?.status||'not connected';
      return <div className="panel" key={item.id}><h2>{item.name}</h2><p className="muted">${item.dailyRateCents/100}/24 hours · ${item.weeklyRateCents/100}/week · ${item.depositCents/100} deposit</p><p>Status: <strong>{state}</strong></p>
        {!inventoryResult.error && <form action={updateInventory}><input type="hidden" name="id" value={item.id}/><label>Accept new requests<select name="status" defaultValue={state}>{['available','maintenance','inactive'].map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="btn2" type="submit">Save status</button></form>}
      </div>;
    })}</div>
    <h2>Recent requests</h2>
    {!requests.length && !requestResult.error && <div className="panel">No equipment requests recorded yet.</div>}
    <div style={{display:'grid',gap:18}}>{requests.map(request=>{
      const item=equipment.find(entry=>entry.id===request.equipment_id);
      return <article id={`request-${request.id}`} className="panel" key={request.id}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><h3>{item?.name||request.equipment_id} · {request.reference_code}</h3><span className="chip">{request.status.replaceAll('_',' ')}</span></div>
        <p><strong>{request.customer_name}</strong> · <a href={`tel:${request.customer_phone.replace(/\D/g,'')}`}>{request.customer_phone}</a> · <a href={`mailto:${request.customer_email}`}>{request.customer_email}</a></p>
        <p>{date(request.pickup_at)} – {date(request.return_at)} · Estimated rental ${(request.quote_cents/100).toFixed(2)} · Deposit ${(request.deposit_cents/100).toFixed(2)}</p>
        <p className="muted">Use: {request.intended_use}</p>
        {['requested','declined'].includes(request.status) && <form action={updateSchedule} className="form"><input type="hidden" name="id" value={request.id}/><div className="grid two"><label>Pickup<input type="datetime-local" name="pickup" defaultValue={inputDate(request.pickup_at)} required/></label><label>Return<input type="datetime-local" name="returnAt" defaultValue={inputDate(request.return_at)} required/></label></div><button className="btn2" type="submit">Save dates and estimate</button></form>}
        <div className="actions" style={{marginTop:16}}>
          {request.status==='requested' && <><form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="hold"/><button className="btn" type="submit">Hold dates</button></form><form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="decline"/><button className="btn2" type="submit">Decline</button></form></>}
          {request.status==='held' && <><form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="start"/><button className="btn" type="submit">Mark picked up</button></form><form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="decline"/><button className="btn2" type="submit">Release dates</button></form></>}
          {request.status==='active' && <form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="complete"/><button className="btn" type="submit">Mark returned</button></form>}
          {request.status==='declined' && <form action={changeStatus}><input type="hidden" name="id" value={request.id}/><input type="hidden" name="action" value="reopen"/><button className="btn2" type="submit">Reopen</button></form>}
        </div>
      </article>;
    })}</div>
  </div></section></main>;
}
