"use client";

import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase/client";

export default function CustomerLogin(){
 const [email,setEmail]=useState("");
 const [message,setMessage]=useState("");
 const [sending,setSending]=useState(false);
 async function sendLink(event:FormEvent<HTMLFormElement>){
  event.preventDefault(); setSending(true); setMessage("");
  const supabase=createClient();
  const {error}=await supabase.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/portal`}});
  setMessage(error?error.message:"Check your email for your secure sign-in link.");
  setSending(false);
 }
 return <main><section><div className="container"><form className="form" onSubmit={sendLink} style={{width:"100%",maxWidth:520,margin:"0 auto"}}><span className="eyebrow">Secure customer access</span><h1>Open your rental portal</h1><p className="muted">Enter the same email address used for your booking. We will email you a one-time secure link.</p><label htmlFor="customer-email">Email address</label><input id="customer-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} required autoComplete="email"/><button className="btn" type="submit" disabled={sending}>{sending?"Sending…":"Email My Secure Link"}</button>{message&&<div className="notice" style={{marginTop:16}}>{message}</div>}</form></div></section></main>
}
