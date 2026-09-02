import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type Booking = {
  id: string;
  confirmation_code: string | null;
  status: string;
  pickup_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_cents: number | null;
  amount_paid_cents: number | null;
  drivers_license_path: string | null;
  insurance_path: string | null;
};

type Customer = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  bookings: Booking[];
  totalPaid: number;
  balance: number;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main><section><div className="container"><div className="notice">
        <h1>Owner sign-in required</h1>
        <Link className="btn" href="/login">Owner Sign-In</Link>
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

  const { data, error } = await supabase
    .from("bookings")
    .select("id, confirmation_code, status, pickup_at, customer_name, customer_email, customer_phone, total_cents, amount_paid_cents, drivers_license_path, insurance_path")
    .order("pickup_at", { ascending: false });

  const grouped = new Map<string, Customer>();

  for (const booking of (data ?? []) as Booking[]) {
    const key = booking.customer_email?.trim().toLowerCase() || booking.customer_phone?.replace(/\D/g, "") || booking.customer_name || booking.id;
    const existing = grouped.get(key);
    const paid = booking.amount_paid_cents ?? 0;
    const balance = Math.max((booking.total_cents ?? 0) - paid, 0);

    if (existing) {
      existing.bookings.push(booking);
      existing.totalPaid += paid;
      existing.balance += balance;
    } else {
      grouped.set(key, {
        key,
        name: booking.customer_name || "Unnamed customer",
        email: booking.customer_email,
        phone: booking.customer_phone,
        bookings: [booking],
        totalPaid: paid,
        balance,
      });
    }
  }

  const query = (await searchParams)?.q?.trim().toLowerCase() || "";
  const customers = [...grouped.values()].filter((customer) =>
    !query || [customer.name, customer.email, customer.phone].some((value) => value?.toLowerCase().includes(query))
  );
  const repeatCustomers = [...grouped.values()].filter((customer) => customer.bookings.length > 1).length;
  const customerBalances = [...grouped.values()].reduce((sum, customer) => sum + customer.balance, 0);

  return (
    <main><section><div className="container">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Private owner area</span>
          <h1 style={{ marginBottom: 8 }}>Customers</h1>
          <p className="muted" style={{ margin: 0 }}>Contact details, rental history, documents, and balances.</p>
        </div>
        <Link className="btn secondary" href="/owner">Back to Dashboard</Link>
      </div>

      <div className="portal-grid" style={{ marginBottom: 20 }}>
        <div className="panel"><p className="muted">Customers</p><h2>{grouped.size}</h2></div>
        <div className="panel"><p className="muted">Repeat customers</p><h2>{repeatCustomers}</h2></div>
        <div className="panel"><p className="muted">Open customer balances</p><h2>{money(customerBalances)}</h2></div>
      </div>

      <form method="get" className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <input name="q" defaultValue={query} aria-label="Search customers" placeholder="Search name, email, or phone" style={{ flex: "1 1 260px", minHeight: 48, padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "#080b08", color: "white", font: "inherit" }} />
        <button className="btn" type="submit">Search</button>
        {query && <Link className="btn2" href="/owner/customers">Clear</Link>}
      </form>

      {error && <div className="notice">Unable to load customers: {error.message}</div>}
      {!error && customers.length === 0 && <div className="panel"><h2>No customers found</h2><p className="muted">Try a different search.</p></div>}

      <div style={{ display: "grid", gap: 16 }}>
        {customers.map((customer) => {
          const latest = customer.bookings[0];
          const hasDocuments = Boolean(latest.drivers_license_path && latest.insurance_path);

          return (
            <article className="panel" key={customer.key}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{customer.name}</h2>
                  <p className="muted" style={{ margin: "6px 0 0" }}>{customer.email || "No email"} · {customer.phone || "No phone"}</p>
                </div>
                <div className="chips">
                  <span className="chip">{customer.bookings.length} rental{customer.bookings.length === 1 ? "" : "s"}</span>
                  <span className="chip">{money(customer.totalPaid)} paid</span>
                  <span className="chip" style={{ color: customer.balance > 0 ? "#f59e0b" : "var(--green)" }}>{money(customer.balance)} due</span>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <strong>Latest rental</strong>
                <p className="muted">{latest.confirmation_code || latest.id.slice(0, 8)} · {formatDate(latest.pickup_at)} · {latest.status.replaceAll("_", " ")} · {hasDocuments ? "documents on file" : "documents incomplete"}</p>
                <div className="actions">
                  <Link className="btn2" href={`/owner/bookings/${latest.id}`}>View Rental History</Link>
                  {customer.phone && <a className="btn2" href={`sms:${customer.phone.replace(/\D/g, "")}`}>Text</a>}
                  {customer.email && <a className="btn2" href={`mailto:${customer.email}`}>Email</a>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div></section></main>
  );
}
