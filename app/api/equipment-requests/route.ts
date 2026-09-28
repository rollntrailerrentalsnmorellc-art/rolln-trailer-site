import {NextResponse} from 'next/server';
import {Resend} from 'resend';
import {equipment, equipmentRentalCents} from '@/lib/equipment';
import {parseEquipmentDate, validEquipmentDates} from '@/lib/equipment-dates';
import {createAdminClient} from '@/lib/supabase/admin';
import {sendOwnerPush} from '@/lib/owner-push';

export const runtime = 'nodejs';

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
    const pickup = parseEquipmentDate(field(body.pickup, 20));
    const returnAt = parseEquipmentDate(field(body.returnAt, 20));

    if (!item || !name || !phone || !intendedUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !pickup || !returnAt) {
      return NextResponse.json({error: 'Please complete the equipment, dates, and contact details.'}, {status: 400});
    }
    if (!validEquipmentDates(pickup, returnAt)) {
      return NextResponse.json({error: 'Choose a future pickup and a return no more than 30 days later.'}, {status: 400});
    }
    const duration = returnAt.getTime() - pickup.getTime();

    const requestId = `EQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const format = (date: Date) => new Intl.DateTimeFormat('en-US', {dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(date);
    const rental = equipmentRentalCents(item, duration);
    let dashboardUrl = '';
    let savedInDashboard = false;
    try {
      const admin = createAdminClient();
      const {data: inventory, error: inventoryError} = await admin.from('equipment_inventory').select('status').eq('id', item.id).single();
      if (!inventoryError && inventory) {
        if (inventory.status !== 'available') return NextResponse.json({error: 'This item is not accepting requests right now. Please call us.'}, {status: 409});
        const {data: conflicts, error: conflictError} = await admin.from('equipment_requests').select('id').eq('equipment_id', item.id)
          .in('status', ['held','active']).lt('pickup_at', returnAt.toISOString()).gt('return_at', pickup.toISOString()).limit(1);
        if (conflictError) throw conflictError;
        if (conflicts?.length) return NextResponse.json({error: 'Those dates are unavailable for this item. Please choose different dates.'}, {status: 409});
        const {data: saved, error: saveError} = await admin.from('equipment_requests').insert({
          reference_code: requestId, equipment_id: item.id, pickup_at: pickup.toISOString(), return_at: returnAt.toISOString(),
          customer_name: name, customer_email: email, customer_phone: phone, intended_use: intendedUse,
          quote_cents: rental, deposit_cents: item.depositCents,
        }).select('id').single();
        if (saveError || !saved) throw saveError || new Error('Unable to save equipment request.');
        savedInDashboard = true;
        dashboardUrl = `https://rollntrailerrentals.com/owner/equipment#request-${saved.id}`;
        await sendOwnerPush({title:'Equipment request',body:`${name} requested ${item.name} · ${requestId}`,url:'/owner/equipment',tag:`equipment-${saved.id}`});
      } else if (inventoryError) {
        // Keeps the existing email path working until the migration is installed.
        console.warn('Equipment tracking unavailable; using email request path:', inventoryError.code);
      }
    } catch (trackingError) {
      // An email still reaches the owner if the dashboard database is temporarily unavailable.
      console.error('Equipment tracking failed; using email request path:', trackingError);
    }
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
      dashboardUrl ? `Owner dashboard: ${dashboardUrl}` : 'Owner dashboard tracking unavailable; reply to this email to follow up.',
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
      if (!savedInDashboard) return NextResponse.json({error: 'We could not send your request. Please call or text us.'}, {status: 503});
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
