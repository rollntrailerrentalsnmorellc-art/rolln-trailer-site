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
      <div className="chips"><span className="chip">${item.depositCents/100} deposit</span></div>
      <Link className="btn" href={`/equipment?item=${encodeURIComponent(item.id)}#request-equipment`}>Request Dates</Link>
    </div></article>)}
    <article className="trailer"><div className="trailer-body">
      <h3>Additional Generator Coming Soon</h3><p className="muted">Another generator is being added. Model details and rental information will be posted once confirmed.</p>
      <div className="chips"><span className="chip">New inventory</span><span className="chip">Local rentals</span></div>
      <a className="btn" href="tel:7066996990">Ask What's Available</a>
    </div></article>
  </div></div></section>
  <section id="request-equipment"><div className="container"><EquipmentRequestForm initialItem={initialItem}/></div></section>
  <section><div className="container"><div className="panel"><h2>Need a trailer too?</h2>
    <p className="muted">Our car hauler and dump trailer rentals still have online availability and booking requests.</p>
    <Link className="btn" href="/#trailers">View Trailers</Link></div></div></section>
 </main>
}
