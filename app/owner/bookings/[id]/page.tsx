import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatMoney(cents: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents ?? 0) / 100);
}

export default async function BookingDetailsPage({ params }: PageProps) {
  const { id } = await params;

  async function approveBooking() {
  "use server";

  const supabase = createAdminClient();

  const { data: currentBooking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      customer_email,
      customer_name,
      confirmation_code,
      pickup_at,
      return_at
      `
    )
    .eq("id", id)
    .single();

  if (bookingError || !currentBooking) {
    throw new Error(
      `Unable to load booking: ${bookingError?.message || "Booking not found"}`
    );
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to approve booking: ${error.message}`);
  }

    const { error: emailError } = await resend.emails.send({
  from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
  to: [currentBooking.customer_email],
  replyTo: "Rollntrailerrentalsnmorellc@gmail.com",
  subject: `Your trailer rental is approved — ${currentBooking.confirmation_code}`,
  html: `
  <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#17202a;">
    <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #dfe5e8;">

      <div style="background:#101814; padding:28px 24px; text-align:center;">
        <div style="font-size:24px; font-weight:800; color:#ffffff;">
          Roll'N Trailer Rentals N More LLC
        </div>
        <div style="margin-top:7px; color:#39e58c; font-size:14px; font-weight:700;">
          Rental Request Approved
        </div>
      </div>

      <div style="padding:30px 26px;">
        <h2 style="margin:0 0 18px; color:#168f55; font-size:25px;">
          Your rental request has been approved!
        </h2>

        <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
          Hello ${currentBooking.customer_name},
        </p>

        <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
          Your reservation with Roll'N Trailer Rentals N More LLC has been approved.
          Please keep the confirmation information below for your records.
        </p>

        <div style="background:#f6faf8; border:1px solid #cfe9dc; border-radius:10px; padding:20px; margin-bottom:24px;">
          <div style="margin-bottom:13px;">
            <span style="font-weight:700;">Confirmation number:</span><br>
            <span style="font-size:20px; font-weight:800; color:#168f55;">
              ${currentBooking.confirmation_code}
            </span>
          </div>

          <div style="margin-bottom:11px;">
            <strong>Pickup:</strong>
            ${formatDate(currentBooking.pickup_at)}
          </div>

          <div>
            <strong>Return:</strong>
            ${formatDate(currentBooking.return_at)}
          </div>
        </div>

        <p style="font-size:15px; line-height:1.6; margin:0 0 24px;">
          We will contact you with any remaining payment details or pickup instructions.
        </p>

        <div style="text-align:center; margin:28px 0;">
          <a
            href="https://rollntrailerrentals.com"
            style="display:inline-block; background:#18d978; color:#07140e; text-decoration:none; font-weight:800; padding:14px 24px; border-radius:9px;"
          >
            Visit Our Website
          </a>
        </div>

        <div style="border-top:1px solid #e4e7e9; padding-top:20px; font-size:14px; line-height:1.7;">
          <strong>Roll'N Trailer Rentals N More LLC</strong><br>
          Call or text:
          <a href="tel:+17066996990" style="color:#168f55; font-weight:700; text-decoration:none;">
            706-699-6990
          </a><br>
          <a href="https://rollntrailerrentals.com" style="color:#168f55; text-decoration:none;">
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
  console.error("Approval email failed:", emailError);
}

    revalidatePath(`/owner/bookings/${id}`);
    revalidatePath("/owner/bookings");
    revalidatePath("/owner");

    redirect(`/owner/bookings/${id}`);
  }
  async function declineBooking() {
    "use server";
    
    const supabase = createAdminClient();

    const { error } = await supabase
     .from("bookings")
     .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to mark picked up: ${error.message}`);
  }

  revalidatePath(`/owner/bookings/${id}`);
  revalidatePath("/owner/bookings");
  revalidatePath("/owner");

  redirect(`/owner/bookings/${id}`);
}

  async function markPickedUp() {
  "use server";

   const supabase = createAdminClient();

   const { error } = await supabase
      .from("bookings")
      .update({ 
        status: "active",
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Unable to mark picked up: ${error.message}`);
    }

    revalidatePath(`/owner/bookings/${id}`);
    revalidatePath("/owner/bookings");
    revalidatePath("/owner");

    redirect(`/owner/bookings/${id}`);
  }
  async function markReturned() {
  "use server";

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to mark returned: ${error.message}`);
  }

  revalidatePath(`/owner/bookings/${id}`);
  revalidatePath("/owner/bookings");
  revalidatePath("/owner");

  redirect(`/owner/bookings/${id}`);
}

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <section>
          <div className="container">
            <div className="notice">
              <h1>Owner sign-in required</h1>

              <Link className="btn" href="/login">
                Owner Sign-In
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "staff"].includes(profile.role)) {
    return (
      <main>
        <section>
          <div className="container">
            <div className="notice">
              This account does not have permission to view this booking.
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      confirmation_code,
      status,
      trailer_id,
      pickup_at,
      return_at,
      customer_name,
      customer_email,
      customer_phone,
      tow_vehicle,
      tow_rating_lbs,
      intended_use,
      subtotal_cents,
      deposit_cents,
      total_cents,
      amount_paid_cents,
      agreement_accepted_at,
      agreement_version,
      pickup_notes,
      return_notes,
      owner_notes,
      created_at
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    notFound();
  }

  const balance = Math.max(
    (booking.total_cents ?? 0) - (booking.amount_paid_cents ?? 0),
    0
  );

  return (
    <main>
      <section>
        <div className="container">
          <Link className="btn secondary" href="/owner/bookings">
            ← Back to Bookings
          </Link>

          <div className="panel" style={{ marginTop: 20 }}>
            <span className="eyebrow">Private owner area</span>

            <h1>Booking Details</h1>

            <p className="muted">
              Confirmation:{" "}
              <strong>
                {booking.confirmation_code ?? booking.id.slice(0, 8)}
              </strong>
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {booking.status.replaceAll("_", " ")}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
              marginTop: 18,
            }}
          >
            <div className="panel">
              <h2>Customer</h2>

              <p>
                <strong>Name:</strong>{" "}
                {booking.customer_name || "Not provided"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {booking.customer_email ? (
                  <a href={`mailto:${booking.customer_email}`}>
                    {booking.customer_email}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {booking.customer_phone ? (
                  <a
                    href={`tel:${booking.customer_phone.replace(/\D/g, "")}`}
                  >
                    {booking.customer_phone}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </div>

            <div className="panel">
              <h2>Rental</h2>

              <p>
                <strong>Trailer record:</strong>{" "}
                {booking.trailer_id ?? "Not assigned"}
              </p>

              <p>
                <strong>Pickup:</strong> {formatDate(booking.pickup_at)}
              </p>

              <p>
                <strong>Return:</strong> {formatDate(booking.return_at)}
              </p>

              <p>
                <strong>Intended use:</strong>{" "}
                {booking.intended_use || "Not provided"}
              </p>
            </div>

            <div className="panel">
              <h2>Tow Vehicle</h2>

              <p>
                <strong>Vehicle:</strong>{" "}
                {booking.tow_vehicle || "Not provided"}
              </p>

              <p>
                <strong>Tow rating:</strong>{" "}
                {booking.tow_rating_lbs
                  ? `${booking.tow_rating_lbs.toLocaleString()} lbs`
                  : "Not provided"}
              </p>
            </div>

            <div className="panel">
              <h2>Payment</h2>

              <p>
                <strong>Subtotal:</strong>{" "}
                {formatMoney(booking.subtotal_cents)}
              </p>

              <p>
                <strong>Deposit:</strong>{" "}
                {formatMoney(booking.deposit_cents)}
              </p>

              <p>
                <strong>Total:</strong> {formatMoney(booking.total_cents)}
              </p>

              <p>
                <strong>Amount paid:</strong>{" "}
                {formatMoney(booking.amount_paid_cents)}
              </p>

              <p>
                <strong>Balance due:</strong> {formatMoney(balance)}
              </p>
            </div>

            <div className="panel">
              <h2>Rental Agreement</h2>

              <p>
                <strong>Accepted:</strong>{" "}
                {booking.agreement_accepted_at
                  ? formatDate(booking.agreement_accepted_at)
                  : "Not accepted"}
              </p>

              <p>
                <strong>Version:</strong>{" "}
                {booking.agreement_version || "Not recorded"}
              </p>
            </div>

            <div className="panel">
              <h2>Notes</h2>

              <p>
                <strong>Pickup:</strong>{" "}
                {booking.pickup_notes || "No pickup notes"}
              </p>

              <p>
                <strong>Return:</strong>{" "}
                {booking.return_notes || "No return notes"}
              </p>

              <p>
                <strong>Owner:</strong>{" "}
                {booking.owner_notes || "No owner notes"}
              </p>
            </div>
          </div>

          <div
            className="panel1"
            style={{
              marginTop: 18,
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
           {["pending", "pending_payment"].includes(booking.status) && (
  <>
    <form action={approveBooking} style={{ width: "100%" }}>
      <button className="btn" type="submit" style={{ width: "100%" }}>
        Approve
      </button>
    </form>

    <form action={declineBooking} style={{ width: "100%" }}>
      <button
        className="btn secondary"
        type="submit"
        style={{ width: "100%" }}
      >
        Decline
      </button>
    </form>
  </>
)}

            {booking.status === "confirmed" && (
              <form action={markPickedUp} style={{ width: "100%" }}>
                <button className="btn secondary" type="submit" style={{ width: "100%" }}>
                  Mark Picked Up
                </button>
              </form>
            )}

            {booking.status === "active" && (
              <form action={markReturned} style={{ width: "100%" }}>
                <button className="btn secondary" type="submit" style={{ width: "100%" }}>
                  Mark Returned
                </button>
              </form>
            )}

            {booking.status === "completed" && (
              <div
                style={{
                  padding: 14,
                  textAlign: "center",
                  borderRadius: 8,
                  background: "#1f2937",
                  color: "#10b981",
                  fontWeight: 700,
                }}
              >
                ✓ Rental Completed
              </div>
            )}

            {booking.status === "cancelled" && (
              <div
                style={{
                  padding: 14,
                  textAlign: "center",
                  borderRadius: 8,
                  background: "#1f2937",
                  color: "#ef4444",
                  fontWeight: 700,
                }}
              >
                Booking Declined
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}