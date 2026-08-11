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

        const { error } = await supabase
          .from("bookings")
          .update({
             amount_paid_cents: session.amount_total ?? 5000,
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

        console.log(
          `Deposit paid for booking ${bookingId}: ${session.id}`
        );
      }
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
