import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
        .select(`
          id, 
          confirmation_code,
          customer_name,
          customer_email,
          pickup_at, 
          drivers_license_path, 
          insurance_path,
          agreement_accepted_at,
          deposit_cents,
          total_cents,
          amount_paid_cents,
          stripe_balance_invoice_id
          `)
          
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
       
    if (
  intakeIsComplete &&
  booking.agreement_accepted_at &&
  !booking.stripe_balance_invoice_id &&
  (booking.amount_paid_cents ?? 0) >= (booking.deposit_cents ?? 0)
) {
  const remainingBalance =
    (booking.total_cents ?? 0) - (booking.amount_paid_cents ?? 0);

  if (remainingBalance > 0 && booking.customer_email) {
    const existingCustomers = await stripe.customers.list({
      email: booking.customer_email,
      limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: booking.customer_email,
        name: booking.customer_name ?? undefined,
        metadata: {
          booking_id: booking.id,
          confirmation_code: booking.confirmation_code,
        },
      });

      customerId = customer.id;
    }

  const pickupDueDate = Math.floor(
  new Date(booking.pickup_at).getTime() / 1000
);

const invoice = await stripe.invoices.create(
  {
    customer: customerId,
    collection_method: "send_invoice",
    due_date: pickupDueDate,
    description: `Remaining balance for trailer rental ${booking.confirmation_code}`,
    metadata: {
      booking_id: booking.id,
      confirmation_code: booking.confirmation_code,
    },
  },
  {
    idempotencyKey: `balance-invoice-${booking.id}`,
  }
);

// Full rental price
await stripe.invoiceItems.create(
  {
    customer: customerId,
    invoice: invoice.id,
    amount: booking.total_cents ?? 0,
    currency: "usd",
    description: `Rental total — ${booking.confirmation_code}`,
  },
  {
    idempotencyKey: `balance-invoice-total-${booking.id}`,
  }
);

// Show the deposit already paid as a credit
const depositPaid = booking.amount_paid_cents ?? booking.deposit_cents ?? 0;

if (depositPaid > 0) {
  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: invoice.id,
      amount: -depositPaid,
      currency: "usd",
      description: `Deposit already paid — ${booking.confirmation_code}`,
    },
    {
      idempotencyKey: `balance-invoice-deposit-${booking.id}`,
    }
  );
}

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      invoice.id,
      {},
      {
        idempotencyKey: `balance-invoice-finalize-${booking.id}`,
      }
    );

    await stripe.invoices.sendInvoice(
      finalizedInvoice.id,
      {},
      {
        idempotencyKey: `balance-invoice-send-${booking.id}`,
      }
    );

    const { error: invoiceSaveError } = await supabase
      .from("bookings")
      .update({
        stripe_balance_invoice_id: finalizedInvoice.id,
      })
      .eq("id", booking.id);

    if (invoiceSaveError) {
      console.error(
        "Balance invoice created but invoice ID could not be saved:",
        invoiceSaveError
      );
    }
  }
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
