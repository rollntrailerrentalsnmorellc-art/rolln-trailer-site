import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
  const bookingWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const invoiceWebhookSecret = process.env.STRIPE_INVOICE_WEBHOOK_SECRET;

if (!signature) {
  return NextResponse.json(
    { error: "Stripe signature is missing." },
    { status: 400 }
  );
}

if (!bookingWebhookSecret && !invoiceWebhookSecret) {
  return NextResponse.json(
    { error: "Webhook configuration is missing." },
    { status: 400 }
  );
}

let event: Stripe.Event | null = null;

if (bookingWebhookSecret) {
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      bookingWebhookSecret
    );
  } catch {
    // Try the invoice webhook secret next.
  }
}

if (!event && invoiceWebhookSecret) {
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      invoiceWebhookSecret
    );
  } catch {
    // Neither secret matched.
  }
}

if (!event) {
  console.error("Stripe webhook signature verification failed.");

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
  pickup_at,
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
    stripe_customer_id:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
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

console.log(`Deposit paid for booking ${bookingId}: ${session.id}`);

if (currentBooking.intake_completed_at && currentBooking.agreement_accepted_at) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://rollntrailerrentals.com");
  const { error: ownerEmailError } = await resend.emails.send({
    from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
    to: ["rollntrailer@gmail.com"],
    replyTo: currentBooking.customer_email,
    subject: `Ready for approval — ${currentBooking.confirmation_code}`,
    html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Booking ready for approval</h2><p><strong>${currentBooking.customer_name}</strong> has uploaded both documents, signed the rental agreement, and paid the $50 deposit.</p><p>Confirmation: <strong>${currentBooking.confirmation_code}</strong></p><p><a href="${siteUrl}/owner/bookings/${currentBooking.id}" style="display:inline-block;background:#7DFB00;color:#111827;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:800">Review &amp; Approve</a></p></div>`,
  });
  if (ownerEmailError) console.error("Ready-for-approval email failed:", ownerEmailError);
}
}
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const chargeId = paymentIntent.metadata?.charge_id;
      const bookingId = paymentIntent.metadata?.booking_id;

      if (chargeId && bookingId) {
        const supabase = createAdminClient();
        let stripeCharge: Stripe.Charge | null = null;

        if (typeof paymentIntent.latest_charge === "string") {
          stripeCharge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        }

        const paidAt = new Date().toISOString();
        await supabase.from("charges").update({
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
          paid_at: paidAt,
        }).eq("id", chargeId);

        await supabase.from("payments").upsert({
          booking_id: bookingId,
          charge_id: chargeId,
          amount_cents: paymentIntent.amount_received,
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: stripeCharge?.id ?? null,
          stripe_receipt_url: stripeCharge?.receipt_url ?? null,
          paid_at: paidAt,
        }, { onConflict: "stripe_payment_intent_id" });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const chargeId = paymentIntent.metadata?.charge_id;
      if (chargeId) {
        await createAdminClient().from("charges").update({ status: "failed" }).eq("id", chargeId);
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const supabase = createAdminClient();
      const extraChargeId = invoice.metadata?.charge_id || null;
      let bookingId = invoice.metadata?.booking_id || null;

      if (extraChargeId && bookingId) {
        const paidAt = new Date().toISOString();
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("charge_id", extraChargeId)
          .maybeSingle();

        await supabase.from("charges").update({
          status: "succeeded",
          stripe_invoice_id: invoice.id,
          paid_at: paidAt,
        }).eq("id", extraChargeId);

        if (!existingPayment) {
          await supabase.from("payments").insert({
            booking_id: bookingId,
            charge_id: extraChargeId,
            amount_cents: invoice.amount_paid,
            status: "succeeded",
            stripe_receipt_url: invoice.hosted_invoice_url,
            paid_at: paidAt,
          });
        }

        const approvedReturnAt = invoice.metadata?.approved_return_at;
        if (invoice.metadata?.charge_type === "extra_day" && approvedReturnAt) {
          const { data: approvedExtension } = await supabase
            .from("extensions")
            .select("id, status")
            .eq("booking_id", bookingId)
            .eq("approved_return_at", approvedReturnAt)
            .maybeSingle();

          if (approvedExtension) {
            if (approvedExtension.status !== "paid") {
              await supabase.from("extensions").update({ status: "paid" }).eq("id", approvedExtension.id);
            }
          } else {
            await supabase.from("extensions").insert({
              booking_id: bookingId,
              requested_return_at: approvedReturnAt,
              approved_return_at: approvedReturnAt,
              amount_cents: invoice.amount_paid,
              status: "paid",
              owner_note: invoice.description,
            });
          }
          await supabase.from("bookings").update({ return_at: approvedReturnAt }).eq("id", bookingId);
        }
      } else {
        if (!bookingId) {
          const { data: bookingByInvoice, error: invoiceLookupError } = await supabase
            .from("bookings")
            .select("id")
            .eq("stripe_balance_invoice_id", invoice.id)
            .maybeSingle();

          if (invoiceLookupError) {
            console.error("Unable to find booking by Stripe invoice ID:", invoiceLookupError);
          }
          bookingId = bookingByInvoice?.id || null;
        }

        if (!bookingId) {
          console.log("Paid invoice could not be matched to a booking:", invoice.id);
        } else {
          const { data: currentBooking, error: lookupError } = await supabase
            .from("bookings")
            .select("id, total_cents, amount_paid_cents, stripe_balance_invoice_id")
            .eq("id", bookingId)
            .single();

          if (lookupError || !currentBooking) {
            console.error("Unable to find booking for paid balance invoice:", lookupError);
          } else if (!currentBooking.stripe_balance_invoice_id || currentBooking.stripe_balance_invoice_id === invoice.id) {
            const { error: updateError } = await supabase
              .from("bookings")
              .update({ amount_paid_cents: currentBooking.total_cents ?? invoice.amount_paid })
              .eq("id", bookingId);

            if (updateError) {
              console.error("Unable to update booking after balance payment:", updateError);
            } else {
              console.log(`Balance paid for booking ${bookingId}: ${invoice.id}`);
            }
          }
        }
      }
    }
return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
