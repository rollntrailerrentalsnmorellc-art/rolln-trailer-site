import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';

export default async function Portal(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user) return <main><section><div className="container"><div className="form"><h1>Customer portal</h1><p className="muted">Use a secure email link to view rentals, balances, extensions and documents.</p><Link className="btn" href="/login">Send Me a Secure Link</Link></div></div></section></main>;
 const {data:bookings}=await supabase.from('bookings').select('*,trailers(name)').eq('customer_id',user.id).order('pickup_at',{ascending:false});
 return <main><section><div className="container"><span className="eyebrow">Secure customer area</span><h1>Your rentals</h1>{!bookings?.length?<div className="panel"><p>No rentals are connected to this account yet.</p></div>:<div className="grid">{bookings.map((b:any)=><div className="panel" key={b.id}><h3>{b.trailers?.name}</h3><p>Status: <strong>{b.status}</strong></p><p>{new Date(b.pickup_at).toLocaleString()} — {new Date(b.return_at).toLocaleString()}</p><p>Confirmation: {b.confirmation_code}</p></div>)}</div>}</div></section></main>
}
