'use client';

import {FormEvent, useState} from 'react';
import {equipment, equipmentRentalCents} from '@/lib/equipment';

export default function EquipmentRequestForm({initialItem}: {initialItem?: string}) {
  const [itemId, setItemId] = useState(initialItem || equipment[0].id);
  const [pickup, setPickup] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('');
  const [requestId, setRequestId] = useState('');
  const item = equipment.find(entry => entry.id === itemId) || equipment[0];
  const duration = pickup && returnAt ? new Date(returnAt).getTime() - new Date(pickup).getTime() : 0;
  const estimate = duration > 0 ? equipmentRentalCents(item, duration) : null;

  async function checkDates() {
    setAvailability('Checking dates…');
    try {
      const query=new URLSearchParams({itemId,pickup,returnAt});
      const response=await fetch(`/api/equipment-availability?${query}`);
      const result=await response.json();
      setAvailability(!response.ok ? result.error : result.available===false ? 'Those dates are unavailable. Please choose different times.' : result.available===true ? 'No confirmed rental currently blocks these dates. We will confirm your request.' : 'We will check these dates when you send your request.');
    } catch {setAvailability('We could not check dates right now. You can still send a request.');}
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const data = new FormData(event.currentTarget);
      const response = await fetch('/api/equipment-requests', {
        method: 'POST', headers: {'content-type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent.');
      setRequestId(result.requestId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your request could not be sent.');
    } finally { setSubmitting(false); }
  }

  if (requestId) return <div className="panel" role="status"><h2>Request received</h2><p>Reference {requestId}. We will check availability and contact you to confirm the equipment, terms, and payment. No rental is confirmed or charged yet.</p><a className="btn2" href="tel:7066996990">Call 706-699-6990</a></div>;

  return <form className="form" onSubmit={submit}>
    <h2>Request equipment online</h2>
    <p className="muted">Choose your dates and send a request. We will confirm availability, the rental terms, and payment with you. This form does not reserve equipment or charge a deposit. The listed $50 security deposit is refundable after return and inspection, subject to documented charges under the signed terms.</p>
    <label htmlFor="equipmentId">Equipment</label>
    <select id="equipmentId" name="equipmentId" value={itemId} onChange={event => {setItemId(event.target.value);setAvailability('');}} required>
      {equipment.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
    </select>
    <div className="grid two">
      <div><label htmlFor="equipment-pickup">Pickup date and time</label><input id="equipment-pickup" name="pickup" type="datetime-local" value={pickup} onChange={event => {setPickup(event.target.value);setAvailability('');}} required /></div>
      <div><label htmlFor="equipment-return">Return date and time</label><input id="equipment-return" name="returnAt" type="datetime-local" min={pickup} value={returnAt} onChange={event => {setReturnAt(event.target.value);setAvailability('');}} required /></div>
    </div>
    {estimate !== null && <p className="notice">Estimated rental: <strong>${(estimate / 100).toFixed(2)}</strong> · ${item.depositCents / 100} refundable security deposit if approved, separate from rent. Rental periods round up to the next 24 hours; the weekly rate applies when it costs less. Final details are confirmed before payment.</p>}
    <button className="btn2" type="button" onClick={checkDates} disabled={!pickup||!returnAt||duration<=0}>Check dates</button>
    {availability && <p className="muted" role="status">{availability}</p>}
    <div className="grid two">
      <div><label htmlFor="equipment-name">Full name</label><input id="equipment-name" name="customerName" autoComplete="name" maxLength={120} required /></div>
      <div><label htmlFor="equipment-phone">Phone</label><input id="equipment-phone" name="customerPhone" type="tel" autoComplete="tel" maxLength={40} required /></div>
    </div>
    <label htmlFor="equipment-email">Email</label><input id="equipment-email" name="customerEmail" type="email" autoComplete="email" maxLength={254} required />
    <label htmlFor="equipment-use">What will you use it for?</label><textarea id="equipment-use" name="intendedUse" rows={3} maxLength={1000} required />
    <div style={{position:'absolute',left:'-9999px'}} aria-hidden="true"><label htmlFor="equipment-website">Website</label><input id="equipment-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send equipment request'}</button>
    {message && <p className="notice" role="alert">{message} You can also call or text 706-699-6990.</p>}
  </form>;
}
