import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

const siteUrl = 'https://rollntrailerrentals.com';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rollntrailerrentals.com'),
  title: {
    default: "Trailer Rentals in Augusta, GA | Roll'N Trailer Rentals",
    template: "%s | Roll'N Trailer Rentals",
  },
  description: "Rent car haulers and dump trailers in Augusta, Evans, Grovetown, Martinez, Harlem and across the CSRA. Check availability and request your trailer online.",
  keywords: [
    'trailer rental Augusta GA',
    'dump trailer rental Augusta GA',
    'car hauler rental Augusta GA',
    'trailer rental CSRA',
    'trailer rental Evans GA',
    'trailer rental Grovetown GA',
  ],
  alternates: { canonical: siteUrl },
  applicationName: "Roll'N Trailer Rentals N More LLC",
  authors: [{ name: "Roll'N Trailer Rentals N More LLC", url: siteUrl }],
  creator: "Roll'N Trailer Rentals N More LLC",
  publisher: "Roll'N Trailer Rentals N More LLC",
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: "Roll'N Trailer Rentals",
    title: "Trailer Rentals in Augusta, GA | Roll'N Trailer Rentals",
    description: "Car hauler and dump trailer rentals serving Augusta and the CSRA.",
    locale: 'en_US',
    images: [{ url: '/images/RTRlogo.png', alt: "Roll'N Trailer Rentals N More LLC" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Trailer Rentals in Augusta, GA | Roll'N Trailer Rentals",
    description: "Car hauler and dump trailer rentals serving Augusta and the CSRA.",
    images: ['/images/RTRlogo.png'],
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>
  <header className="top"><div className="container nav">
   <Link className="brand" href="/"><img src="/images/RTRlogo.png" alt="Roll'N Trailer Rentals logo"/><strong>ROLL'N TRAILER<br/>RENTALS N MORE</strong></Link>
   <nav className="desktop-nav"><Link href="/#trailers">Trailers</Link><Link href="/#how">How It Works</Link><Link href="/portal">Customer Portal</Link><Link href="/owner">Owner</Link></nav>
   <Link className="btn" href="/#trailers">Book Now</Link>
  </div></header>
  {children}
  <footer className="footer"><div className="container"><strong>Roll'N Trailer Rentals N More LLC</strong><p>Serving Augusta, Evans, Grovetown, Martinez, Harlem, North Augusta, Aiken and nearby CSRA communities.</p><p><a href="mailto:rollntrailer@gmail.com">rollntrailer@gmail.com</a> · <a href="tel:7066996990">706-699-6990</a> · Rental requests available 24/7</p></div></footer>
  <div className="mobilebar"><a href="tel:7066996990">Call</a><a href="sms:7066996990">Text</a><a href="/#trailers">Book</a></div>
 </body></html>
}
