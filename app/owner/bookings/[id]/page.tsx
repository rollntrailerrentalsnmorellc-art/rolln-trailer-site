import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const siteUrl = 
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://rollntrailerrentals.com");
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
      return_at,
      trailer_id
      `)
    .eq("id", id)
    .single();

  if (bookingError || !currentBooking) {
    throw new Error(
      `Unable to load booking: ${bookingError?.message || "Booking not found"}`
    );
  }
  const { data: trailer, error: trailerError } = await supabase
  .from("trailers")
  .select("name")
  .eq("id", currentBooking.trailer_id)
  .single();

if (trailerError) {
  console.error("Unable to load trailer:", trailerError);
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
        <h2 style="margin:0 0 18px; color:#7DFB00; font-size:25px;">
          Your rental request has been approved!
        </h2>

        <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
          Hello ${currentBooking.customer_name},
        </p>

        <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
          Your reservation with Roll'N Trailer Rentals N More LLC has been approved.
          Please keep the confirmation information below for your records.
          <div style="
background:#111827;
color:#ffffff;
border-left:6px solid #7DFB00;
padding:16px 20px;
border-radius:8px;
margin:24px 0;
">
<strong style="color:#7DFB00;">Trailer Reserved</strong><br>
${trailer?.name || "Not assigned"}<br>
Pickup: ${formatDate(currentBooking.pickup_at)}<br>
Return: ${formatDate(currentBooking.return_at)}
</div>
        </p>

        <div style="background:#FFFFFF; border:2px solid #7DFB00; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,.08); margin-bottom:24px;">
          <div style="margin-bottom:13px;">
            <span style="font-weight:700;">Confirmation number:</span><br>
            <span style="font-size:20px; font-weight:800; color:#7DFB00;">
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
          We will contact you soon with your pickup location and any remaining payment information
        </p>

          <h3 style="color:#7DFB00; margin:28px 0 12px;">
Next Steps
</h3>

<ul style="line-height:1.9; font-size:15px; padding-left:22px; margin-top:0;">
  <li>Bring a valid driver's license.</li>
  <li>Bring proof of insurance for the tow vehicle.</li>
  <li>Bring the tow vehicle listed on your reservation.</li>
  <li>Arrive at your scheduled pickup time.</li>
  <li>Call or text 706-699-6990 if your plans change.</li>
</ul>
        </p>

        <div style="text-align:center; margin:28px 0;">
          <a
            href="${siteUrl}/booking/${currentBooking.confirmation_code}"
            style="display:inline-block; background:#7DFB00; color:#111827; text-decoration:none; font-weight:800; padding:14px 24px; border-radius:9px;"
          >
            Pay $50 Deposit
          </a>
        </div>

        <div style="border-top:1px solid #e4e7e9; padding-top:20px; font-size:14px; line-height:1.7;">
          <strong>Roll'N Trailer Rentals N More LLC</strong><br>
          Call or text:
          <a href="tel:+17066996990" style="color:#7DFB00; font-weight:700; text-decoration:none;">
            706-699-6990
          </a><br>
          <a href={'https://rollntrailerrentals.com/booking/${currentBooking.confirmation_code}'}
          " style="color:#7DFB00; text-decoration:none;">
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
    const { data: currentBooking, error: bookingError } = await supabase
  .from("bookings")
  .select(`
    id,
    customer_email,
    customer_name,
    confirmation_code,
    pickup_at,
    return_at,
    trailer_id
  `)
  .eq("id", id)
  .single();

if (bookingError || !currentBooking) {
  throw new Error(
    `Unable to load booking: ${bookingError?.message || "Booking not found"}`
  );
}

const { data: trailer, error: trailerError } = await supabase
  .from("trailers")
  .select("name")
  .eq("id", currentBooking.trailer_id)
  .single();

if (trailerError) {
  console.error("Unable to load trailer:", trailerError);
}


    const { error } = await supabase
     .from("bookings")
     .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to decline booking: ${error.message}`);
  }
  const { error: emailError } = await resend.emails.send({
  from: "Roll'N Trailer Rentals <bookings@rollntrailerrentals.com>",
  to: [currentBooking.customer_email],
  replyTo: "Rollntrailerrentalsnmorellc@gmail.com",
  subject: `Your trailer rental request — ${currentBooking.confirmation_code}`,
  html: `
    <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; color:#111827;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">

        <div style="background:#101814; padding:28px 24px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#ffffff;">
            Roll'N Trailer Rentals N More LLC
          </div>
          <div style="margin-top:7px; color:#7DFB00; font-size:14px; font-weight:700;">
            Rental Request Update
          </div>
        </div>

        <div style="padding:30px 26px;">
          <h2 style="margin:0 0 18px; color:#111827; font-size:25px;">
            We’re unable to approve this rental request
          </h2>

          <p style="font-size:16px; line-height:1.6;">
            Hello ${currentBooking.customer_name},
          </p>

          <p style="font-size:16px; line-height:1.6;">
            Unfortunately, we’re unable to approve your requested reservation at this time.
          </p>

          <div style="
            background:#111827;
            color:#ffffff;
            border-left:6px solid #7DFB00;
            padding:16px 20px;
            border-radius:8px;
            margin:24px 0;
          ">
            <strong style="color:#7DFB00;">Trailer Requested</strong><br>
            ${trailer?.name ?? "Trailer"}<br><br>

            <strong>Pickup:</strong> ${formatDate(currentBooking.pickup_at)}<br>
            <strong>Return:</strong> ${formatDate(currentBooking.return_at)}
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
              ${currentBooking.confirmation_code}
            </span>
          </div>

          <p style="font-size:15px; line-height:1.7;">
            If you’d like to request different dates or discuss another trailer option,
            call or text us at
            <a href="tel:+17066996990" style="color:#7DFB00; font-weight:700; text-decoration:none;">
              706-699-6990
            </a>.
          </p>

          <div style="text-align:center; margin:28px 0;">
            <a
              href="https://rollntrailerrentals.com"
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
              View Available Trailers
            </a>
          </div>

          <div style="border-top:1px solid #e4e7e9; padding-top:20px; font-size:14px; line-height:1.7;">
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
  console.error("Decline email failed:", emailError);
}
  revalidatePath(`/owner/bookings/${id}`);
  revalidatePath("/owner/bookings");
  revalidatePath("/owner");

  redirect(`/owner/bookings/${id}`);
}
   async function collectBalance() {
  "use server";

  const response = await fetch("https://rollntrailerrentals.com/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookingId: id,
      paymentType: "balance",
    }),
    cache: "no-store",
  });

  const data = await response.json();

 if (!response.ok || !data.url) {
  console.error("Balance checkout failed:", data);

  throw new Error(
    typeof data.error === "string"
      ? data.error
      : JSON.stringify(data)
  );
}


  redirect(data.url);
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

  const { data: currentBooking, error: bookingError } = await supabase
    .from("bookings")
    .select("total_cents, amount_paid_cents")
    .eq("id", id)
    .single();

  if (bookingError || !currentBooking) {
    throw new Error("Unable to verify booking balance.");
  }

  const remainingBalance = Math.max(
    (currentBooking.total_cents ?? 0) -
      (currentBooking.amount_paid_cents ?? 0),
    0
  );

  if (remainingBalance > 0) {
    redirect(`/owner/bookings/${id}`);
  }

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
      drivers_license_path,
      insurance_path,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      completed_at,
      cancelled_at,
      cancellation_reason,
      cancellation_notes,
      agreement_accepted_at,
      agreement_version,
      pickup_notes,
      return_notes,
      owner_notes,
      created_at
    `)
    .eq("id", id)
    .single();

  if (error) {
  return (
    <main style={{ padding: 40 }}>
      <h1>Owner Booking Error</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(error, null, 2)}
      </pre>
    </main>
  );
}

