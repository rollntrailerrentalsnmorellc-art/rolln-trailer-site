import Link from 'next/link';
import {redirect} from 'next/navigation';
import {TZDate} from '@date-fns/tz';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {addOnTotal,rentalAddOns,selectRentalAddOns,serializeRentalAddOns} from '@/lib/addons';

export const revalidate=0;

async function requireOwner(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/owner/login');
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(!profile||!['owner','staff'].includes(profile.role))throw new Error('Owner access required.');
}

function parseEastern(value:string){const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);if(!match)return null;const [,y,m,d,h,min]=match;const date=new TZDate(Number(y),Number(m)-1,Number(d),Number(h),Number(min),0,'America/New_York');return Number.isNaN(date.getTime())?null:date}
function confirmation(){return `RT-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}

async function createOwnerBooking(formData:FormData){
 'use server';
 await requireOwner();
 const trailerId=String(formData.get('trailerId')??'');
 const pickup=parseEastern(String(formData.get('pickupAt')??''));
 const returnAt=parseEastern(String(formData.get('returnAt')??''));
 const customerName=String(formData.get('customerName')??'').trim();
 const customerEmail=String(formData.get('customerEmail')??'').trim().toLowerCase();
 const customerPhone=String(formData.get('customerPhone')??'').trim();
 const towVehicle=String(formData.get('towVehicle')??'').trim();
 const intendedUse=String(formData.get('intendedUse')??'').trim();
 const towRating=Number(formData.get('towRatingLbs'));
 const selectedAddOns=selectRentalAddOns(formData.getAll('addOnIds').map(String));
 if(!trailerId||!pickup||!returnAt||returnAt<=pickup||customerName.length<2||!customerEmail.includes('@')||customerPhone.replace(/\D/g,'').length<10)throw new Error('Complete the customer, trailer, and schedule fields.');
 const admin=createAdminClient();
 const {data:trailer,error:trailerError}=await admin.from('trailers').select('daily_rate_cents,weekly_rate_cents,deposit_cents,gvwr_lbs,status').eq('id',trailerId).single();
 if(trailerError||!trailer||trailer.status==='inactive')throw new Error('That trailer is archived or unavailable.');
 if(!Number.isInteger(towRating)||towRating<1000||towRating>40000||(trailer.gvwr_lbs&&towRating<trailer.gvwr_lbs))throw new Error('Verify that the tow rating is realistic and meets the trailer GVWR.');
 const {data:conflicts,error:conflictError}=await admin.from('bookings').select('id').eq('trailer_id',trailerId).in('status',['pending_payment','confirmed','active']).lt('pickup_at',returnAt.toISOString()).gt('return_at',pickup.toISOString()).limit(1);
 if(conflictError)throw new Error('Unable to verify availability.');
 if(conflicts?.length)throw new Error('Those dates overlap an existing reservation.');
 const days=Math.max(1,Math.ceil((returnAt.getTime()-pickup.getTime())/86400000));
 const base=trailer.weekly_rate_cents&&days>=7?Math.floor(days/7)*trailer.weekly_rate_cents+(days%7)*(trailer.daily_rate_cents??0):days*(trailer.daily_rate_cents??0);
 const total=base+addOnTotal(selectedAddOns,days);
 const {data:booking,error}=await admin.from('bookings').insert({confirmation_code:confirmation(),trailer_id:trailerId,status:'pending_payment',pickup_at:pickup.toISOString(),return_at:returnAt.toISOString(),customer_name:customerName,customer_email:customerEmail,customer_phone:customerPhone,tow_vehicle:towVehicle||null,tow_rating_lbs:towRating,intended_use:intendedUse||null,owner_notes:serializeRentalAddOns(selectedAddOns),subtotal_cents:total,deposit_cents:trailer.deposit_cents??5000,total_cents:total,amount_paid_cents:0}).select('id').single();
 if(error||!booking)throw new Error(`Unable to create booking: ${error?.message??'Unknown error'}`);
 redirect(`/owner/bookings/${booking.id}?created=owner`);
}

export default async function NewBookingPage(){
 await requireOwner();
 const {data:trailers}=await createAdminClient().from('trailers').select('id,name,daily_rate_cents,weekly_rate_cents,gvwr_lbs,status').neq('status','inactive').order('sort_order');
 return <main><section><div className="container owner-form-page">
  <div className="owner-page-head"><div><span className="eyebrow">Phone or walk-in rental</span><h1>New booking</h1></div><Link className="btn2" href="/owner/bookings">Cancel</Link></div>
  <form action={createOwnerBooking} className="panel owner-booking-form">
   <fieldset><legend>Customer</legend><label>Name<input name="customerName" autoComplete="name" required/></label><label>Email<input name="customerEmail" type="email" inputMode="email" autoComplete="email" required/></label><label>Phone<input name="customerPhone" type="tel" inputMode="tel" autoComplete="tel" required/></label></fieldset>
   <fieldset><legend>Rental</legend><label>Trailer<select name="trailerId" required defaultValue=""><option value="" disabled>Select a trailer</option>{trailers?.map(trailer=><option key={trailer.id} value={trailer.id}>{trailer.name} · ${(trailer.daily_rate_cents/100).toFixed(0)}/day · {(trailer.gvwr_lbs??0).toLocaleString()} lb GVWR</option>)}</select></label><div className="owner-form-split"><label>Pickup<input name="pickupAt" type="datetime-local" required/></label><label>Return<input name="returnAt" type="datetime-local" required/></label></div><label>Intended use<textarea name="intendedUse" rows={3} placeholder="What is the customer hauling?"/></label></fieldset>
   <fieldset><legend>Tow vehicle</legend><label>Vehicle<input name="towVehicle" placeholder="Year, make, model"/></label><label>Tow rating (lbs)<input name="towRatingLbs" type="number" inputMode="numeric" min="1000" max="40000" step="1" required/><small>Use the manufacturer’s rated towing capacity—not a guess.</small></label></fieldset>
   <fieldset><legend>Rentable add-ons</legend><div className="owner-addon-list">{rentalAddOns.map(item=><label key={item.id}><input type="checkbox" name="addOnIds" value={item.id}/><span><strong>{item.name}</strong><small>${(item.pricePerDayCents/100).toFixed(0)}/day · {item.description}</small></span></label>)}</div></fieldset>
   <div className="notice">The booking will be saved as pending. Review it, then approve it to send the customer their secure deposit and document link.</div>
   <button className="btn" type="submit">Create &amp; Review Booking</button>
  </form>
 </div></section></main>;
}
