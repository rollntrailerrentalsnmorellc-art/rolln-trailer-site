import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {fallbackImages,money,Trailer} from '@/lib/trailers';
import Availability from '@/components/Availability';

export default async function TrailerPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('*').eq('slug',slug).eq('is_public',true).single();
 if(!data) notFound(); const t=data as Trailer;
 const images=(t.image_urls?.length?t.image_urls:fallbackImages[t.slug])||['/images/Logo.png'];
 const schema={"@context":"https://schema.org","@type":"Product","name":t.name,"description":t.description,"image":images.map(x=>'https://rollntrailerrentals.com'+x),"offers":{"@type":"Offer","priceCurrency":"USD","price":t.daily_rate_cents/100,"availability":"https://schema.org/InStock"}};
 return <main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <section><div className="container"><p className="muted"><a href="/">Home</a> / Trailers / {t.name}</p><div className="hero-grid">
   <div className="gallery"><div className="gallery-main"><img src={images[0]} alt={t.name}/></div><div className="grid three">{images.slice(1).map((x,i)=><img key={x} src={x} alt={`${t.name} photo ${i+2}`} style={{borderRadius:12,aspectRatio:'4/3',objectFit:'cover'}}/>)}</div></div>
   <div><span className="eyebrow">Trailer details</span><h1>{t.name}</h1><p className="muted">{t.description}</p><div className="chips"><span className="chip">{money(t.daily_rate_cents)}/day</span><span className="chip">{money(t.weekly_rate_cents)}/week</span><span className="chip">{t.gvwr_lbs?.toLocaleString()} lb GVWR</span><span className="chip">{money(t.deposit_cents)} deposit</span></div><Availability trailerId={t.id}/></div>
  </div></div></section>
 </main>
}
