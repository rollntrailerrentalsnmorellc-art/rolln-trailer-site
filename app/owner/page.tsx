import Link from 'next/link';
import {TZDate} from '@date-fns/tz';
import {createClient} from '@/lib/supabase/server';

export const revalidate=0;

type AppBooking={id:string;confirmation_code:string|null;status:string;pickup_at:string;return_at:string;customer_name:string|null;total_cents:number|null;amount_paid_cents:number|null;trailers:{name:string}|{name:string}[]|null};

function trailerName(value:AppBooking['trailers']){return Array.isArray(value)?value[0]?.name:value?.name}
function money(cents:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100)}
function shortTime(value:string){return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}).format(new Date(value))}
function shortDate(value:string){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'}).format(new Date(value))}

export default async function Owner(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return <main><section><div className="container"><div className="form"><span className="eyebrow">Private owner app</span><h1>Run your rentals from your phone</h1><p className="muted">Sign in with your authorized owner account to open the business dashboard.</p><Link className="btn" href="/owner/login">Secure Owner Sign-In</Link></div></div></section></main>;
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(!profile||!['owner','staff'].includes(profile.role))return <main><section><div className="container"><div className="notice">This account does not have owner access.</div></div></section></main>;

 const now=new TZDate(new Date(),'America/New_York');
 const dayStart=new TZDate(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,'America/New_York');
 const dayEnd=new TZDate(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,'America/New_York');
 const monthStart=new TZDate(now.getFullYear(),now.getMonth(),1,0,0,0,'America/New_York');
 const fields='id,confirmation_code,status,pickup_at,return_at,customer_name,total_cents,amount_paid_cents,trailers(name)';
 const [pendingResult,activeResult,trailerResult,pickupResult,returnResult,revenueResult,balanceResult]=await Promise.all([
  supabase.from('bookings').select(fields).in('status',['pending','pending_documents','pending_payment']).order('created_at',{ascending:false}).limit(8),
  supabase.from('bookings').select('*',{count:'exact',head:true}).eq('status','active'),
  supabase.from('trailers').select('*',{count:'exact',head:true}).neq('status','inactive'),
  supabase.from('bookings').select(fields).gte('pickup_at',dayStart.toISOString()).lte('pickup_at',dayEnd.toISOString()).in('status',['confirmed','active']),
  supabase.from('bookings').select(fields).gte('return_at',dayStart.toISOString()).lte('return_at',dayEnd.toISOString()).in('status',['confirmed','active']),
  supabase.from('bookings').select('amount_paid_cents').gte('created_at',monthStart.toISOString()),
  supabase.from('bookings').select('total_cents,amount_paid_cents').in('status',['pending','pending_documents','pending_payment','confirmed','active']),
 ]);
 const pending=(pendingResult.data??[]) as unknown as AppBooking[];
 const pickups=(pickupResult.data??[]) as unknown as AppBooking[];
 const returns=(returnResult.data??[]) as unknown as AppBooking[];
 const agenda=[...pickups.map(item=>({...item,event:'Pickup',eventAt:item.pickup_at})),...returns.map(item=>({...item,event:'Return',eventAt:item.return_at}))].sort((a,b)=>a.eventAt.localeCompare(b.eventAt));
 const revenue=(revenueResult.data??[]).reduce((sum,row)=>sum+(row.amount_paid_cents??0),0);
 const outstanding=(balanceResult.data??[]).reduce((sum,row)=>sum+Math.max((row.total_cents??0)-(row.amount_paid_cents??0),0),0);

 return <main><section><div className="container">
  <div className="owner-page-head"><div><span className="eyebrow">{new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'America/New_York'}).format(now)}</span><h1>Command center</h1></div><Link className="btn owner-quick-add" href="/owner/bookings/new">＋ New</Link></div>
  <div className="owner-metrics">
   <Link className="owner-metric attention" href="/owner/bookings"><small>Needs attention</small><strong>{pending.length}</strong></Link>
   <Link className="owner-metric" href="/owner/bookings"><small>Active rentals</small><strong>{activeResult.count??0}</strong></Link>
   <div className="owner-metric"><small>Today’s pickups</small><strong>{pickups.length}</strong></div>
   <div className="owner-metric"><small>Today’s returns</small><strong>{returns.length}</strong></div>
   <Link className="owner-metric" href="/owner/payments"><small>Open balances</small><strong>{money(outstanding)}</strong></Link>
   <Link className="owner-metric" href="/owner/payments"><small>Paid this month</small><strong>{money(revenue)}</strong></Link>
  </div>

  <div className="owner-section-title"><h2>Today’s schedule</h2><Link href="/owner/bookings">All bookings</Link></div>
  {agenda.length?<div className="owner-agenda">{agenda.map(item=><Link className="owner-agenda-item" href={`/owner/bookings/${item.id}`} key={`${item.event}-${item.id}`}><span className="owner-agenda-time">{shortTime(item.eventAt)}</span><span><strong>{item.event} · {item.customer_name||'Customer'}</strong><small>{trailerName(item.trailers)||'Trailer'} · {item.confirmation_code||item.id.slice(0,8)}</small></span><span className="owner-agenda-arrow">›</span></Link>)}</div>:<div className="panel"><strong>No pickups or returns today</strong><p className="muted" style={{marginBottom:0}}>Your daily schedule is clear.</p></div>}

  <div className="owner-section-title"><h2>Needs attention</h2><Link href="/owner/bookings">Open queue</Link></div>
  {pending.length?<div className="owner-agenda">{pending.slice(0,5).map(item=><Link className="owner-agenda-item" href={`/owner/bookings/${item.id}`} key={item.id}><span className="owner-agenda-time">{shortDate(item.pickup_at)}</span><span><strong>{item.customer_name||'Customer'}</strong><small>{String(item.status).replaceAll('_',' ')} · {trailerName(item.trailers)||'Trailer'}</small></span><span className="owner-agenda-arrow">›</span></Link>)}</div>:<div className="panel"><strong>Nothing waiting</strong><p className="muted" style={{marginBottom:0}}>New requests and incomplete paperwork will appear here.</p></div>}

  <div className="owner-section-title"><h2>Business tools</h2></div>
  <div className="owner-launch-grid">
   <Link className="panel" href="/owner/bookings"><h3>Bookings</h3><p className="muted">Approvals, dates, pickup and return</p></Link>
   <Link className="panel" href="/owner/fleet"><h3>Fleet</h3><p className="muted">{trailerResult.count??0} active trailer records</p></Link>
   <Link className="panel" href="/owner/customers"><h3>Customers</h3><p className="muted">Contacts, history and documents</p></Link>
   <Link className="panel" href="/owner/payments"><h3>Payments</h3><p className="muted">Balances, charges and receipts</p></Link>
  </div>
 </div></section></main>;
}
