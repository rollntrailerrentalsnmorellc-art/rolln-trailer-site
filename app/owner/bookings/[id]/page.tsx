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

    const currentBooking = booking;

    if (!currentBooking) {
      throw new Error("Booking not found");
    }
    const supabase = createAdminClient();

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
  replyTo: "jaredm0823@gmail.com",
  subject: `Your trailer rental is approved — ${currentBooking.confirmation_code}`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #16a34a;">Your rental request has been approved</h2>

      <p>Hello ${currentBooking.customer_name},</p>

      <p>
        Your reservation with Roll'N Trailer Rentals N More LLC has been approved.
      </p>

      <p>
        <strong>Confirmation:</strong> ${currentBooking.confirmation_code}<br />
        <strong>Pickup:</strong> ${formatDate(currentBooking.pickup_at)}<br />
        <strong>Return:</strong> ${formatDate(currentBooking.return_at)}
      </p>

      <p>
        We will contact you with any remaining payment or pickup instructions.
      </p>

      <p>
        Thank you,<br />
        <strong>Roll'N Trailer Rentals N More LLC</strong><br />
        706-526-2856
      </p>
    </div>
  `,
});

if (emailError) {
  throw new Error(`Booking approved, but email failed: ${emailError.message}`);
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