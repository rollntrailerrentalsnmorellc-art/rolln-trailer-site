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
        .select("id, agreement_accepted_at")
        .eq("confirmation_code", confirmationCode)
        .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    if (booking.agreement_accepted_at) {
      return NextResponse.json(
        { error: "Rental Agreement has already been accepted." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        agreement_signature: signature,
        agreement_accepted_at: now,
        agreement_version: agreementVersion,
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