import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PayDepositButton from "./PayDepositButton";
import PaymentSuccessRefresh from "./PaymentSuccessRefresh";
import IntakeUploadForm from "./IntakeUploadForm";
import RentalAgreementForm from "./RentalAgreementForm";
import { parseRentalAddOns } from "@/lib/addons";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    code: string;
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

export default async function ReservationPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      confirmation_code,
      status,
      trailer_id,
      pickup_at,
      return_at,
      deposit_cents,
      amount_paid_cents,
      drivers_license_path,
      insurance_path,
      drivers_license_uploaded_at,
      insurance_uploaded_at,
      intake_completed_at,
      agreement_accepted_at,
      card_on_file_authorized_at,
      owner_notes,
      total_cents
      ,created_at
    `)
    .eq("confirmation_code", code)
    .single();

  if (error || !booking) {
    notFound();
  }

  const selectedAddOns = parseRentalAddOns(booking.owner_notes);
  const requestExpired = booking.status === "pending_payment" &&
    Date.now() - new Date(booking.created_at).getTime() > 30 * 60 * 1000;
  const depositPaid = (booking.amount_paid_cents ?? 0) >= (booking.deposit_cents ?? 5000);
  const stepOneComplete = Boolean(
    booking.intake_completed_at && booking.agreement_accepted_at &&
    booking.drivers_license_path && booking.insurance_path && depositPaid
  );

  let trailerName = "Trailer";

  if (booking.trailer_id) {
    const { data: trailer } = await supabase
      .from("trailers")
      .select("name")
      .eq("id", booking.trailer_id)
      .single();

    if (trailer?.name) {
      trailerName = trailer.name;
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f0d",
        color: "#ffffff",
        padding: "40px 18px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <PaymentSuccessRefresh />
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto",
          background: "#111814",
          border: "1px solid #27332c",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#101814",
            padding: "30px 24px",
            textAlign: "center",
            borderBottom: "4px solid #7DFB00",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28 }}>
            Roll&apos;N Trailer Rentals N More LLC
          </h1>

          <p
            style={{
              color: "#7DFB00",
              fontWeight: 800,
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            Reservation Details
          </p>
        </div>

        <div style={{ padding: 30 }}>
          <div className="panel" style={{ marginBottom: 24 }}>
            <h2 style={{ color: "#7DFB00", marginTop: 0 }}>Two-Step Booking</h2>
            <p><strong>1. Request &amp; deposit</strong><br />Personal information, documents, signed agreement, and $50 deposit.</p>
            <p style={{ marginBottom: 0, opacity: booking.status === "confirmed" || booking.status === "active" || booking.status === "completed" ? 1 : .65 }}><strong>2. After owner approval</strong><br />Pay the final invoice and discuss the meeting spot.</p>
          </div>
          {stepOneComplete && booking.status === "pending_payment" && (
            <div className="notice" style={{ marginBottom: 24 }}><strong>✓ Step 1 complete</strong><br />Your request is waiting for owner approval. No final invoice is due until it is approved.</div>
          )}
          {requestExpired && (
            <div className="notice" style={{ marginBottom: 24, borderColor: "#ef4444" }}><strong>This request expired</strong><br />Step 1 was not completed within 30 minutes, so the dates were released. Please return to the trailers page and start a new request.</div>
          )}
          {["confirmed", "active", "completed"].includes(booking.status) && (
            <div className="notice" style={{ marginBottom: 24 }}><strong>Step 2: Approved</strong><br />Pay the final invoice sent by Stripe, then call or text us to arrange the meeting spot.</div>
          )}
          <div
            style={{
              background: "#18201c",
              borderLeft: "6px solid #7DFB00",
              borderRadius: 10,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                color: "#7DFB00",
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Trailer Reserved
            </div>

            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {trailerName}
            </div>
          </div>

          <div
            style={{
              border: "2px solid #7DFB00",
              borderRadius: 12,
              padding: 22,
              marginBottom: 24,
            }}
          >
            <p>
              <strong>Confirmation Number</strong>
              <br />
              <span
                style={{
                  color: "#7DFB00",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                {booking.confirmation_code}
              </span>
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {booking.status?.replaceAll("_", " ")}
            </p>

            <p>
              <strong>Pickup:</strong> {formatDate(booking.pickup_at)}
            </p>

            <p style={{ marginBottom: 0 }}>
              <strong>Return:</strong> {formatDate(booking.return_at)}
            </p>
            {selectedAddOns.length > 0 && <div style={{ marginTop: 18 }}><strong>Rental add-ons:</strong><ul style={{ marginBottom: 0 }}>{selectedAddOns.map((item) => <li key={item.id}>{item.name} — ${(item.pricePerDayCents / 100).toFixed(2)}/day</li>)}</ul></div>}
            <p><strong>Quoted rental total:</strong> ${((booking.total_cents ?? 0) / 100).toFixed(2)}</p>
          </div>

        {!requestExpired && <><IntakeUploadForm
  confirmationCode={booking.confirmation_code}
  hasDriversLicense={Boolean(booking.drivers_license_path)}
  hasInsurance={Boolean(booking.insurance_path)}
/>

<RentalAgreementForm
   confirmationCode={booking.confirmation_code}
   alreadyAccepted={Boolean(booking.agreement_accepted_at)}
/>
{depositPaid ? (
  <div
    style={{
      marginTop: 24,
      marginBottom: 24,
      background: "#18201c",
      border: "2px solid #7DFB00",
      color: "#7DFB00",
      padding: "16px 20px",
      borderRadius: 9,
      textAlign: "center",
      fontWeight: 800,
      fontSize: 17,
    }}
  >
    {(booking.amount_paid_cents ?? 0) > (booking.deposit_cents ?? 5000)
      ? "✓ Paid in Full"
      : "✓ $50 Deposit Paid"}
  </div>
) : (
  booking.intake_completed_at &&
  booking.agreement_accepted_at &&
  booking.drivers_license_path &&
  booking.insurance_path
    ? (
        <PayDepositButton bookingId={booking.id} />
      )
    : (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #7DFB00",
            borderRadius: 12,
          }}
        >
          <strong>Complete your rental intake before paying the deposit.</strong>
          <p style={{ marginBottom: 0 }}>
            Your rental agreement, driver's license, and insurance must all be
            completed or uploaded first.
          </p>
        </div>
      )
)}
</>}
          <p style={{ lineHeight: 1.7 }}>
            Questions or changes to your reservation? Call or text us at{" "}
            <a
              href="tel:+17066996990"
              style={{
                color: "#7DFB00",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              706-699-6990
            </a>
          </p>

          <a
            href="https://rollntrailerrentals.com"
            style={{
              display: "block",
              background: "#7DFB00",
              color: "#111827",
              textAlign: "center",
              padding: "15px 20px",
              borderRadius: 9,
              fontWeight: 800,
              textDecoration: "none",
              marginTop: 28,
            }}
          >
            Return to Website
          </a>
        </div>
      </div>
    </main>
  );
}
