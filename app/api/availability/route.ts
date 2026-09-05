import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(req:NextRequest){
 const trailerId=req.nextUrl.searchParams.get('trailerId');
 const pickup=req.nextUrl.searchParams.get('pickup');
 const returnAt=req.nextUrl.searchParams.get('returnAt');
 if(!trailerId||!pickup||!returnAt) return NextResponse.json({error:'Missing dates or trailer.'},{status:400});
 const start=new Date(pickup), end=new Date(returnAt);
 if(isNaN(start.valueOf())||isNaN(end.valueOf())||end<=start) return NextResponse.json({error:'Enter a valid pickup and return time.'},{status:400});
 const supabase=await createClient();
 const {data,error}=await supabase.from('bookings').select('id,status,created_at').eq('trailer_id',trailerId)
  .in('status',['pending_payment','pending','confirmed','active']).lt('pickup_at',end.toISOString()).gt('return_at',start.toISOString());
 if(error) return NextResponse.json({error:'Availability could not be checked.'},{status:500});
 const cutoff=Date.now()-30*60*1000;
 const blocking=(data??[]).some(b=>b.status!=='pending_payment'||new Date(b.created_at).getTime()>cutoff);
 return NextResponse.json({available:!blocking});
}
