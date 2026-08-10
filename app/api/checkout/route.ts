import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        id,
        confirmation_code,
        customer_name,
        customer_email,
        trailer_id,
        status
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      customer_email: booking.customer_email,

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${trailer?.name ?? "Trailer"} Reservation Deposit`,
              description: `Reservation ${booking.confirmation_code}`,
            },
            unit_amount: 5000,
          },
          quantity: 1,
        },
      ],

      metadata: {
        booking_id: booking.id,
        confirmation_code: booking.confirmation_code,
      },

      payment_intent_data: {
        metadata: {
          booking_id: booking.id,
          confirmation_code: booking.confirmation_code,
        },
      },

      success_url: `${siteUrl}/booking/${booking.confirmation_code}?payment=success`,
      cancel_url: `${siteUrl}/booking/${booking.confirmation_code}?payment=cancelled`,
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