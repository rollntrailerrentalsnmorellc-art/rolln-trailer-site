import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Equipment Rentals in Augusta, GA',
 description: "Generators, augers, power tools and equipment rentals from Roll'N Trailer Rentals N More LLC serving Augusta and the CSRA.",
};

export default function EquipmentPage(){
 return <main>
  <section className="hero"><div className="container"><div className="card hero-copy">
    <span className="eyebrow">The N More part</span><h1>Equipment rentals</h1>
    <p>We are expanding beyond trailers with generators, outdoor power equipment and specialty tools for projects around the CSRA.</p>
    <div className="actions"><a className="btn" href="tel:7066996990">Call for Availability</a><a className="btn2" href="sms:7066996990">Text Us</a></div>
  </div></div></section>
  <section id="equipment"><div className="container"><div className="section-head">
    <span className="eyebrow">Our expanding equipment fleet</span><h2>Available equipment categories</h2>
    <p className="muted">Our equipment lineup includes a Generac GP6500 generator, a Harbor Freight Predator gas-powered earth auger, and an adjustable aluminum ladder. See daily and weekly rates below, or contact us for current availability.</p>
  </div><div className="grid three">
    <article id="generators" className="trailer"><div className="trailer-body">
      <h3>Generac GP6500 Generator</h3><p className="muted">Gas-powered portable generator for temporary power, job sites and backup power needs. Call or text to confirm availability.</p><p className="price">$60 / 24 hours · $300 / week</p>
      <div className="chips"><span className="chip">Portable power</span><span className="chip">$50 deposit</span></div>
      <a className="btn" href="tel:7066996990">Check Availability</a>
    </div></article>
    <article id="tools" className="trailer"><div className="trailer-body">
      <h3>Predator Gas-Powered Earth Auger</h3><p className="muted">Harbor Freight Predator earth auger for fence posts, planting and digging jobs. Contact us for available bit sizes and availability.</p><p className="price">$50 / 24 hours · $250 / week</p>
      <div className="chips"><span className="chip">Power equipment</span><span className="chip">$50 deposit</span></div>
      <a className="btn" href="sms:7066996990">Ask About the Auger</a>
    </div></article>
    <article id="ladders" className="trailer"><div className="trailer-body">
      <h3>Werner MT-26 Mk 6 Multi-Position Ladder</h3>
      <p className="muted">25 ft adjustable aluminum multi-position ladder, Type IA extra heavy duty, rated for 300 lb total load including user and materials. Manufacturer-listed maximum reach: 25 ft 10 in. Follow manufacturer instructions for each configuration.</p>
      <p className="price">$25 / day · $110 / week</p>
      <div className="chips"><span className="chip">Adjustable ladder</span><span className="chip">$50 deposit</span></div>
      <a className="btn" href="sms:7066996990">Ask About the Ladder</a>
    </div></article>
    <article id="scaffold" className="trailer"><div className="trailer-body">
      <h3>Single-Stack Baker Scaffold</h3>
      <p className="muted">One-section portable Baker-style scaffold for painting, maintenance and other elevated work. Platform height and load rating to be confirmed.</p>
      <p className="price">$35 / 24 hours · $150 / week</p>
      <div className="chips"><span className="chip">Single stack</span><span className="chip">$50 deposit</span></div>
      <a className="btn" href="sms:7066996990">Ask About the Scaffold</a>
    </div></article>
    <article className="trailer"><div className="trailer-body">
      <h3>Additional Generator Coming Soon</h3><p className="muted">Another generator is being added. Model details and rental information will be posted once confirmed.</p>
      <div className="chips"><span className="chip">New inventory</span><span className="chip">Local rentals</span></div>
      <a className="btn" href="tel:7066996990">Ask What's Available</a>
    </div></article>
  </div></div></section>
  <section><div className="container"><div className="panel"><h2>Need a trailer too?</h2>
    <p className="muted">Our car hauler and dump trailer rentals still have online availability and booking requests.</p>
    <Link className="btn" href="/#trailers">View Trailers</Link></div></div></section>
 </main>
}