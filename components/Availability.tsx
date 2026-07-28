'use client';
import {useState} from 'react';

export default function Availability({trailerId}:{trailerId:string}){
 const [result,setResult]=useState('');
 async function check(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault(); setResult('Checking…');
  const data=new FormData(e.currentTarget);
  const q=new URLSearchParams({trailerId,pickup:String(data.get('pickup')),returnAt:String(data.get('returnAt'))});
  const r=await fetch('/api/availability?'+q.toString()); const j=await r.json();
  setResult(r.ok ? (j.available?'Available — continue booking':'Those dates are unavailable') : (j.error||'Could not check dates'));
 }
 return <div className="availability"><h3>Check availability</h3><form onSubmit={check}>
  <label>Pickup date<input name="pickup" type="datetime-local" required/></label>
  <label>Return date<input name="returnAt" type="datetime-local" required/></label>
  <button className="btn" type="submit">Check Dates</button><div className="result">{result}</div>
 </form></div>
}
