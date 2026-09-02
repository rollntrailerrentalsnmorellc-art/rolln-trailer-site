"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type HeroSlide = {
  src: string;
  alt: string;
  title: string;
  caption: string;
};

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const showPrevious = () => {
    setActive((current) => (current - 1 + slides.length) % slides.length);
  };

  const showNext = () => {
    setActive((current) => (current + 1) % slides.length);
  };

  const slide = slides[active];

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Roll'N Trailer Rentals fleet photos"
    >
      <Image
        key={slide.src}
        className="hero-carousel-image"
        src={slide.src}
        alt={slide.alt}
        fill
        sizes="(min-width: 760px) 48vw, 100vw"
        priority={active === 0}
      />

      <button className="carousel-arrow carousel-arrow-left" type="button" onClick={showPrevious} aria-label="Previous photo">‹</button>
      <button className="carousel-arrow carousel-arrow-right" type="button" onClick={showNext} aria-label="Next photo">›</button>

      <div className="hero-label" aria-live="polite">
        <strong>{slide.title}</strong><br />
        <span className="muted">{slide.caption}</span>
        <div className="carousel-dots" aria-label={`Photo ${active + 1} of ${slides.length}`}>
          {slides.map((item, index) => (
            <button
              key={item.src}
              className={index === active ? "carousel-dot active" : "carousel-dot"}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}: ${item.title}`}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
