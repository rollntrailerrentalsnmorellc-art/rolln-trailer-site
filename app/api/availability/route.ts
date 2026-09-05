import {NextRequest,NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

export async function GET(req:NextRequest){
 const trailerId=req.nextUrl.searchParams.get('trailerId');
 const pickup=req.nextUrl.searchParams.get('pickup');
 const returnAt=req.nextUrl.searchParams.get('returnAt');
 if(!trailerId||!pickup||!returnAt) return NextResponse.json({error:'Missing dates or trailer.'},{status:400});
 const start=new Date(pickup), end=new Date(returnAt);
 if(isNaN(start.valueOf())||isNaN(end.valueOf())||end<=start) return NextResponse.json({error:'Enter a valid pickup and return time.'},{status:400});
 const supabase=createAdminClient();
 const {data,error}=await supabase.from('bookings').select('id,status,created_at').eq('trailer_id',trailerId)
  .lt('pickup_at',end.toISOString()).gt('return_at',start.toISOString());
 if(error){
  console.error('Availability query failed:',error);
  return NextResponse.json({error:'Availability could not be checked.'},{status:500});
 }
 const cutoff=Date.now()-30*60*1000;
 const blocking=(data??[]).some(b=>{
  if(['confirmed','active','pending'].includes(b.status)) return true;
  return b.status==='pending_payment'&&new Date(b.created_at).getTime()>cutoff;
 });
 return NextResponse.json({available:!blocking});
}
