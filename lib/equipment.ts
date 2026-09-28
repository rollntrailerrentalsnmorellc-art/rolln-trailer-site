export type EquipmentItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  imageCredit: string;
  dailyRateCents: number;
  weeklyRateCents: number;
  depositCents: number;
};

export const equipment: EquipmentItem[] = [
  {
    id: 'generac-gp6500', name: 'Generac GP6500 Generator',
    description: 'Gas-powered portable generator for temporary power, job sites and backup power needs.',
    image: 'https://www.mainstreetmower.com/cdn/shop/products/5940--A_2.png?v=1674157769&width=1214',
    imageAlt: 'Illustrative stock product photo of a Generac GP6500 generator',
    imageCredit: 'Main Street Mower', dailyRateCents: 6000, weeklyRateCents: 30000, depositCents: 5000,
  },
  {
    id: 'predator-earth-auger', name: 'Predator Gas-Powered Earth Auger',
    description: 'Harbor Freight Predator gas-powered earth auger with a 6-inch bit for fence posts, planting and digging jobs.',
    image: 'https://d1886jwfak369j.cloudfront.net/media/products/166/730e12ce-7cea-4a2c-889d-8fc86cac03f6.jpeg',
    imageAlt: 'Illustrative stock product photo of a Predator gas-powered earth auger',
    imageCredit: 'FerreDepot', dailyRateCents: 5000, weeklyRateCents: 25000, depositCents: 5000,
  },
  {
    id: 'werner-mt26-ladder', name: 'Werner MT-26 Mk 6 Multi-Position Ladder',
    description: '25 ft adjustable aluminum multi-position ladder, Type IA, rated for a 300 lb total load including user and materials. Manufacturer-listed maximum reach: 25 ft 10 in.',
    image: 'https://wernerco.widen.net/content/thwktpld8v/jpeg/MT-26_PI_LeaningExtended.jpeg?color=ffffffff&h=1200&position=c&quality=80&u=qlpvmu&w=1200',
    imageAlt: 'Illustrative Werner MT-26 multi-position aluminum ladder product photo',
    imageCredit: 'Werner', dailyRateCents: 2500, weeklyRateCents: 11000, depositCents: 5000,
  },
  {
    id: 'single-stack-baker-scaffold', name: 'Single-Stack Baker Scaffold',
    description: 'One-section portable Baker-style scaffold for painting and maintenance. Platform height and load rating will be confirmed before rental.',
    image: 'https://www.actionis.com/media/catalog/product/1/6/1636349.jpg?bg-color=255%2C255%2C255&canvas=700%3A700&fit=bounds&height=700&quality=80&width=700',
    imageAlt: 'Illustrative stock photo of a single-stack Baker-style rolling scaffold',
    imageCredit: 'Action Industrial Supply', dailyRateCents: 3500, weeklyRateCents: 15000, depositCents: 5000,
  },
];

export function equipmentRentalCents(item: EquipmentItem, milliseconds: number) {
  const days = Math.max(1, Math.ceil(milliseconds / 86_400_000));
  const weeks = Math.floor(days / 7);
  const remaining = days % 7;
  return weeks * item.weeklyRateCents + Math.min(remaining * item.dailyRateCents, item.weeklyRateCents);
}
