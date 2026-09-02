import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {fallbackImages,money,Trailer} from '@/lib/trailers';
import HeroCarousel from '@/app/components/HeroCarousel';

export const revalidate = 60;

const heroSlides = [
 {src:'/images/tilt1.jpeg',alt:'22 foot tilt deck equipment trailer ready for rent in Augusta Georgia',title:'22 ft Tilt Deck Equipment Hauler',caption:'Ready for tractors, skid steers and heavy equipment.'},
 {src:'/images/tilt2.jpeg',alt:'Tilt deck equipment trailer connected to a truck with the deck lowered',title:'Tilt deck in action',caption:'Low-angle loading without separate ramps.'},
 {src:'/images/car1.jpeg',alt:'20 foot steel deck car hauler trailer ready for rent',title:'20 ft Steel Deck Car Hauler',caption:'Built for vehicles, UTVs and compact equipment.'},
 {src:'/images/car4.jpeg',alt:'Steel deck car hauler connected to a pickup truck',title:'Hook up and get rolling',caption:'A full-width steel deck for dependable hauling.'},
 {src:'/images/dump1.jpeg',alt:'5 by 10 blue dump trailer ready for landscaping work',title:'5×10 Dump Trailer',caption:'Great for landscaping, cleanup, mulch and debris.'},
 {src:'/images/dump4.jpeg',alt:'Blue dump trailer with its hydraulic bed raised',title:'Hydraulic dumping power',caption:'Unload the job quickly and get back on the road.'},
];

export default async function Home(){
 const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('*').eq('is_public',true).order('sort_order');
 const trailers=(data||[]) as Trailer[];
 const schema={"@context":"https://schema.org","@graph":[
  {"@type":["Organization","LocalBusiness"],"@id":"https://rollntrailerrentals.com/#business","name":"Roll'N Trailer Rentals N More LLC","url":"https://rollntrailerrentals.com","telephone":"+1-706-699-6990","priceRange":"$$","areaServed":["Augusta GA","Evans GA","Grovetown GA","Martinez GA","North Augusta SC","Aiken SC"]},
  {"@type":"WebSite","url":"https://rollntrailerrentals.com","name":"Roll'N Trailer Rentals N More LLC"}
 ]};
 return <main>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <section className="hero"><div className="container hero-grid">
   <div className="card hero-copy"><span className="eyebrow">Augusta • CSRA • Mobile Booking</span><h1>Rent the right trailer. Get the job done.</h1><p>Choose a trailer, check live availability and reserve from your phone. Secure payments and simple rental management are built in.</p>
    <div className="actions"><Link className="btn" href="#trailers">View Trailers</Link><a className="btn2" href="tel:7066996990">Call 706-699-6990</a></div>
    <div className="stats"><div className="stat"><b>3+</b><small>Trailers</small></div><div className="stat"><b>24/7</b><small>Requests</small></div><div className="stat"><b>Fast</b><small>Phone Flow</small></div></div>
   </div>
   <div className="card hero-photo"><HeroCarousel slides={heroSlides}/></div>
  </div></section>
  <section id="how"><div className="container"><div className="section-head"><span className="eyebrow">Simple rental process</span><h2>Choose. Confirm. Get rolling.</h2></div>
   <div className="steps"><div className="step"><span>1</span><h3>Choose a trailer</h3><p className="muted">Review photos, capacity and rates.</p></div><div className="step"><span>2</span><h3>Check dates</h3><p className="muted">Live availability helps prevent double booking.</p></div><div className="step"><span>3</span><h3>Reserve securely</h3><p className="muted">Complete documents and deposit from your phone.</p></div></div>
  </div></section>
  <section id="trailers"><div className="container"><div className="section-head"><span className="eyebrow">Your fleet</span><h2>Available trailers</h2><p className="muted">The fleet below is loaded directly from your Supabase database.</p></div>
   <div className="grid three">{trailers.map(t=>{const imgs=(t.image_urls?.length?t.image_urls:fallbackImages[t.slug])||['/images/Logo.png']; return <article className="trailer" key={t.id}><img src={imgs[0]} alt={t.name}/><div className="trailer-body"><div className="row"><h3>{t.name}</h3><span className="price">{money(t.daily_rate_cents)}/day</span></div><p className="muted">{t.description}</p><div className="chips"><span className="chip">{t.gvwr_lbs?.toLocaleString()} lb GVWR</span><span className="chip">{money(t.deposit_cents)} deposit</span></div><Link className="btn" href={`/trailers/${t.slug}`}>View & Check Dates</Link></div></article>})}</div>
  </div></section>
 </main>
}
