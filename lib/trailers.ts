export type Trailer = {
 id:string; slug:string; name:string; description:string|null; status:string;
 gvwr_lbs:number|null; payload_lbs:number|null; daily_rate_cents:number;
 weekly_rate_cents:number|null; deposit_cents:number; image_urls:string[]|null;
};

export const fallbackImages:Record<string,string[]> = {
 '22-ft-tilt-deck-equipment-hauler':['/images/tilt1.jpeg','/images/tilt2.jpeg','/images/tilt3.jpeg','/images/tilt4.jpeg'],
 '20-ft-steel-deck-car-hauler':['/images/car1.jpeg','/images/car2.jpeg','/images/car3.jpeg','/images/car4.jpeg'],
 '5x10-dump-trailer':['/images/dump1.jpeg','/images/dump2.jpeg','/images/dump3.jpeg','/images/dump4.jpeg']
};
export function money(cents:number|null|undefined){ if(cents===null||cents===undefined) return 'Contact us'; return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100); }
