import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { TZDate } from "@date-fns/tz"

const resend = new Resend(process.env.RESEND_API_KEY);

const siteUrl = 
process.env.NEXT_PUBLIC_SITE_URL || 
process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://rollntrailerrentals.com";

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
  const datePart = new Date()
    .toISOString()
    .slice(2, 10)
    .replaceAll("-", "");

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

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
        {
          error:
            "Please complete all required reservation information.",
        },
        { status: 400 }
      );
    }

    if (!agreementAccepted) {
      return NextResponse.json(
        {
          error:
            "The reservation certification must be accepted.",
        },
        { status: 400 }
      );
    }

    const parseEasternDateTime = (value: string) => {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return new TZDate(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    "America/New_York"
  );
};

const pickupDate = parseEasternDateTime(pickup);
const returnDate = parseEasternDateTime(returnAt);

    if (
      Number.isNaN(pickupDate.getTime()) ||
      Number.isNaN(returnDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "The pickup or return date is invalid.",
        },
        { status: 400 }
      );
    }

    if (returnDate <= pickupDate) {
      return NextResponse.json(
        {
          error:
            "The return date must be after the pickup date.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: conflictingBookings, error: availabilityError } =
      await supabase
        .from("bookings")
        .select("id")
        .eq("trailer_id", trailerId)
        .lt("pickup_at", returnDate.toISOString())
        .gt("return_at", pickupDate.toISOString())
        .in("status", [
          "pending_payment",
          "confirmed",
          "active",
        ])
        .limit(1);

    if (availabilityError) {
      return NextResponse.json(
        {
          error: `Unable to verify availability: ${availabilityError.message}`,
        },
        { status: 500 }
      );
    }

    if (
      conflictingBookings &&
      conflictingBookings.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Those dates are no longer available. Please select different dates.",
        },
        { status: 409 }
      );
    }

      const { data: trailer, error: trailerError } = await supabase
  .from("trailers")
  .select("name, daily_rate_cents, weekly_rate_cents, deposit_cents")
  .eq("id", trailerId)
  .single();

if (trailerError) {
  console.error("Unable to load trailer:", trailerError);
}

const rentalMs = returnDate.getTime() - pickupDate.getTime();
const rentalDays = Math.max(1, Math.ceil(rentalMs / (24 * 60 * 60 * 1000)));

const dailyRate = trailer?.daily_rate_cents ?? 0;
const weeklyRate = trailer?.weekly_rate_cents ?? null;
const depositAmount = trailer?.deposit_cents ?? 5000;

let subtotalCents = 0;

if (weeklyRate && rentalDays >= 7) {
  const fullWeeks = Math.floor(rentalDays / 7);
  const extraDays = rentalDays % 7;

  subtotalCents =
    fullWeeks * weeklyRate +
    extraDays * dailyRate;
} else {
  subtotalCents = rentalDays * dailyRate;
}

const totalCents = subtotalCents;

    const confirmationCode = createConfirmationCode();

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .insert({
          confirmation_code: confirmationCode,
          trailer_id: trailerId,
          status: "pending_payment",
          pickup_at: pickupDate.toISOString(),
          return_at: returnDate.toISOString(),
          customer_name: customerName.trim(),
          customer_email: customerEmail
            .trim()
            .toLowerCase(),
          customer_phone: customerPhone.trim(),
          tow_vehicle: towVehicle?.trim() || null,
          tow_rating_lbs:
            typeof towRatingLbs === "number" &&
            towRatingLbs > 0
              ? towRatingLbs
              : null,
          intended_use: intendedUse?.trim() || null,
          subtotal_cents: subtotalCents,
          deposit_cents: depositAmount,
          total_cents: totalCents,
          amount_paid_cents: 0,
        })
        .select("id, confirmation_code")
        .single();

    if (bookingError) {
      return NextResponse.json(
        {
          error: `Unable to create reservation: ${bookingError.message}`,
        },
        { status: 500 }
      );
    }

    const { error: emailError } = await resend.emails.send({
  from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
  to: [customerEmail.trim().toLowerCase()],
  replyTo: "Rollntrailerrentalsnmorellc@gmail.com",
  subject: `Rental request received — ${booking.confirmation_code}`,
  html: `
    <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">

        <div style="background:#101814; padding:28px 24px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#ffffff;">
            Roll'N Trailer Rentals N More LLC
          </div>
          <div style="margin-top:7px; color:#7DFB00; font-size:14px; font-weight:700;">
            Rental Request Received
          </div>
        </div>

        <div style="padding:30px 26px;">
          <h2 style="margin:0 0 18px; color:#111827; font-size:25px;">
            We received your rental request
          </h2>

          <p style="font-size:16px; line-height:1.6;">
            Hello ${customerName.trim()},
          </p>

          <p style="font-size:16px; line-height:1.6;">
            Thank you for submitting your trailer rental request.
            Your request has been received and is awaiting approval.
          </p>

          <div style="
            background:#111827;
            color:#ffffff;
            border-left:6px solid #7DFB00;
            padding:16px 20px;
            border-radius:8px;
            margin:24px 0;
          ">
            <strong style="color:#7DFB00;">Rental Requested</strong><br>
            ${trailer?.name ?? "Trailer"}<br><br>

            <strong>Pickup:</strong>
            ${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "America/New_York",
            }).format(pickupDate)}
            <br>

            <strong>Return:</strong>
            ${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "America/New_York",
            }).format(returnDate)}
          </div>

          <div style="
            background:#ffffff;
            border:2px solid #7DFB00;
            border-radius:12px;
            padding:20px;
            margin:24px 0;
          ">
            <strong>Confirmation number:</strong><br>
            <span style="font-size:20px; font-weight:800; color:#7DFB00;">
              ${booking.confirmation_code}
            </span>
          </div>

          <p style="font-size:15px; line-height:1.7;">
            This request is not yet approved. We will review it and contact you once it has been approved or declined.
          </p>

          <p style="font-size:15px; line-height:1.7;">
            Questions? Call or text us at
            <a href="tel:+17066996990" style="color:#7DFB00; font-weight:700; text-decoration:none;">
              706-699-6990
            </a>.
          </p>

          <div style="border-top:1px solid #e4e7e9; padding-top:20px; margin-top:26px; font-size:14px; line-height:1.7;">
            <strong>Roll'N Trailer Rentals N More LLC</strong><br>
            Call or text:
            <a href="tel:+17066996990" style="color:#7DFB00; font-weight:700; text-decoration:none;">
              706-699-6990
            </a><br>
            <a href="https://rollntrailerrentals.com" style="color:#7DFB00; text-decoration:none;">
              rollntrailerrentals.com
            </a>
          </div>
        </div>

        <div style="background:#101814; color:#b9c5bf; text-align:center; padding:16px; font-size:12px;">
          Serving Augusta, Evans, Grovetown, North Augusta, Aiken and the CSRA.
        </div>

      </div>
    </div>
  `,
});

if (emailError) {
  console.error("Pending booking email failed:", emailError);
}
const { error: ownerEmailError } = await resend.emails.send({
  from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
  to: ["Rollntrailerrentalsnmorellc@gmail.com"],
  replyTo: customerEmail.trim().toLowerCase(),
  subject: `New booking request — ${trailer?.name ?? "Trailer"} — ${booking.confirmation_code}`,
  html: `
    <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">

        <div style="background:#101814; padding:28px 24px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#ffffff;">
            Roll'N Trailer Rentals N More LLC
          </div>
          <div style="margin-top:7px; color:#7DFB00; font-size:14px; font-weight:700;">
            New Booking Request
          </div>
        </div>

        <div style="padding:30px 26px;">
          <h2 style="margin:0 0 20px; font-size:25px;">
            New rental request received
          </h2>

          <div style="
            background:#111827;
            color:#ffffff;
            border-left:6px solid #7DFB00;
            padding:18px 20px;
            border-radius:8px;
            margin-bottom:24px;
          ">
            <strong style="color:#7DFB00;">Trailer</strong><br>
            ${trailer?.name ?? "Trailer"}<br><br>

            <strong>Pickup:</strong>
            ${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "America/New_York",
            }).format(pickupDate)}
            <br>

            <strong>Return:</strong>
            ${new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "America/New_York",
            }).format(returnDate)}
          </div>

          <div style="line-height:1.8; font-size:15px;">
            <strong>Customer:</strong> ${customerName.trim()}<br>
            <strong>Email:</strong> ${customerEmail.trim().toLowerCase()}<br>
            <strong>Phone:</strong> ${customerPhone.trim()}<br>
            <strong>Tow vehicle:</strong> ${towVehicle?.trim() || "Not provided"}<br>
            <strong>Tow rating:</strong> ${
              typeof towRatingLbs === "number" && towRatingLbs > 0
                ? `${towRatingLbs.toLocaleString()} lbs`
                : "Not provided"
            }<br>
            <strong>Intended use:</strong> ${intendedUse?.trim() || "Not provided"}<br>
            <strong>Confirmation:</strong>
            <span style="color:#7DFB00; font-weight:800;">
              ${booking.confirmation_code}
            </span>
          </div>

          <div style="text-align:center; margin:30px 0 10px;">
            <a
              href="${siteUrl}/owner/bookings/${booking.id}"
              style="
                display:inline-block;
                background:#7DFB00;
                color:#111827;
                text-decoration:none;
                font-weight:800;
                padding:14px 22px;
                border-radius:8px;
              "
            >
              Review Booking
            </a>
          </div>
        </div>

        <div style="background:#101814; color:#b9c5bf; text-align:center; padding:16px; font-size:12px;">
          New reservation request awaiting review.
        </div>

      </div>
    </div>
  `,
});

if (ownerEmailError) {
  console.error("Owner booking email failed:", ownerEmailError);
}
    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        confirmationCode:
          booking.confirmation_code,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking API error:", error);
 
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid reservation request.",
      },
      { status: 500 }
    );
  }
}