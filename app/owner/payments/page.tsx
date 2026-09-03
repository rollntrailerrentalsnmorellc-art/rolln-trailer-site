import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type BookingPayment = {
  id: string;
  confirmation_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  total_cents: number | null;
  deposit_cents: number | null;
  amount_paid_cents: number | null;
  stripe_checkout_session_id: string | null;
  stripe_balance_invoice_id: string | null;
  created_at: string;
};

type AdditionalCharge = {
  id: string;
  booking_id: string;
  type: string;
  description: string | null;
  amount_cents: number;
  status: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main><section><div className="container"><div className="notice">
        <h1>Owner sign-in required</h1>
        <Link className="btn" href="/owner/login">Owner Sign-In</Link>
      </div></div></section></main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "staff"].includes(profile.role)) {
    return <main><section><div className="container"><div className="notice">Owner access required.</div></div></section></main>;
  }

  const [bookingResult, chargeResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, confirmation_code, customer_name, customer_email, status, total_cents, deposit_cents, amount_paid_cents, stripe_checkout_session_id, stripe_balance_invoice_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("charges")
      .select("id, booking_id, type, description, amount_cents, status, stripe_invoice_id, stripe_payment_intent_id, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const bookings = (bookingResult.data ?? []) as BookingPayment[];
  const charges = (chargeResult.data ?? []) as AdditionalCharge[];
  const additionalRevenue = charges
    .filter((charge) => charge.status === "succeeded")
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const recordedRevenue = bookings.reduce((sum, booking) => sum + (booking.amount_paid_cents ?? 0), 0) + additionalRevenue;
  const outstanding = bookings.reduce((sum, booking) => sum + Math.max((booking.total_cents ?? 0) - (booking.amount_paid_cents ?? 0), 0), 0) +
    charges.filter((charge) => charge.status === "pending").reduce((sum, charge) => sum + charge.amount_cents, 0);
  const deposits = bookings.reduce((sum, booking) => sum + Math.min(booking.amount_paid_cents ?? 0, booking.deposit_cents ?? 0), 0);
  const paidBookings = bookings.filter((booking) => (booking.amount_paid_cents ?? 0) >= (booking.total_cents ?? 0) && (booking.total_cents ?? 0) > 0).length;

  return (
    <main><section><div className="container">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Private owner area</span>
          <h1 style={{ marginBottom: 8 }}>Payments</h1>
          <p className="muted" style={{ margin: 0 }}>Deposits, paid totals, open balances, and invoice follow-up.</p>
        </div>
        <Link className="btn secondary" href="/owner">Back to Dashboard</Link>
      </div>

      <div className="portal-grid" style={{ marginBottom: 22 }}>
        <div className="panel"><p className="muted">Recorded revenue</p><h2>{money(recordedRevenue)}</h2></div>
        <div className="panel"><p className="muted">Deposits collected</p><h2>{money(deposits)}</h2></div>
        <div className="panel"><p className="muted">Outstanding balances</p><h2 style={{ color: outstanding > 0 ? "#f59e0b" : "var(--green)" }}>{money(outstanding)}</h2></div>
        <div className="panel"><p className="muted">Fully paid rentals</p><h2>{paidBookings}</h2></div>
        <div className="panel"><p className="muted">Extension &amp; fee revenue</p><h2>{money(additionalRevenue)}</h2></div>
      </div>

      {bookingResult.error && <div className="notice">Unable to load payments: {bookingResult.error.message}</div>}
      {chargeResult.error && <div className="notice">Unable to load additional charges: {chargeResult.error.message}</div>}
      {!bookingResult.error && bookings.length === 0 && <div className="panel"><h2>No payment records yet</h2></div>}

      <div className="panel" style={{ marginBottom: 18 }}>
        <h2>Extensions, Damage &amp; Fees</h2>
        {charges.length === 0 ? (
          <p className="muted">No additional customer charges recorded.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {charges.map((charge) => {
              const booking = bookings.find((item) => item.id === charge.booking_id);
              return (
                <div key={charge.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ textTransform: "capitalize" }}>{charge.type.replaceAll("_", " ")}</strong>
                    <strong>{money(charge.amount_cents)}</strong>
                  </div>
                  <p style={{ margin: "7px 0" }}>{charge.description || "No description"}</p>
                  <p className="muted" style={{ margin: 0, fontSize: 13, textTransform: "capitalize" }}>
                    {booking?.confirmation_code || charge.booking_id.slice(0, 8)} · {charge.status.replaceAll("_", " ")} · {date(charge.paid_at || charge.created_at)}
                  </p>
                  <Link className="btn2" href={`/owner/bookings/${charge.booking_id}`} style={{ marginTop: 10 }}>View Rental</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <h2>Booking balances</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 12 }}>Booking</th>
              <th style={{ padding: 12 }}>Customer</th>
              <th style={{ padding: 12 }}>Total</th>
              <th style={{ padding: 12 }}>Paid</th>
              <th style={{ padding: 12 }}>Balance</th>
              <th style={{ padding: 12 }}>Payment record</th>
              <th style={{ padding: 12 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const total = booking.total_cents ?? 0;
              const paid = booking.amount_paid_cents ?? 0;
              const balance = Math.max(total - paid, 0);
              const paymentRecord = paid === 0
                ? "Not paid"
                : booking.stripe_checkout_session_id
                  ? (booking.stripe_balance_invoice_id ? "Stripe / recorded" : "Stripe deposit")
                  : "Recorded offline";

              return (
                <tr key={booking.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 12 }}>
                    <strong>{booking.confirmation_code || booking.id.slice(0, 8)}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>{date(booking.created_at)}</div>
                  </td>
                  <td style={{ padding: 12 }}>{booking.customer_name || booking.customer_email || "Unknown"}</td>
                  <td style={{ padding: 12 }}>{money(total)}</td>
                  <td style={{ padding: 12, color: paid > 0 ? "var(--green)" : undefined }}>{money(paid)}</td>
                  <td style={{ padding: 12, color: balance > 0 ? "#f59e0b" : "var(--green)", fontWeight: 800 }}>{money(balance)}</td>
                  <td style={{ padding: 12 }}>{paymentRecord}</td>
                  <td style={{ padding: 12 }}><Link className="btn2" href={`/owner/bookings/${booking.id}`}>{balance > 0 ? "Collect / Record" : "View"}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div></section></main>
  );
}
