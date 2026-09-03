export type RentalAddOn = { id: string; name: string; description: string; pricePerDayCents: number };

export const rentalAddOns: RentalAddOn[] = [
  { id: "adjustable-ball-mount", name: 'Adjustable 2-5/16" Ball Mount', description: "For a compatible 2-inch receiver.", pricePerDayCents: 1500 },
  { id: "ratchet-strap-set", name: "Heavy-Duty Ratchet Straps (Set of 4)", description: "Extra cargo and equipment tie-downs.", pricePerDayCents: 1200 },
  { id: "axle-strap-set", name: "Vehicle Axle Straps (Set of 4)", description: "Soft-loop straps for vehicle transport.", pricePerDayCents: 1500 },
  { id: "chain-binder-kit", name: "Transport Chain & Binder Kit", description: "Heavy-duty equipment securement.", pricePerDayCents: 2000 },
  { id: "dump-tarp", name: "Dump Trailer Tarp / Debris Net", description: "Covers compatible loose-material loads.", pricePerDayCents: 1000 },
  { id: "appliance-hand-truck", name: "Appliance Hand Truck", description: "For appliances, furniture, and bulky items.", pricePerDayCents: 1500 },
];

const prefix = "ADDONS_JSON:";
export function selectRentalAddOns(ids: string[] = []) { const unique = [...new Set(ids)]; return rentalAddOns.filter((item) => unique.includes(item.id)); }
export function serializeRentalAddOns(items: RentalAddOn[]) { return items.length ? prefix + JSON.stringify(items.map(({ id, name, pricePerDayCents }) => ({ id, name, pricePerDayCents }))) : null; }
export function parseRentalAddOns(notes?: string | null): Array<Pick<RentalAddOn, "id" | "name" | "pricePerDayCents">> { if (!notes?.startsWith(prefix)) return []; try { const value = JSON.parse(notes.slice(prefix.length)); return Array.isArray(value) ? value.filter((item) => item?.id && item?.name && Number.isInteger(item?.pricePerDayCents)) : []; } catch { return []; } }
export function addOnTotal(items: Array<Pick<RentalAddOn, "pricePerDayCents">>, days: number) { return items.reduce((sum, item) => sum + item.pricePerDayCents * days, 0); }
