import Link from 'next/link';
import type { Metadata } from 'next';
import {equipment} from '@/lib/equipment';
import EquipmentRequestForm from './EquipmentRequestForm';

export const metadata: Metadata = {
 title: 'Equipment Rentals in Augusta, GA',
 description: "Generators, augers, power tools and equipment rentals from Roll'N Trailer Rentals N More LLC serving Augusta and the CSRA.",
};

export default async function EquipmentPage({searchParams}:{searchParams:Promise<{item?:string}>}){
 const {item: initialItem}=await searchParams;
 return <main>
  <section className="hero"><div className="container"><div className="card hero-copy">
    <span className="eyebrow">The N More part</span><h1>Equipment rentals</h1>
    <p>We are expanding beyond trailers with generators, outdoor power equipment and specialty tools for projects around the CSRA.</p>
    <div className="actions"><a className="btn" href="#request-equipment">Request Equipment</a><a className="btn2" href="tel:7066996990">Call Us</a></div>
  </div></div></section>
  <section id="equipment"><div className="container"><div className="section-head">
    <span className="eyebrow">Our expanding equipment fleet</span><h2>Available equipment categories</h2>
    <p className="muted">See daily and weekly rates below and send your preferred dates. We will check availability and confirm your rental directly.</p>
  </div><div className="grid three">
    {equipment.map(item=><article id={item.id} className="trailer" key={item.id}><img loading="lazy" src={item.image} alt={item.imageAlt}/><div className="trailer-body"><small className="muted">Illustrative product photo · {item.imageCredit}</small>
      <h3>{item.name}</h3><p className="muted">{item.description}</p>
      <p className="price">${item.dailyRateCents/100} / 24 hours · ${item.weeklyRateCents/100} / week</p>
      <div className="chips"><span className="chip">${item.depositCents/100} refundable security deposit</span><span className="chip">Pickup by arrangement</span></div>
      <p className="muted">{item.id === 'generac-gp6500' || item.id === 'predator-earth-auger' ? 'Return with the same fuel level recorded at pickup. Included accessories are confirmed before handoff.' : 'Return with all included parts and accessories. Item details are confirmed before handoff.'}</p>
      <Link className="btn" href={`/equipment?item=${encodeURIComponent(item.id)}#request-equipment`}>Request Availability</Link>
    </div></article>)}
    <article className="trailer"><div className="trailer-body">
      <h3>Additional Generator Coming Soon</h3><p className="muted">Another generator is being added. Model details and rental information will be posted once confirmed.</p>
      <div className="chips"><span className="chip">New inventory</span><span className="chip">Local rentals</span></div>
      <a className="btn" href="tel:7066996990">Ask What's Available</a>
    </div></article>
  </div></div></section>
  <section><div className="container"><div className="section-head"><span className="eyebrow">Simple local rentals</span><h2>How equipment rental works</h2></div>
    <div className="grid three">
      <div className="panel"><h3>1. Request your dates</h3><p className="muted">Choose an item and pickup and return times. A request does not reserve equipment or charge you.</p></div>
      <div className="panel"><h3>2. We confirm the details</h3><p className="muted">We check availability, confirm the equipment and included accessories, arrange a meeting place, and review the rental terms, deposit, and payment with you.</p></div>
      <div className="panel"><h3>3. Pick up and return</h3><p className="muted">We document condition and fuel level where applicable at handoff and inspect the equipment and accessories on return.</p></div>
    </div>
    <div className="panel" style={{marginTop:24}}><h2>Rental and return basics</h2>
      <p className="muted">A rental day is a 24-hour period from the agreed pickup time. Extra time rounds up to another 24-hour period, with the weekly rate used when it costs less. Contact us before your scheduled return to request an extension; it depends on availability and adds rental charges.</p>
      <p className="muted">The listed $50 is a refundable security deposit, separate from the rental price. If approved, we explain payment before handoff and return the deposit after inspection, less any documented charges under the signed rental terms. It is not a damage limit.</p>
      <p className="muted">Return equipment reasonably clean, with all included parts. For the generator and auger, return the same fuel level recorded at pickup. Missing fuel is charged at the documented cost to replace it. Excessive cleaning, missing parts, or damage beyond ordinary wear may result in documented charges. We review any charges with you.</p>
      <p className="muted">Bring a valid photo ID at pickup. We confirm item-specific instructions and accessories before release. For questions about a project or meeting location, call or text <a href="tel:7066996990">706-699-6990</a>.</p>
    </div>
  </div></section>
  <section id="request-equipment"><div className="container"><EquipmentRequestForm initialItem={initialItem}/></div></section>
  <section><div className="container"><div className="panel"><h2>Need a trailer too?</h2>
    <p className="muted">Our car hauler and dump trailer rentals still have online availability and booking requests.</p>
    <Link className="btn" href="/#trailers">View Trailers</Link></div></div></section>
 </main>
}
