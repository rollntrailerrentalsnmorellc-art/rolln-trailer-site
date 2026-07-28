import './globals.css';
import Link from 'next/link';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rollntrailerrentals.com'),
  title: { default: "Roll'N Trailer Rentals N More LLC", template: "%s | Roll'N Trailer Rentals" },
  description: "Mobile-friendly trailer rentals serving Augusta, Georgia and the CSRA.",
  openGraph: { type: 'website', title: "Roll'N Trailer Rentals N More LLC", description: "Reliable trailer rentals in Augusta and the CSRA." }
};

export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>
  <header className="top"><div className="container nav">
   <Link className="brand" href="/"><img src="/images/RTRlogo.png" alt="Roll'N Trailer Rentals logo"/><strong>ROLL'N TRAILER<br/>RENTALS N MORE</strong></Link>
   <nav className="desktop-nav"><Link href="/#trailers">Trailers</Link><Link href="/#how">How It Works</Link><Link href="/portal">Customer Portal</Link><Link href="/owner">Owner</Link></nav>
   <Link className="btn" href="/#trailers">Book Now</Link>
  </div></header>
  {children}
  <footer className="footer"><div className="container"><strong>Roll'N Trailer Rentals N More LLC</strong><p>Serving Augusta, Evans, Grovetown, North Augusta, Aiken and the CSRA.</p></div></footer>
  <div className="mobilebar"><a href="tel:7066996990">Call</a><a href="sms:7066996990">Text</a><a href="/#trailers">Book</a></div>
 </body></html>
}