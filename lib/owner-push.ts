import webpush from 'web-push';
import {createAdminClient} from '@/lib/supabase/admin';

type OwnerNotification={title:string;body:string;url?:string;tag?:string};

export async function sendOwnerPush(notification:OwnerNotification){
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 const privateKey=process.env.VAPID_PRIVATE_KEY;
 const subject=process.env.VAPID_SUBJECT||'mailto:rollntrailer@gmail.com';
 if(!publicKey||!privateKey)return;
 webpush.setVapidDetails(subject,publicKey,privateKey);
 const supabase=createAdminClient();
 const {data:subscriptions,error}=await supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth');
 if(error){console.error('Unable to load push subscriptions:',error);return}
 await Promise.all((subscriptions??[]).map(async subscription=>{
  try{
   await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(notification));
   await supabase.from('push_subscriptions').update({last_used_at:new Date().toISOString()}).eq('id',subscription.id);
  }catch(error:any){
   if(error?.statusCode===404||error?.statusCode===410)await supabase.from('push_subscriptions').delete().eq('id',subscription.id);
   else console.error('Owner push notification failed:',error);
  }
 }));
}
