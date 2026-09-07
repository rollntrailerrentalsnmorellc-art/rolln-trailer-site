'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};

const nav=[
 {href:'/owner',label:'Home',icon:'⌂'},
 {href:'/owner/bookings',label:'Bookings',icon:'▣'},
 {href:'/owner/fleet',label:'Fleet',icon:'◆'},
 {href:'/owner/customers',label:'Customers',icon:'●'},
 {href:'/owner/payments',label:'Payments',icon:'$'},
];

export default function OwnerAppChrome({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const router=useRouter();
 const [installPrompt,setInstallPrompt]=useState<InstallPromptEvent|null>(null);
 const [installHelp,setInstallHelp]=useState(false);
 const [online,setOnline]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [notificationState,setNotificationState]=useState<'unsupported'|'off'|'on'|'blocked'>('off');
 const isLogin=pathname==='/owner/login';

 useEffect(()=>{
  setOnline(navigator.onLine);
  const update=()=>setOnline(navigator.onLine);
  const capture=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent)};
  window.addEventListener('online',update);window.addEventListener('offline',update);window.addEventListener('beforeinstallprompt',capture);
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))setNotificationState('unsupported');
  else if(Notification.permission==='denied')setNotificationState('blocked');
  else navigator.serviceWorker.register('/owner-sw.js',{scope:'/owner/'}).then(async registration=>{
   const subscription=await registration.pushManager.getSubscription();
   setNotificationState(subscription?'on':'off');
  }).catch(()=>undefined);
  return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);window.removeEventListener('beforeinstallprompt',capture)};
 },[]);

 async function install(){
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);return}
  setInstallHelp(value=>!value);
 }

 async function signOut(){
  await createClient().auth.signOut();
  router.push('/owner/login');router.refresh();
 }

 function refresh(){
  setRefreshing(true);
  router.refresh();
  window.setTimeout(()=>setRefreshing(false),700);
 }

 async function toggleNotifications(){
  if(notificationState==='unsupported'){alert('Push notifications are not supported on this device.');return}
  if(notificationState==='blocked'){alert('Notifications are blocked. Open your phone settings, allow notifications for the Roll\'N Owner App, then try again.');return}
  try{
   const registration=await navigator.serviceWorker.ready;
   const current=await registration.pushManager.getSubscription();
   if(current){
    await fetch('/api/owner/push-subscriptions',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:current.endpoint})});
    await current.unsubscribe();setNotificationState('off');return;
   }
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){setNotificationState(permission==='denied'?'blocked':'off');return}
   const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   if(!key)throw new Error('Notifications are not configured yet.');
   const padding='='.repeat((4-key.length%4)%4);
   const bytes=Uint8Array.from(atob((key+padding).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const response=await fetch('/api/owner/push-subscriptions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(subscription)});
   if(!response.ok)throw new Error((await response.json()).error||'Unable to enable notifications.');
   setNotificationState('on');
  }catch(error){alert(error instanceof Error?error.message:'Unable to update notifications.');}
 }

 return <>
  <header className="owner-app-header"><Link href="/owner" className="owner-app-brand"><img src="/images/RTRlogo.png" alt=""/><span><small>ROLL'N TRAILER</small><strong>OWNER APP</strong></span></Link>{!isLogin&&<div className="owner-app-header-actions"><button type="button" onClick={toggleNotifications} className={`owner-icon-button${notificationState==='on'?' active':''}`} aria-label={notificationState==='on'?'Disable notifications':'Enable notifications'} title={notificationState==='on'?'Notifications on':'Enable notifications'}>🔔</button><button type="button" onClick={refresh} className={`owner-icon-button${refreshing?' spinning':''}`} aria-label="Refresh app data" title="Refresh">↻</button><button type="button" onClick={install} className="owner-icon-button" aria-label="Install owner app">＋</button><button type="button" onClick={signOut} className="owner-icon-button" aria-label="Sign out">↪</button></div>}</header>
  {!online&&<div className="owner-offline" role="status">You’re offline. Reconnect to update business records.</div>}
  {installHelp&&!isLogin&&<div className="owner-install-help"><strong>Add this app to your phone</strong><span>On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu and tap Install app.</span><button type="button" onClick={()=>setInstallHelp(false)} aria-label="Close install instructions">×</button></div>}
  <div className={isLogin?'owner-app-content owner-login-content':'owner-app-content'}>{children}</div>
  {!isLogin&&<nav className="owner-tabbar" aria-label="Owner app navigation">{nav.map(item=>{const active=item.href==='/owner'?pathname===item.href:pathname.startsWith(item.href);return <Link key={item.href} href={item.href} className={active?'active':''} aria-current={active?'page':undefined}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>})}</nav>}
 </>;
}
