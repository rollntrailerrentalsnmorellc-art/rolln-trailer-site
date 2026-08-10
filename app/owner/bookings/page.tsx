import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type Booking = {
  id: string;
  confirmation_code: string | null;
  customer_id: string | null;
  trailer_id: string | null;
  status: string;
  pickup_at: string;
  return_at: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  tow_vehicle: string | null;
  tow_rating_lbs: number | null;
  intended_use: string | null;
  subtotal_cents: number | null;
  deposit_cents: number | null;
  total_cents: number | null;
  amount_paid_cents: number | null;
  agreement_accepted_at: string | null;
  agreement_version: string | null;
  pickup_notes: string | null;
  return_notes: string | null;
  owner_notes: string | null;
  created_at: string;
};

function formatMoney(cents: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents ?? 0) / 100);
}

function formatDate(date: string | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(date));
}

function statusColor(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("pending")) return "#f59e0b";
  if (normalizedStatus.includes("confirm")) return "#7DFB00";
  if (normalizedStatus.includes("active")) return "#0ea5e9";
  if (normalizedStatus.includes("complete")) return "#64748b";
  if (normalizedStatus.includes("cancel")) return "#ef4444";

  return "#8b5cf6";
}

export default async function BookingsPage() {
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

              <p className="muted">
                Sign in with the authorized owner account to view bookings.
              </p>

              <Link className="btn" href="/owner/login">
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
              This account does not have permission to view owner bookings.
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      confirmation_code,
      customer_id,
      trailer_id,
      status,
      pickup_at,
      return_at,
      customer_email,
      customer_phone,
      customer_name,
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
    .order("created_at", { ascending: false })
    .limit(50);

  const bookings = (data ?? []) as Booking[];

  const pendingCount = bookings.filter((booking) =>
    booking.status.toLowerCase().includes("pending")
  ).length;

  const now = new Date();

  const pickupCount = bookings.filter((booking) => {
    const pickup = new Date(booking.pickup_at);

    return pickup.toDateString() === now.toDateString();
  }).length;

  const returnCount = bookings.filter((booking) => {
    const returnDate = new Date(booking.return_at);

    return returnDate.toDateString() === now.toDateString();
  }).length;

  return (
    <main>
      <section>
        <div className="container">
          <span className="eyebrow">Private owner area</span>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <h1 style={{ marginBottom: 8 }}>Bookings Manager</h1>

              <p className="muted" style={{ margin: 0 }}>
                Review reservations, rental dates, payments, and customer
                information.
              </p>
            </div>

            <Link className="btn secondary" href="/owner">
              Back to Dashboard
            </Link>
          </div>

          <div
            className="portal-grid"
            style={{
              marginBottom: 24,
            }}
          >
            <div className="panel">
              <p className="muted">Total bookings</p>
              <h2>{bookings.length}</h2>
            </div>

            <div className="panel">
              <p className="muted">Pending approval</p>
              <h2>{pendingCount}</h2>
            </div>

            <div className="panel">
              <p className="muted">Today&apos;s pickups</p>
              <h2>{pickupCount}</h2>
            </div>

            <div className="panel">
              <p className="muted">Today&apos;s returns</p>
              <h2>{returnCount}</h2>
            </div>
          </div>

          {error && (
            <div className="notice" style={{ marginBottom: 24 }}>
              Unable to load bookings: {error.message}
            </div>
          )}

          {!error && bookings.length === 0 && (
            <div className="panel">
              <h2>No bookings yet</h2>

              <p className="muted">
                New customer reservations will appear here automatically.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {bookings.map((booking) => {
              const total = booking.total_cents ?? 0;
              const paid = booking.amount_paid_cents ?? 0;
              const balance = Math.max(total - paid, 0);
              const badgeColor = statusColor(booking.status);

              return (
                <article
                  className="panel"
                  key={booking.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <strong>
                      {booking.confirmation_code ?? booking.id.slice(0, 8)}
                    </strong>

                    <span
                      style={{
                        border: `1px solid ${badgeColor}`,
                        borderRadius: 999,
                        padding: "6px 12px",
                        color: badgeColor,
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {booking.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div>
                    <p className="muted" style={{ margin: "0 0 4px" }}>
                      Customer
                    </p>

                    <h2 style={{ margin: 0, fontSize: 22 }}>
                      {booking.customer_name || "Customer name unavailable"}
                    </h2>

                    {booking.customer_phone && (
                      <a
                        href={`tel:${booking.customer_phone.replace(/\D/g, "")}`}
                        style={{
                          display: "block",
                          marginTop: 8,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {booking.customer_phone}
                      </a>
                    )}

                    {booking.customer_email && (
                      <a
                        href={`mailto:${booking.customer_email}`}
                        style={{
                          display: "block",
                          marginTop: 6,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {booking.customer_email}
                      </a>
                    )}
                  </div>

                  <div>
                    <p className="muted" style={{ margin: "0 0 4px" }}>
                      Trailer record
                    </p>

                    <strong
                      style={{
                        overflowWrap: "anywhere",
                      }}
                    >
                      {booking.trailer_id ?? "Not assigned"}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Pickup
                      </p>

                      <strong>{formatDate(booking.pickup_at)}</strong>
                    </div>

                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Return
                      </p>

                      <strong>{formatDate(booking.return_at)}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Total
                      </p>

                      <strong>{formatMoney(booking.total_cents)}</strong>
                    </div>

                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Paid
                      </p>

                      <strong>{formatMoney(booking.amount_paid_cents)}</strong>
                    </div>

                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Deposit
                      </p>

                      <strong>{formatMoney(booking.deposit_cents)}</strong>
                    </div>

                    <div>
                      <p className="muted" style={{ margin: "0 0 4px" }}>
                        Balance
                      </p>

                      <strong>{formatMoney(balance)}</strong>
                    </div>
                  </div>

                  {(booking.tow_vehicle ||
                    booking.tow_rating_lbs ||
                    booking.intended_use) && (
                    <div>
                      <p className="muted" style={{ margin: "0 0 6px" }}>
                        Rental details
                      </p>

                      {booking.tow_vehicle && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Tow vehicle:</strong> {booking.tow_vehicle}
                        </p>
                      )}

                      {booking.tow_rating_lbs && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Tow rating:</strong>{" "}
                          {booking.tow_rating_lbs.toLocaleString()} lbs
                        </p>
                      )}

                      {booking.intended_use && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Intended use:</strong> {booking.intended_use}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 10,
                      marginTop: "auto",
                    }}
                  >
                    <Link
                      className="btn secondary"
                      href={`/owner/bookings/${booking.id}`}
                    >
                      View Details
                    </Link>

                    {booking.customer_phone && (
                      <a
                        className="btn secondary"
                        href={`sms:${booking.customer_phone.replace(/\D/g, "")}`}
                      >
                        Text Customer
                      </a>
                    )}

                    {booking.customer_email && (
                      <a
                        className="btn secondary"
                        href={`mailto:${booking.customer_email}`}
                      >
                        Email Customer
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}