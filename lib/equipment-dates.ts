import {TZDate} from '@date-fns/tz';

export function parseEquipmentDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  const date = new TZDate(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), 0, 'America/New_York');
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d) || date.getHours() !== Number(h) || date.getMinutes() !== Number(min)) return null;
  return date;
}

export function validEquipmentDates(pickup: Date | null, returnAt: Date | null) {
  if (!pickup || !returnAt) return false;
  const duration = returnAt.getTime() - pickup.getTime();
  return pickup.getTime() >= Date.now() - 60_000 && pickup.getTime() <= Date.now() + 366 * 86_400_000 && duration > 0 && duration <= 30 * 86_400_000;
}
