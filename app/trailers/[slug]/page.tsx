import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {fallbackImages,money,Trailer} from '@/lib/trailers';
import Availability from '@/components/Availability';
import type {Metadata} from 'next';

const siteUrl='https://rollntrailerrentals.com';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params; const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('name,description,image_urls,status,is_public').eq('slug',slug).single();
 if(!data||!data.is_public||data.status==='inactive') return {title:'Trailer Not Available',robots:{index:false,follow:false}};
 const images=(data.image_urls?.length?data.image_urls:fallbackImages[slug])||['/images/RTRlogo.png'];
 const title=`${data.name} Rental in Augusta, GA`;
 const description=data.description||`Rent the ${data.name} from Roll'N Trailer Rentals in Augusta and the CSRA.`;
 const canonical=`${siteUrl}/trailers/${slug}`;
 return {title,description,alternates:{canonical},openGraph:{type:'website',url:canonical,title,description,images:[{url:images[0],alt:data.name}]},twitter:{card:'summary_large_image',title,description,images:[images[0]]}};
}

export default async function TrailerPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('*').eq('slug',slug).eq('is_public',true).neq('status','inactive').single();
 if(!data) notFound(); const t=data as Trailer;
 const images=(t.image_urls?.length?t.image_urls:fallbackImages[t.slug])||['/images/Logo.png'];
 const canonical=`${siteUrl}/trailers/${t.slug}`;
 const schema={"@context":"https://schema.org","@type":"Product","@id":`${canonical}#product`,"name":t.name,"description":t.description,"url":canonical,"image":images.map(x=>x.startsWith('http')?x:siteUrl+x),"brand":{"@type":"Brand","name":"Roll'N Trailer Rentals"},"offers":{"@type":"Offer","url":canonical,"priceCurrency":"USD","price":t.daily_rate_cents/100,"availability":"https://schema.org/InStock","seller":{"@id":"https://rollntrailerrentals.com/#business"},"eligibleRegion":["Augusta GA","Evans GA","Grovetown GA","Martinez GA","Harlem GA","North Augusta SC","Aiken SC"]}};
 return <main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <section><div className="container"><p className="muted"><a href="/">Home</a> / Trailers / {t.name}</p><div className="hero-grid">
   <div className="gallery"><div className="gallery-main"><img src={images[0]} alt={t.name}/></div><div className="grid three">{images.slice(1).map((x,i)=><img key={x} src={x} alt={`${t.name} photo ${i+2}`} style={{borderRadius:12,aspectRatio:'4/3',objectFit:'cover'}}/>)}</div></div>
   <div><span className="eyebrow">Trailer details</span><h1>{t.name}</h1><p className="muted">{t.description}</p><div className="chips"><span className="chip">{money(t.daily_rate_cents)}/day</span><span className="chip">{money(t.weekly_rate_cents)}/week</span><span className="chip">{t.gvwr_lbs?.toLocaleString()} lb GVWR</span><span className="chip">{money(t.deposit_cents)} deposit</span></div><Availability trailerId={t.id}/></div>
  </div></div></section>
 </main>
}
