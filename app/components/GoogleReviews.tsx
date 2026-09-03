'use client';

import {useEffect,useState} from 'react';

const reviews=[
 {name:'Chris Foley',when:'4 weeks ago',quote:'Clean equipment that pulls well.'},
 {name:'Marvin Martin',when:'2 weeks ago',quote:'Top notch service.'},
 {name:'Ace Williams',when:'2 weeks ago',quote:'Quick, fast and convenient service!'},
 {name:'Devin Kline',when:'2 weeks ago',quote:'Super convenient and easy.'},
 {name:'Aaron Clark',when:'1 month ago',quote:'Very nice people and excellent service.'},
];

const googleListing='https://www.google.com/maps/place/Roll%E2%80%99N+Trailer+Rentals+N+More+LLC/@33.3903105,-81.9184715,9z/data=!4m8!3m7!1s0xdffa2f8231fa523:0xfe6e91a03f44cb5a!8m2!3d33.3903105!4d-81.9184715!9m1!1b1!16s%2Fg%2F11yzlyqsfc';

export default function GoogleReviews(){
 const [current,setCurrent]=useState(0);
 const [paused,setPaused]=useState(false);
 const show=(index:number)=>setCurrent((index+reviews.length)%reviews.length);

 useEffect(()=>{
  if(paused) return;
  const timer=window.setInterval(()=>setCurrent(index=>(index+1)%reviews.length),6500);
  return()=>window.clearInterval(timer);
 },[paused]);

 const review=reviews[current];
 return <div className="reviews-layout">
  <div className="reviews-summary">
   <span className="google-mark" aria-hidden="true">G</span>
   <div><strong>Excellent on Google</strong><div className="review-rating"><span>5.0</span><span className="stars" aria-label="5 out of 5 stars">★★★★★</span></div><small>Based on 7 customer reviews</small></div>
   <a className="btn2" href={googleListing} target="_blank" rel="noreferrer">View or leave a Google review</a>
  </div>
  <div className="review-carousel" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false)}}>
   <button className="review-arrow" type="button" onClick={()=>show(current-1)} aria-label="Previous review">‹</button>
   <figure className="review-card" aria-live="polite">
    <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
    <blockquote>“{review.quote}”</blockquote>
    <figcaption><strong>{review.name}</strong><span>{review.when} • Google review</span></figcaption>
   </figure>
   <button className="review-arrow" type="button" onClick={()=>show(current+1)} aria-label="Next review">›</button>
   <div className="review-dots" aria-label="Choose a review">{reviews.map((item,index)=><button key={item.name} type="button" className={index===current?'active':''} onClick={()=>show(index)} aria-label={`Show review ${index+1}`} aria-current={index===current?'true':undefined}/>)}</div>
  </div>
 </div>;
}
