import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BookingRequest = {
  trailerId?: string;
  pickup?: string;
  returnAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  towVehicle?: string;
  towRatingLbs?: number;
  intendedUse?: string;
  agreementAccepted?: boolean;
};

function createConfirmationCode() {
  const datePart = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `RT-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingRequest;

    const {
      trailerId,
      pickup,
      returnAt,
      customerName,
      customerEmail,
      customerPhone,
      towVehicle,
      towRatingLbs,
      intendedUse,
      agreementAccepted,
    } = body;

    if (
      !trailerId ||
      !pickup ||
      !returnAt ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {
      return NextResponse.json(
        { error: "Please complete all required reservation information." },
        { status: 400 }
      );
    }

    if (!agreementAccepted) {
      return NextResponse.json(
        { error: "The reservation certification must be accepted." },
        { status: 400 }
      );
    }

    const pickupDate = new Date(pickup);
    const returnDate = new Date(returnAt);

    if (
      Number.isNaN(pickupDate.getTime()) ||
      Number.isNaN(returnDate.getTime())
    ) {
      return NextResponse.json(
        { error: "The pickup or return date is invalid." },
        { status: 400 }
      );
    }

    if (returnDate <= pickupDate) {
      return NextResponse.json(
        { error: "The return date must be after the pickup date." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: conflictingBookings, error: availabilityError } =
      await supabase
        .from("bookings")
        .select("id")
        .eq("trailer_id", trailerId)
        .lt("pickup_at", returnDate.toISOString())
        .gt("return_at", pickupDate.toISOString())
        .not("status", "in", '("cancelled","declined","completed")')
        .limit(1);

    if (availabilityError) {
      return NextResponse.json(
        {
          error: `Unable to verify availability: ${availabilityError.message}`,
        },
        { status: 500 }
      );
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return NextResponse.json(
        {
          error:
            "Those dates are no longer available. Please select different dates.",
        },
        { status: 409 }
      );
    }

    const confirmationCode = createConfirmationCode();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        confirmation_code: confirmationCode,
        trailer_id: trailerId,
        status: "pending",
        pickup_at: pickupDate.toISOString(),
        return_at: returnDate.toISOString(),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone.trim(),
        tow_vehicle: towVehicle?.trim() || null,
        tow_rating_lbs:
          typeof towRatingLbs === "number" && towRatingLbs > 0
            ? towRatingLbs
            : null,
        intended_use: intendedUse?.trim() || null,
        agreement_accepted_at: new Date().toISOString(),
        agreement_version: "2026-08",
      })
      .select("id, confirmation_code")
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: `Unable to create reservation: ${bookingError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        confirmationCode: booking.confirmation_code,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid reservation request." },
      { status: 400 }
    );
  }
}