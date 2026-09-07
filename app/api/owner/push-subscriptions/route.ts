import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

async function staffUser(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 return profile&&['owner','staff'].includes(profile.role)?user:null;
}

export async function POST(request:Request){
 const user=await staffUser();
 if(!user)return NextResponse.json({error:'Owner sign-in required.'},{status:401});
 const body=await request.json();
 const endpoint=body?.endpoint;
 const p256dh=body?.keys?.p256dh;
 const auth=body?.keys?.auth;
 if(typeof endpoint!=='string'||typeof p256dh!=='string'||typeof auth!=='string')return NextResponse.json({error:'Invalid notification subscription.'},{status:400});
 const {error}=await createAdminClient().from('push_subscriptions').upsert({user_id:user.id,endpoint,p256dh,auth,user_agent:request.headers.get('user-agent'),last_used_at:new Date().toISOString()},{onConflict:'endpoint'});
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
 const user=await staffUser();
 if(!user)return NextResponse.json({error:'Owner sign-in required.'},{status:401});
 const {endpoint}=await request.json();
 if(typeof endpoint!=='string')return NextResponse.json({error:'Invalid notification subscription.'},{status:400});
 const {error}=await createAdminClient().from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',endpoint);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
}
