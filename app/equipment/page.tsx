import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Generator & Equipment Rentals in Augusta, GA',
 description: "Generators, augers, power tools and equipment rentals from Roll'N Trailer Rentals N More LLC serving Augusta and the CSRA.",
};

export default function EquipmentPage(){
 return <main>
  <section className="hero"><div className="container"><div className="card hero-copy">
    <span className="eyebrow">The N More part</span><h1>Generators, tools & equipment rentals</h1>
    <p>We are expanding beyond trailers with generators, outdoor power equipment and specialty tools for projects around the CSRA.</p>
    <div className="actions"><a className="btn" href="tel:7066996990">Call for Availability</a><a className="btn2" href="sms:7066996990">Text Us</a></div>
  </div></div></section>
  <section id="generators"><div className="container"><div className="section-head">
    <span className="eyebrow">Portable power</span><h2>Generator Rentals</h2>
    <p className="muted">Generators are being added to the rental fleet now. Exact models, output, rates and online availability will be listed here as inventory is finalized.</p>
  </div><div className="grid three"><article className="trailer"><div className="trailer-body">
    <h3>Portable Generators</h3><p className="muted">For backup power, job sites, outdoor events and temporary power needs.</p>
    <div className="chips"><span className="chip">Inventory expanding</span><span className="chip">CSRA rentals</span></div>
    <a className="btn" href="tel:7066996990">Check Availability</a>
  </div></article></div></div></section>
  <section id="tools"><div className="container"><div className="section-head">
    <span className="eyebrow">Tools & equipment</span><h2>Power Tools & Specialty Equipment</h2>
    <p className="muted">Rent equipment for the job instead of buying a tool you may only need once.</p>
  </div><div className="grid three">
    <article className="trailer"><div className="trailer-body"><h3>Augers</h3>
      <p className="muted">For fence posts, planting and digging jobs. Model, bit sizes and rental rates will be added as inventory is finalized.</p>
      <div className="chips"><span className="chip">Power equipment</span><span className="chip">Call or text</span></div>
      <a className="btn" href="sms:7066996990">Ask About the Auger</a></div></article>
    <article className="trailer"><div className="trailer-body"><h3>More Equipment Coming</h3>
      <p className="muted">We are actively adding useful power tools and rental equipment. Check back as the N More fleet grows.</p>
      <div className="chips"><span className="chip">New inventory</span><span className="chip">Local rental</span></div>
      <a className="btn" href="tel:7066996990">Ask What's Available</a></div></article>
  </div></div></section>
  <section><div className="container"><div className="panel"><h2>Need a trailer too?</h2>
    <p className="muted">Our car hauler and dump trailer rentals still have online availability and booking requests.</p>
    <Link className="btn" href="/#trailers">View Trailers</Link></div></div></section>
 </main>
}