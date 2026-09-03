import type {MetadataRoute} from 'next';

export default function robots():MetadataRoute.Robots{
 return {
  rules:{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/booking/','/customer-login','/login','/owner/','/portal']},
  sitemap:'https://rollntrailerrentals.com/sitemap.xml',
  host:'https://rollntrailerrentals.com',
 };
}