if (!booking) {
  notFound();
}

  let driversLicenseUrl: string | null = null;
let insuranceUrl: string | null = null;

if (booking.drivers_license_path) {
  const { data } = await supabase.storage
    .from("rental-documents")
    .createSignedUrl(booking.drivers_license_path, 60 * 60 * 24 * 365);

  driversLicenseUrl = data?.signedUrl ?? null;
}

if (booking.insurance_path) {
  const { data } = await supabase.storage
    .from("rental-documents")
    .createSignedUrl(booking.insurance_path, 60 * 60 * 24 * 365);

  insuranceUrl = data?.signedUrl ?? null;
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
  <h2>Customer Documents</h2>

  <div style={{ marginBottom: 16 }}>
  <strong>Driver&apos;s License:</strong>

  {booking.drivers_license_path ? (
    <div style={{ marginTop: 8 }}>
      <a
        href={driversLicenseUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="button"
      >
        View Driver&apos;s License
      </a>
    </div>
  ) : (
    <p className="muted">Missing</p>
  )}
</div>

<div>
  <strong>Proof of Insurance:</strong>

  {booking.insurance_path ? (
    <div style={{ marginTop: 8 }}>
      <a
        href={insuranceUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="button"
      >
        View Insurance
      </a>
    </div>
  ) : (
    <p className="muted">Missing</p>
  )}
</div>
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
  <>
    {balance > 0 ? (
      <form action={collectBalance} style={{ width: "100%" }}>
        <button
          className="btn secondary"
          type="submit"
          style={{ width: "100%" }}
        >
          Collect Remaining Balance — {formatMoney(balance)}
        </button>
      </form>
    ) : (
      <form action={markReturned} style={{ width: "100%" }}>
        <button
          className="btn secondary"
          type="submit"
          style={{ width: "100%" }}
        >
          Mark Returned
        </button>
      </form>
    )}
  </>
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

function eq(arg0: string, id: string) {
  throw new Error("Function not implemented.");
}
