import {NextResponse} from 'next/server';
import {TZDate} from '@date-fns/tz';
import {Resend} from 'resend';
import {equipment, equipmentRentalCents} from '@/lib/equipment';

export const runtime = 'nodejs';

function easternDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new TZDate(year, month - 1, day, hour, minute, 0, 'America/New_York');
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

function field(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.website) return NextResponse.json({requestId: 'received'});

    const item = equipment.find(entry => entry.id === body.equipmentId);
    const name = field(body.customerName, 120);
    const email = field(body.customerEmail, 254).toLowerCase();
    const phone = field(body.customerPhone, 40);
    const intendedUse = field(body.intendedUse, 1000);
    const pickup = easternDate(field(body.pickup, 20));
    const returnAt = easternDate(field(body.returnAt, 20));

    if (!item || !name || !phone || !intendedUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !pickup || !returnAt) {
      return NextResponse.json({error: 'Please complete the equipment, dates, and contact details.'}, {status: 400});
    }
    const duration = returnAt.getTime() - pickup.getTime();
    if (pickup.getTime() < Date.now() - 60_000 || pickup.getTime() > Date.now() + 366 * 86_400_000 || duration <= 0 || duration > 30 * 86_400_000) {
      return NextResponse.json({error: 'Choose a future pickup and a return no more than 30 days later.'}, {status: 400});
    }

    const requestId = `EQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const format = (date: Date) => new Intl.DateTimeFormat('en-US', {dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(date);
    const rental = equipmentRentalCents(item, duration);
    const details = [
      `Equipment request ${requestId}`,
      `Item: ${item.name}`,
      `Pickup: ${format(pickup)}`,
      `Return: ${format(returnAt)}`,
      `Estimated rental: $${(rental / 100).toFixed(2)}`,
      `Deposit on approval: $${(item.depositCents / 100).toFixed(2)}`,
      `Customer: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Use: ${intendedUse}`,
      '',
      'Availability has not been confirmed. No deposit was collected or agreement signed.',
    ].join('\n');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const owner = await resend.emails.send({
      from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
      to: ['rollntrailerrentalsnmorellc@gmail.com'],
      replyTo: email,
      subject: `Equipment request ${requestId} — ${item.name}`,
      text: details,
    });
    if (owner.error) {
      console.error('Equipment request owner email failed:', owner.error);
      return NextResponse.json({error: 'We could not send your request. Please call or text us.'}, {status: 503});
    }

    const customer = await resend.emails.send({
      from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
      to: [email],
      replyTo: 'rollntrailerrentalsnmorellc@gmail.com',
      subject: `We received your equipment request — ${requestId}`,
      text: `Hi ${name},\n\nWe received your request for the ${item.name} from ${format(pickup)} to ${format(returnAt)}. Estimated rental: $${(rental / 100).toFixed(2)}; $${(item.depositCents / 100).toFixed(2)} deposit if approved.\n\nWe will contact you to confirm availability, rental terms, and payment. The equipment is not reserved yet, and no payment has been collected.\n\nReference: ${requestId}\nQuestions? Call or text 706-699-6990.\n\nRoll'N Trailer Rentals N More LLC`,
    });
    if (customer.error) console.error('Equipment request customer email failed:', customer.error);
    return NextResponse.json({requestId}, {status: 201});
  } catch (error) {
    console.error('Equipment request failed:', error);
    return NextResponse.json({error: 'We could not send your request. Please call or text us.'}, {status: 500});
  }
}
