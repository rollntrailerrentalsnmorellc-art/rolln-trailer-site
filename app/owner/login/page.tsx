"use client";

import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function OwnerLogin(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [mode,setMode]=useState<"password"|"link">("password");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage("");
  const supabase=createClient();
  if(mode==="link"){
   const {error}=await supabase.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/owner`}});
   setMessage(error?error.message:"Check your email for the secure owner sign-in link.");setBusy(false);return;
  }
  const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
  if(error){setMessage(error.message);setBusy(false);return}
  router.push("/owner");router.refresh();
 }

 return <main><section><div className="container"><form className="form owner-login-form" onSubmit={submit}>
  <img src="/images/RTRlogo.png" alt="Roll'N Trailer Rentals" className="owner-login-logo"/>
  <span className="eyebrow">Private owner app</span><h1>Welcome back</h1><p className="muted">{mode==="password"?"Sign in to manage today’s rentals.":"We’ll email a one-time secure sign-in link."}</p>
  <label htmlFor="owner-email">Owner email</label><input id="owner-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} required autoComplete="email"/>
  {mode==="password"&&<><label htmlFor="owner-password">Password</label><input id="owner-password" type="password" value={password} onChange={event=>setPassword(event.target.value)} required autoComplete="current-password"/></>}
  <button className="btn" type="submit" disabled={busy}>{busy?"Signing in…":mode==="password"?"Open Owner App":"Email Secure Sign-In Link"}</button>
  <button className="owner-text-button" type="button" onClick={()=>{setMode(value=>value==="password"?"link":"password");setMessage("")}}>{mode==="password"?"Use a secure email link instead":"Sign in with password instead"}</button>
  {message&&<div className="notice">{message}</div>}
 </form></div></section></main>;
}
