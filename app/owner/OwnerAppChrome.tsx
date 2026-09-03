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
 const isLogin=pathname==='/owner/login';

 useEffect(()=>{
  setOnline(navigator.onLine);
  const update=()=>setOnline(navigator.onLine);
  const capture=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent)};
  window.addEventListener('online',update);window.addEventListener('offline',update);window.addEventListener('beforeinstallprompt',capture);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/owner-sw.js',{scope:'/owner/'}).catch(()=>undefined);
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

 return <>
  <header className="owner-app-header"><Link href="/owner" className="owner-app-brand"><img src="/images/RTRlogo.png" alt=""/><span><small>ROLL'N TRAILER</small><strong>OWNER APP</strong></span></Link>{!isLogin&&<div className="owner-app-header-actions"><button type="button" onClick={install} className="owner-icon-button" aria-label="Install owner app">＋</button><button type="button" onClick={signOut} className="owner-icon-button" aria-label="Sign out">↪</button></div>}</header>
  {!online&&<div className="owner-offline" role="status">You’re offline. Reconnect to update business records.</div>}
  {installHelp&&!isLogin&&<div className="owner-install-help"><strong>Add this app to your phone</strong><span>On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu and tap Install app.</span><button type="button" onClick={()=>setInstallHelp(false)} aria-label="Close install instructions">×</button></div>}
  <div className={isLogin?'owner-app-content owner-login-content':'owner-app-content'}>{children}</div>
  {!isLogin&&<nav className="owner-tabbar" aria-label="Owner app navigation">{nav.map(item=>{const active=item.href==='/owner'?pathname===item.href:pathname.startsWith(item.href);return <Link key={item.href} href={item.href} className={active?'active':''} aria-current={active?'page':undefined}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>})}</nav>}
 </>;
}
