export function GET(){
 return Response.json({
  name:"Roll'N Trailer Owner",
  short_name:"Roll'N Owner",
  description:"Private rental business management for Roll'N Trailer Rentals N More LLC.",
  start_url:'/owner',scope:'/owner/',display:'standalone',orientation:'portrait-primary',
  background_color:'#070907',theme_color:'#070907',
  icons:[{src:'/images/RTRlogo.png',sizes:'1024x1024',type:'image/png',purpose:'any maskable'}],
 },{headers:{'Content-Type':'application/manifest+json','Cache-Control':'public, max-age=3600'}});
}
