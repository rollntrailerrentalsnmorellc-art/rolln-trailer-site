import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {fallbackImages,money,Trailer} from '@/lib/trailers';
import HeroCarousel from '@/app/components/HeroCarousel';

export const revalidate = 60;

const heroSlides = [
 {src:'/images/dump-in-use-brush.jpeg',alt:'Blue dump trailer loaded with brush and tree limbs',title:'Brush hauling made easier',caption:'Load up yard debris and keep the cleanup moving.'},
 {src:'/images/car1.jpeg',alt:'20 foot steel deck car hauler trailer ready for rent',title:'20 ft Steel Deck Car Hauler',caption:'Built for vehicles, UTVs and compact equipment.'},
 {src:'/images/dump-in-use-mulch-yard.jpeg',alt:'Blue dump trailer loaded with mulch at a landscape material yard',title:'Loaded and ready to roll',caption:'A full load of mulch without the mess in your truck bed.'},
 {src:'/images/dump-in-use-delivery.jpeg',alt:'Blue dump trailer delivering mulch at a customer driveway',title:'Bring the job to you',caption:'Mulch and landscaping loads delivered right where you need them.'},
 {src:'/images/car4.jpeg',alt:'Steel deck car hauler connected to a pickup truck',title:'Hook up and get rolling',caption:'A full-width steel deck for dependable hauling.'},
 {src:'/images/dump-in-use-unloading.jpeg',alt:'Blue dump trailer raised while unloading a load of dark mulch',title:'Unload in minutes',caption:'Hydraulic dumping turns a heavy unload into an easy finish.'},
 {src:'/images/dump1.jpeg',alt:'5 by 10 blue dump trailer ready for landscaping work',title:'5×10 Dump Trailer',caption:'Great for landscaping, cleanup, mulch and debris.'},
 {src:'/images/dump-in-use-material-yard.jpeg',alt:'Blue dump trailer loaded with black mulch at a material yard',title:'Built for real work',caption:'From the material yard to the job site and back again.'},
];

const faqItems = [
 {question:'What areas do you serve?',answer:'We serve Augusta, Evans, Grovetown, Martinez, Harlem and nearby communities across the CSRA, including North Augusta and Aiken.'},
 {question:'How do I reserve a trailer?',answer:'Choose a trailer, check your dates and submit a rental request online. We review the request before confirming the rental.'},
 {question:'Is a deposit required?',answer:'Yes. A $50 deposit is collected securely after your request is approved and your rental documents are completed.'},
 {question:'What do I need to tow a trailer?',answer:'You need a properly rated tow vehicle, the correct hitch connection and a working brake controller when required. We verify towing information before approval.'},
 {question:'Can I request a rental at any time?',answer:'Yes. Online rental requests are available 24 hours a day, seven days a week.'},
];

export default async function Home(){
 const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('*').eq('is_public',true).neq('status','inactive').order('sort_order');
 const trailers=(data||[]) as Trailer[];
 const schema={"@context":"https://schema.org","@graph":[
  {"@type":["Organization","LocalBusiness"],"@id":"https://rollntrailerrentals.com/#business","name":"Roll'N Trailer Rentals N More LLC","url":"https://rollntrailerrentals.com","logo":"https://rollntrailerrentals.com/images/RTRlogo.png","image":"https://rollntrailerrentals.com/images/RTRlogo.png","telephone":"+1-706-699-6990","email":"rollntrailer@gmail.com","priceRange":"$$","openingHours":"Mo-Su 00:00-23:59","areaServed":["Augusta GA","Evans GA","Grovetown GA","Martinez GA","Harlem GA","North Augusta SC","Aiken SC"],"hasOfferCatalog":{"@type":"OfferCatalog","name":"Trailer Rentals","itemListElement":[{"@type":"OfferCatalog","name":"Car Hauler Rentals"},{"@type":"OfferCatalog","name":"Dump Trailer Rentals"}]}},
  {"@type":"WebSite","@id":"https://rollntrailerrentals.com/#website","url":"https://rollntrailerrentals.com","name":"Roll'N Trailer Rentals N More LLC","publisher":{"@id":"https://rollntrailerrentals.com/#business"}},
  {"@type":"Service","@id":"https://rollntrailerrentals.com/#trailer-rental-service","name":"Trailer Rental Service","provider":{"@id":"https://rollntrailerrentals.com/#business"},"serviceType":["Car hauler rental","Dump trailer rental"],"areaServed":["Augusta GA","Evans GA","Grovetown GA","Martinez GA","Harlem GA","North Augusta SC","Aiken SC"]},
  {"@type":"FAQPage","mainEntity":faqItems.map(item=>({"@type":"Question","name":item.question,"acceptedAnswer":{"@type":"Answer","text":item.answer}}))}
 ]};
 return <main>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <section className="hero"><div className="container hero-grid">
   <div className="card hero-copy"><span className="eyebrow">Augusta • CSRA • Mobile Booking</span><h1>Rent the right trailer. Get the job done.</h1><p>Choose a trailer, check live availability and reserve from your phone. Secure payments and simple rental management are built in.</p>
    <div className="actions"><Link className="btn" href="#trailers">View Trailers</Link><a className="btn2" href="tel:7066996990">Call 706-699-6990</a></div>
    <div className="stats"><div className="stat"><b>2</b><small>Available Trailers</small></div><div className="stat"><b>24/7</b><small>Requests</small></div><div className="stat"><b>Fast</b><small>Phone Flow</small></div></div>
   </div>
   <div className="card hero-photo"><HeroCarousel slides={heroSlides}/></div>
  </div></section>
  <section id="how"><div className="container"><div className="section-head"><span className="eyebrow">Simple rental process</span><h2>Choose. Confirm. Get rolling.</h2></div>
   <div className="steps"><div className="step"><span>1</span><h3>Choose a trailer</h3><p className="muted">Review photos, capacity and rates.</p></div><div className="step"><span>2</span><h3>Check dates</h3><p className="muted">Live availability helps prevent double booking.</p></div><div className="step"><span>3</span><h3>Reserve securely</h3><p className="muted">Complete documents and deposit from your phone.</p></div></div>
  </div></section>
  <section id="trailers"><div className="container"><div className="section-head"><span className="eyebrow">Your fleet</span><h2>Available trailers</h2><p className="muted">The fleet below is loaded directly from your Supabase database.</p></div>
   <div className="grid three">{trailers.map(t=>{const imgs=(t.image_urls?.length?t.image_urls:fallbackImages[t.slug])||['/images/Logo.png']; return <article className="trailer" key={t.id}><img src={imgs[0]} alt={t.name}/><div className="trailer-body"><div className="row"><h3>{t.name}</h3><span className="price">{money(t.daily_rate_cents)}/day</span></div><p className="muted">{t.description}</p><div className="chips"><span className="chip">{t.gvwr_lbs?.toLocaleString()} lb GVWR</span><span className="chip">{money(t.deposit_cents)} deposit</span></div><Link className="btn" href={`/trailers/${t.slug}`}>View & Check Dates</Link></div></article>})}</div>
  </div></section>
  <section id="faq"><div className="container"><div className="section-head"><span className="eyebrow">Common questions</span><h2>Trailer rental FAQ</h2></div>
   <div className="grid">{faqItems.map(item=><article className="panel" key={item.question}><h3>{item.question}</h3><p className="muted">{item.answer}</p></article>)}</div>
  </div></section>
 </main>
}
