import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {fallbackImages,money,Trailer} from '@/lib/trailers';

export const revalidate = 60;

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
   <div className="card hero-photo"><img src="/images/tilt1.jpeg" alt="Tilt deck equipment trailer for rent in Augusta Georgia"/><div className="hero-label"><strong>Built for real jobs</strong><br/><span className="muted">Equipment, vehicles, landscaping and cleanup.</span></div></div>
  </div></section>
  <section id="how"><div className="container"><div className="section-head"><span className="eyebrow">Simple rental process</span><h2>Choose. Confirm. Get rolling.</h2></div>
   <div className="steps"><div className="step"><span>1</span><h3>Choose a trailer</h3><p className="muted">Review photos, capacity and rates.</p></div><div className="step"><span>2</span><h3>Check dates</h3><p className="muted">Live availability helps prevent double booking.</p></div><div className="step"><span>3</span><h3>Reserve securely</h3><p className="muted">Complete documents and deposit from your phone.</p></div></div>
  </div></section>
  <section id="trailers"><div className="container"><div className="section-head"><span className="eyebrow">Your fleet</span><h2>Available trailers</h2><p className="muted">The fleet below is loaded directly from your Supabase database.</p></div>
   <div className="grid three">{trailers.map(t=>{const imgs=(t.image_urls?.length?t.image_urls:fallbackImages[t.slug])||['/images/Logo.png']; return <article className="trailer" key={t.id}><img src={imgs[0]} alt={t.name}/><div className="trailer-body"><div className="row"><h3>{t.name}</h3><span className="price">{money(t.daily_rate_cents)}/day</span></div><p className="muted">{t.description}</p><div className="chips"><span className="chip">{t.gvwr_lbs?.toLocaleString()} lb GVWR</span><span className="chip">{money(t.deposit_cents)} deposit</span></div><Link className="btn" href={`/trailers/${t.slug}`}>View & Check Dates</Link></div></article>})}</div>
  </div></section>
 </main>
}
