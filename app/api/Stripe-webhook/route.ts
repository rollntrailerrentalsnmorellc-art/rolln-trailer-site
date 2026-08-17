import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Webhook configuration is missing." },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("Stripe webhook signature error:", error);

      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const bookingId = session.metadata?.booking_id;

      if (!bookingId) {
        console.error("Stripe session is missing booking_id metadata.");

        return NextResponse.json(
          { error: "Booking ID missing from Stripe session." },
          { status: 400 }
        );
      }

      if (session.payment_status === "paid") {
        const supabase = createAdminClient();

const { data: currentBooking, error: lookupError } = await supabase
  .from("bookings")
  .select(`
  id,
  confirmation_code,
  customer_name,
  customer_email,
  amount_paid_cents,
  total_cents,
  deposit_cents,
  intake_completed_at,
  agreement_accepted_at,
  stripe_checkout_session_id,
  stripe_balance_invoice_id
`)
.eq("id", bookingId)
.single();

  
  if (lookupError || !currentBooking) {
    console.error("Unable to load booking payment:", lookupError);
  
    return NextResponse.json(
      { error: "Unable to load booking payment." },
      { status: 500 }
    );
  }
  
 // Stripe can retry webhook events.
// If this exact checkout session was already recorded, don't add it again.
if (currentBooking.stripe_checkout_session_id === session.id) {
  return NextResponse.json({ received: true });
}

const paymentAmount = session.amount_total ?? 0;

const newAmountPaid = Math.min(
  (currentBooking.amount_paid_cents ?? 0) + paymentAmount,
  currentBooking.total_cents ?? paymentAmount
);

const { error } = await supabase
  .from("bookings")
  .update({
    amount_paid_cents: newAmountPaid,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
  })
  .eq("id", bookingId);

if (error) {
  console.error("Unable to update booking payment:", error);

  return NextResponse.json(
    { error: "Unable to update booking payment." },
    { status: 500 }
  );
}

if (
  currentBooking.intake_completed_at &&
  currentBooking.agreement_accepted_at &&
  !currentBooking.stripe_balance_invoice_id &&
  newAmountPaid >= (currentBooking.deposit_cents ?? 0)
) {
  const remainingBalance =
    (currentBooking.total_cents ?? 0) - newAmountPaid;

  if (remainingBalance > 0 && currentBooking.customer_email) {
    const existingCustomers = await stripe.customers.list({
      email: currentBooking.customer_email,
      limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: currentBooking.customer_email,
        name: currentBooking.customer_name ?? undefined,
        metadata: {
          booking_id: currentBooking.id,
          confirmation_code: currentBooking.confirmation_code,
        },
      });

      customerId = customer.id;
    }

    const invoice = await stripe.invoices.create(
      {
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: 7,
        description: `Remaining balance for trailer rental ${currentBooking.confirmation_code}`,
        metadata: {
          booking_id: currentBooking.id,
          confirmation_code: currentBooking.confirmation_code,
        },
      },
      {
        idempotencyKey: `balance-invoice-${currentBooking.id}`,
      }
    );

    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: invoice.id,
        amount: remainingBalance,
        currency: "usd",
        description: `Remaining rental balance — ${currentBooking.confirmation_code}`,
      },
      {
        idempotencyKey: `balance-invoice-item-${currentBooking.id}`,
      }
    );

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      invoice.id,
      {},
      {
        idempotencyKey: `balance-invoice-finalize-${currentBooking.id}`,
      }
    );

    await stripe.invoices.sendInvoice(
      finalizedInvoice.id,
      {},
      {
        idempotencyKey: `balance-invoice-send-${currentBooking.id}`,
      }
    );

    const { error: invoiceSaveError } = await supabase
      .from("bookings")
      .update({
        stripe_balance_invoice_id: finalizedInvoice.id,
      })
      .eq("id", currentBooking.id);

    if (invoiceSaveError) {
      console.error(
        "Balance invoice created but invoice ID could not be saved:",
        invoiceSaveError
      );
    }
  }
}

console.log(
  `Deposit paid for booking ${bookingId}: ${session.id}`
);}
    }     

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
