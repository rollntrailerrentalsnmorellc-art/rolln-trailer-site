import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const confirmationCode = String(
      body.confirmationCode ?? ""
    ).trim();

    const signature = String(
      body.signature ?? ""
    ).trim();

    const agreementVersion = String(
      body.agreementVersion ?? ""
    ).trim();

    if (!confirmationCode) {
      return NextResponse.json(
        { error: "Confirmation code is required." },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Signature is required." },
        { status: 400 }
      );
    }

    if (!agreementVersion) {
      return NextResponse.json(
        { error: "Agreement version is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .select("id, status, created_at, agreement_accepted_at, drivers_license_path, insurance_path")
        .eq("confirmation_code", confirmationCode)
        .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    if (booking.status === "pending_payment" && Date.now() - new Date(booking.created_at).getTime() > 30 * 60 * 1000) {
      await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "pending_payment");
      return NextResponse.json({ error: "This request expired after 30 minutes. Please start again." }, { status: 410 });
    }

    if (booking.agreement_accepted_at) {
      return NextResponse.json(
        { error: "Rental Agreement has already been accepted." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

   const intakeIsComplete =
     Boolean(booking.drivers_license_path) &&
      Boolean(booking.insurance_path);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        agreement_signature: signature,
        agreement_accepted_at: now,
        agreement_version: agreementVersion,
        ...(intakeIsComplete
          ? {
              intake_completed_at: now,
            }
          : {}),
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error(
        "Agreement update failed:",
        updateError
      );

      return NextResponse.json(
        { error: "Unable to save Rental Agreement." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      acceptedAt: now,
    });
  } catch (error) {
    console.error("Agreement acceptance error:", error);

    return NextResponse.json(
      { error: "Unable to process Rental Agreement." },
      { status: 500 }
    );
  }
}
