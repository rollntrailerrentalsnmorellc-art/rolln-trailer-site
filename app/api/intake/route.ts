import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const confirmationCode = String(
      formData.get("confirmationCode") ?? ""
    ).trim();

    const documentType = String(
      formData.get("documentType") ?? ""
    ).trim();

    const file = formData.get("file");

    if (!confirmationCode) {
      return NextResponse.json(
        { error: "Confirmation code is required." },
        { status: 400 }
      );
    }

    if (
      documentType !== "drivers_license" &&
      documentType !== "insurance"
    ) {
      return NextResponse.json(
        { error: "Invalid document type." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WEBP, and PDF files are allowed.",
        },
        { status: 400 }
      );
    }

    const maxFileSize = 10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: "File must be 10 MB or smaller." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .select("id, confirmation_code, drivers_license_path, insurance_path")
        .eq("confirmation_code", confirmationCode)
        .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Reservation not found." },
        { status: 404 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "bin";

    const safeExtension = extension.replace(
      /[^a-z0-9]/g,
      ""
    );

    const filename =
      documentType === "drivers_license"
        ? `drivers-license.${safeExtension}`
        : `insurance.${safeExtension}`;

    const storagePath = `${booking.id}/${filename}`;

    const bytes = await file.arrayBuffer();

    const { error: uploadError } =
      await supabase.storage
        .from("rental-documents")
        .upload(storagePath, bytes, {
          contentType: file.type,
          upsert: true,
        });

    if (uploadError) {
      console.error(
        "Rental document upload failed:",
        uploadError
      );

      return NextResponse.json(
        { error: "Unable to upload document." },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const updatedDriversLicensePath =
  documentType === "drivers_license"
    ? storagePath
    : booking.drivers_license_path;

const updatedInsurancePath =
  documentType === "insurance"
    ? storagePath
    : booking.insurance_path;

const intakeIsComplete =
  Boolean(updatedDriversLicensePath) &&
  Boolean(updatedInsurancePath);

const updateData = {
  ...(documentType === "drivers_license"
    ? {
        drivers_license_path: storagePath,
        drivers_license_uploaded_at: now,
      }
    : {
        insurance_path: storagePath,
        insurance_uploaded_at: now,
      }),
  ...(intakeIsComplete
    ? {
        intake_completed_at: now,
      }
    : {}),
};

const { error: updateError } = await supabase
  .from("bookings")
  .update(updateData)
  .eq("id", booking.id);


    if (updateError) {
      console.error(
        "Booking document record update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Document uploaded, but booking could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentType,
    });
  } catch (error) {
    console.error("Intake upload error:", error);

    return NextResponse.json(
      { error: "Unable to process document upload." },
      { status: 500 }
    );
  }
}
