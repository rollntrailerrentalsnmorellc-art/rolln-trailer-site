import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PayDepositButton from "./PayDepositButton";

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
      amount_paid_cents
    `)
    .eq("confirmation_code", code)
    .single();

  if (error || !booking) {
    notFound();
  }

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
          </div>

          {(booking.amount_paid_cents ?? 0) >= (booking.deposit_cents ?? 5000) ? (
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
    ✓ $50 Deposit Paid
  </div>
) : (
  <PayDepositButton bookingId={booking.id} />
)}

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