import type {MetadataRoute} from 'next';
import {createClient} from '@/lib/supabase/server';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const supabase=await createClient();
 const {data}=await supabase.from('trailers').select('slug').eq('is_public',true).neq('status','inactive').order('sort_order');
 return [
  {url:'https://rollntrailerrentals.com',changeFrequency:'weekly',priority:1},
  ...(data??[]).map(trailer=>({url:`https://rollntrailerrentals.com/trailers/${trailer.slug}`,changeFrequency:'weekly' as const,priority:0.8})),
 ];
}
