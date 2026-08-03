import {createClient} from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Owner(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user) return <main><section><div className="container"><div className="form"><h1>Owner dashboard</h1><p className="muted">Sign in with the owner email to continue.</p><Link className="btn" href="/login">Secure Sign-In</Link></div></div></section></main>;
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(!profile||!['owner','staff'].includes(profile.role)) return <main><section><div className="container"><div className="notice">This account does not have owner access.</div></div></section></main>;
 const now=new Date().toISOString();
 const [{count:pending},{count:active},{count:trailers}]=await Promise.all([
  supabase.from('bookings').select('*',{count:'exact',head:true}).in('status',['pending_documents','pending_payment']),
  supabase.from('bookings').select('*',{count:'exact',head:true}).eq('status','active'),
  supabase.from('trailers').select('*',{count:'exact',head:true}).neq('status','inactive')
 ]);
 return <main><section><div className="container"><span className="eyebrow">Private owner area</span><h1>Fleet dashboard</h1><div className="portal-grid"><div className="panel"><h2>{trailers||0}</h2><p>Active trailers</p></div><div className="panel"><h2>{pending||0}</h2><p>Pending bookings</p></div><div className="panel"><h2>{active||0}</h2><p>Currently rented</p></div></div><div className="notice" style={{marginTop:16}}>Phase 2 will add calendar, approvals, payments, maintenance and revenue reporting.</div></div></section></main>
}
