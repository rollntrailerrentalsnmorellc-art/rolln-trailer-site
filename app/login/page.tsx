'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';

export default function Login(){
 const [email,setEmail]=useState(''); const [message,setMessage]=useState('');
 async function send(e:React.FormEvent){e.preventDefault();setMessage('Sending secure link…');const supabase=createClient();
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/portal`}});
  setMessage(error?error.message:'Check your email for your secure sign-in link.');
 }
 return <main><section><div className="container"><form className="form" onSubmit={send}><span className="eyebrow">No password needed</span><h1>Customer sign-in</h1><p className="muted">Enter the email used for your rental. We will send a secure sign-in link.</p><label>Email address<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label><button className="btn" type="submit">Email Secure Link</button><p className="result">{message}</p></form></div></section></main>
}
