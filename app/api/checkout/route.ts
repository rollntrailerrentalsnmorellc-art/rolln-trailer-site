import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { bookingId, paymentType } = await request.json();

    const supabase = createAdminClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        id,
        confirmation_code,
        customer_name,
        customer_email,
        trailer_id,
        status,
        amount_paid_cents,
        total_cents,
        deposit_cents,
        intake_completed_at,
        agreement_accepted_at,
        drivers_license_path,
        insurance_path,
        stripe_customer_id
        ,created_at
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    if (booking.status === "pending_payment" && Date.now() - new Date(booking.created_at).getTime() > 30 * 60 * 1000) {
      await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "pending_payment");
      return NextResponse.json({ error: "This request expired after 30 minutes. Please choose the trailer and dates again." }, { status: 410 });
    }

    if (
      paymentType !== "balance" &&
      (
        !booking.intake_completed_at ||
        !booking.agreement_accepted_at ||
        !booking.drivers_license_path ||
        !booking.insurance_path
      )
    ) {
      return NextResponse.json(
        { 
      error: 
         "Please complete all rental intake requirements, including your agreement, driver's license, and insurance upload, before paying the deposit.",
      },
         { status: 400 }
      );
    }

    const amountAlreadyPaid = booking.amount_paid_cents ?? 0;
const totalAmount = booking.total_cents ?? 0;
const remainingBalance = Math.max(totalAmount - amountAlreadyPaid, 0);

const chargeAmount =
  paymentType === "balance"
    ? remainingBalance
    : booking.deposit_cents ?? 5000;

if (chargeAmount <= 0) {
  return NextResponse.json(
    { error: "There is no remaining balance to collect." },
    { status: 400 }
  );
}

    const { data: trailer } = await supabase
      .from("trailers")
      .select("name")
      .eq("id", booking.trailer_id)
      .single();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://rollntrailerrentals.com");

    let stripeCustomerId = booking.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: booking.customer_email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: booking.customer_email,
          name: booking.customer_name ?? undefined,
          metadata: {
            booking_id: booking.id,
            confirmation_code: booking.confirmation_code,
          },
        });
        stripeCustomerId = customer.id;
      }

      const { error: customerSaveError } = await supabase
        .from("bookings")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", booking.id);

      if (customerSaveError) {
        throw new Error(`Unable to save Stripe customer: ${customerSaveError.message}`);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: 
                 paymentType === "balance"
                  ? `${trailer?.name ?? "Trailer"} Remaining Balance`
                  : `${trailer?.name ?? "Trailer"} Reservation Deposit`,
              description: `Reservation ${booking.confirmation_code}`,
            },
            unit_amount: chargeAmount,
          },
          quantity: 1,
        },
      ],

      metadata: {
        booking_id: booking.id,
        confirmation_code: booking.confirmation_code,
        payment_type: paymentType == "balance" ? "balance" : "deposit",
      },

      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          booking_id: booking.id,
          confirmation_code: booking.confirmation_code,
          payment_type: paymentType == "balance" ? "balance" : "deposit",
        },
      },

      custom_text: {
        submit: {
          message:
            "By paying, you authorize Roll'N Trailer Rentals N More LLC to keep this payment method on file and charge amounts owed under your accepted rental agreement, including approved extensions, damage, cleaning, and late fees.",
        },
      },

      success_url: `https://rollntrailerrentals.com/booking/${booking.confirmation_code}?payment=success`,
      cancel_url: `https://rollntrailerrentals.com/booking/${booking.confirmation_code}?payment=cancelled`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      { error: "Unable to start payment." },
      { status: 500 }
    );
  }
}
