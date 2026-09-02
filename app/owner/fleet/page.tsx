import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fallbackImages, money } from "@/lib/trailers";

export const revalidate = 0;

type Trailer = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  is_public: boolean;
  gvwr_lbs: number | null;
  payload_lbs: number | null;
  daily_rate_cents: number | null;
  weekly_rate_cents: number | null;
  deposit_cents: number | null;
  image_urls: string[] | null;
};

type Booking = {
  id: string;
  trailer_id: string | null;
  confirmation_code: string | null;
  customer_name: string | null;
  status: string;
  pickup_at: string;
  return_at: string;
  total_cents: number | null;
  amount_paid_cents: number | null;
};

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Owner sign-in required.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "staff"].includes(profile.role)) {
    throw new Error("Owner access required.");
  }

  return supabase;
}

async function setPublicVisibility(formData: FormData) {
  "use server";

  await requireOwner();
  const trailerId = String(formData.get("trailerId") ?? "");
  const isPublic = String(formData.get("isPublic")) === "true";

  if (!trailerId) throw new Error("Trailer is required.");

  const { error } = await createAdminClient()
    .from("trailers")
    .update({ is_public: isPublic })
    .eq("id", trailerId);

  if (error) throw new Error(`Unable to update trailer: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/owner");
  revalidatePath("/owner/fleet");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function FleetPage() {
  let supabase;

  try {
    supabase = await requireOwner();
  } catch {
    return (
      <main><section><div className="container"><div className="notice">
        <h1>Owner sign-in required</h1>
        <Link className="btn" href="/login">Owner Sign-In</Link>
      </div></div></section></main>
    );
  }

  const now = new Date().toISOString();
  const [trailerResult, bookingResult] = await Promise.all([
    supabase
      .from("trailers")
      .select("id, slug, name, description, status, is_public, gvwr_lbs, payload_lbs, daily_rate_cents, weekly_rate_cents, deposit_cents, image_urls")
      .order("sort_order"),
    supabase
      .from("bookings")
      .select("id, trailer_id, confirmation_code, customer_name, status, pickup_at, return_at, total_cents, amount_paid_cents")
      .order("pickup_at", { ascending: false })
      .limit(250),
  ]);

  const trailers = (trailerResult.data ?? []) as Trailer[];
  const bookings = (bookingResult.data ?? []) as Booking[];

  return (
    <main><section><div className="container">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Private owner area</span>
          <h1 style={{ marginBottom: 8 }}>Fleet Manager</h1>
          <p className="muted" style={{ margin: 0 }}>See availability, rates, specifications, and upcoming rentals.</p>
        </div>
        <Link className="btn secondary" href="/owner">Back to Dashboard</Link>
      </div>

      {trailerResult.error && <div className="notice">Unable to load fleet: {trailerResult.error.message}</div>}

      <div style={{ display: "grid", gap: 18 }}>
        {trailers.map((trailer) => {
          const trailerBookings = bookings.filter((booking) => booking.trailer_id === trailer.id);
          const upcomingBookings = trailerBookings
            .filter((booking) =>
              booking.return_at >= now &&
              ["confirmed", "active", "pending_payment"].includes(booking.status)
            )
            .sort((a, b) => a.pickup_at.localeCompare(b.pickup_at));
          const rentalHistory = trailerBookings
            .filter((booking) =>
              booking.return_at < now ||
              ["completed", "cancelled"].includes(booking.status)
            )
            .slice(0, 10);
          const image = trailer.image_urls?.[0] || fallbackImages[trailer.slug]?.[0] || "/images/Logo.png";

          return (
            <article className="panel" key={trailer.id} style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr", gap: 18, alignItems: "start" }}>
                <img src={image} alt={trailer.name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 14 }} />
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ margin: 0 }}>{trailer.name}</h2>
                    <span className="chip" style={{ color: trailer.is_public ? "var(--green)" : "#f59e0b" }}>
                      {trailer.is_public ? "Bookable online" : "Hidden from customers"}
                    </span>
                  </div>
                  <p className="muted">{trailer.description || "No description"}</p>
                  <div className="chips">
                    <span className="chip">{money(trailer.daily_rate_cents)}/day</span>
                    {trailer.weekly_rate_cents ? <span className="chip">{money(trailer.weekly_rate_cents)}/week</span> : null}
                    <span className="chip">{money(trailer.deposit_cents)} deposit</span>
                    {trailer.gvwr_lbs ? <span className="chip">{trailer.gvwr_lbs.toLocaleString()} lb GVWR</span> : null}
                    {trailer.payload_lbs ? <span className="chip">{trailer.payload_lbs.toLocaleString()} lb payload</span> : null}
                  </div>
                  <div className="actions">
                    {trailer.is_public && <Link className="btn2" href={`/trailers/${trailer.slug}`}>View Customer Listing</Link>}
                    <form action={setPublicVisibility}>
                      <input type="hidden" name="trailerId" value={trailer.id} />
                      <input type="hidden" name="isPublic" value={String(!trailer.is_public)} />
                      <button className={trailer.is_public ? "btn2" : "btn"} type="submit">
                        {trailer.is_public ? "Pause Online Bookings" : "Make Bookable Online"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <strong>Upcoming schedule</strong>
                {upcomingBookings.length === 0 ? (
                  <p className="muted">No active or upcoming rentals.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {upcomingBookings.slice(0, 4).map((booking) => (
                      <Link key={booking.id} className="chip" href={`/owner/bookings/${booking.id}`} style={{ textDecoration: "none" }}>
                        {booking.confirmation_code || booking.id.slice(0, 8)} · {formatDate(booking.pickup_at)}–{formatDate(booking.return_at)} · {booking.status.replaceAll("_", " ")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <strong>Rental history</strong>
                {rentalHistory.length === 0 ? (
                  <p className="muted">No previous rentals for this trailer.</p>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                      <thead>
                        <tr style={{ textAlign: "left" }}>
                          <th style={{ padding: 10 }}>Rental</th>
                          <th style={{ padding: 10 }}>Customer</th>
                          <th style={{ padding: 10 }}>Dates</th>
                          <th style={{ padding: 10 }}>Status</th>
                          <th style={{ padding: 10 }}>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentalHistory.map((booking) => {
                          const total = booking.total_cents ?? 0;
                          const paid = booking.amount_paid_cents ?? 0;
                          const balance = Math.max(total - paid, 0);

                          return (
                            <tr key={booking.id} style={{ borderTop: "1px solid var(--line)" }}>
                              <td style={{ padding: 10 }}>
                                <Link href={`/owner/bookings/${booking.id}`} style={{ color: "var(--green)", fontWeight: 800 }}>
                                  {booking.confirmation_code || booking.id.slice(0, 8)}
                                </Link>
                              </td>
                              <td style={{ padding: 10 }}>{booking.customer_name || "Unknown"}</td>
                              <td style={{ padding: 10 }}>{formatDate(booking.pickup_at)}–{formatDate(booking.return_at)}</td>
                              <td style={{ padding: 10, textTransform: "capitalize" }}>{booking.status.replaceAll("_", " ")}</td>
                              <td style={{ padding: 10, color: balance > 0 ? "#f59e0b" : "var(--green)" }}>
                                {money(paid)} paid · {money(balance)} due
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div></section></main>
  );
}
