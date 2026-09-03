import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;

type ImportRow = {
  bookingId?: string;
  sourceEntryId: string;
  trailerSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  pickupAt: string;
  returnAt: string;
  towVehicle?: string;
  intendedUse?: string;
  totalCents?: number;
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
}

function isValidDate(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

async function importHistory(formData: FormData) {
  "use server";

  await requireOwner();
  const rawPayload = String(formData.get("payload") ?? "").trim();
  if (!rawPayload) throw new Error("Import data is required.");

  let rows: ImportRow[];
  try {
    const parsed = JSON.parse(rawPayload);
    if (!Array.isArray(parsed)) throw new Error("Expected an array.");
    rows = parsed;
  } catch {
    throw new Error("The import data is not valid JSON.");
  }

  if (rows.length === 0 || rows.length > 250) {
    throw new Error("Import must contain between 1 and 250 rentals.");
  }

  const admin = createAdminClient();
  const [{ data: trailers, error: trailerError }, { data: existing, error: bookingError }] = await Promise.all([
    admin.from("trailers").select("id, slug"),
    admin.from("bookings").select("confirmation_code, customer_email, trailer_id, pickup_at, return_at").limit(1000),
  ]);

  if (trailerError) throw new Error(`Unable to load trailers: ${trailerError.message}`);
  if (bookingError) throw new Error(`Unable to check existing rentals: ${bookingError.message}`);

  const trailerIds = new Map((trailers ?? []).map((trailer) => [trailer.slug, trailer.id]));
  const existingCodes = new Set((existing ?? []).map((booking) => booking.confirmation_code));
  const existingRentals = new Set((existing ?? []).map((booking) =>
    `${String(booking.customer_email).toLowerCase()}|${booking.trailer_id}|${booking.pickup_at.slice(0, 10)}|${booking.return_at.slice(0, 10)}`
  ));

  const inserts = [];
  let skipped = 0;
  let updated = 0;

  for (const row of rows) {
    const sourceEntryId = String(row.sourceEntryId ?? "").trim();
    const trailerId = trailerIds.get(String(row.trailerSlug ?? ""));
    const customerName = String(row.customerName ?? "").trim();
    const customerEmail = String(row.customerEmail ?? "").trim().toLowerCase();
    const pickupAt = String(row.pickupAt ?? "");
    const returnAt = String(row.returnAt ?? "");
    const confirmationCode = `COGNITO-${sourceEntryId}`;
    const bookingId = String(row.bookingId ?? "").trim();
    const totalCents = Number(row.totalCents ?? 0);

    if (!sourceEntryId || !trailerId || !customerName || !customerEmail || !isValidDate(pickupAt) || !isValidDate(returnAt) || !Number.isSafeInteger(totalCents) || totalCents < 0 || totalCents > 5_000_000) {
      throw new Error(`Cognito entry ${sourceEntryId || "unknown"} is missing required information.`);
    }
    if (new Date(returnAt) <= new Date(pickupAt)) {
      throw new Error(`Cognito entry ${sourceEntryId} has an invalid rental date range.`);
    }

    const rentalKey = `${customerEmail}|${trailerId}|${pickupAt.slice(0, 10)}|${returnAt.slice(0, 10)}`;
    if (bookingId) {
      const { data: current, error: currentError } = await admin
        .from("bookings")
        .select("id, status, customer_email, trailer_id")
        .eq("id", bookingId)
        .single();
      if (currentError || !current || current.status !== "completed" || String(current.customer_email).toLowerCase() !== customerEmail || current.trailer_id !== trailerId) {
        throw new Error(`Completed rental ${bookingId} does not match the supplied customer and trailer.`);
      }
      const { error: updateError } = await admin.from("bookings").update({
        pickup_at: pickupAt,
        return_at: returnAt,
        subtotal_cents: totalCents,
        total_cents: totalCents,
        amount_paid_cents: totalCents,
        completed_at: returnAt,
        owner_notes: `Historical rental corrected from owner-provided records. Dates and paid total verified; pickup and return times use the legacy-history convention.`,
      }).eq("id", bookingId).eq("status", "completed");
      if (updateError) throw new Error(`Unable to update rental ${bookingId}: ${updateError.message}`);
      updated += 1;
      continue;
    }
    if (existingCodes.has(confirmationCode) || existingRentals.has(rentalKey)) {
      skipped += 1;
      continue;
    }

    existingCodes.add(confirmationCode);
    existingRentals.add(rentalKey);
    inserts.push({
      confirmation_code: confirmationCode,
      trailer_id: trailerId,
      status: "completed",
      pickup_at: pickupAt,
      return_at: returnAt,
      customer_email: customerEmail,
      customer_phone: String(row.customerPhone ?? "").trim() || null,
      customer_name: customerName,
      tow_vehicle: String(row.towVehicle ?? "").trim() || null,
      intended_use: String(row.intendedUse ?? "").trim() || null,
      subtotal_cents: totalCents,
      deposit_cents: 0,
      total_cents: totalCents,
      amount_paid_cents: totalCents,
      agreement_accepted_at: pickupAt,
      agreement_version: "Cognito Forms legacy intake",
      owner_notes: `Historical rental added from owner-provided records. Dates and paid total verified; pickup and return times use the legacy-history convention.`,
      completed_at: returnAt,
    });
  }

  if (inserts.length > 0) {
    const { error } = await admin.from("bookings").insert(inserts);
    if (error) throw new Error(`Unable to import rental history: ${error.message}`);
  }

  revalidatePath("/owner");
  revalidatePath("/owner/bookings");
  revalidatePath("/owner/customers");
  revalidatePath("/owner/fleet");
  redirect(`/owner/import-history?imported=${inserts.length}&updated=${updated}&skipped=${skipped}`);
}

export default async function ImportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; skipped?: string }>;
}) {
  try {
    await requireOwner();
  } catch {
    return (
      <main><section><div className="container"><div className="notice">
        <h1>Owner sign-in required</h1>
        <Link className="btn" href="/login">Owner Sign-In</Link>
      </div></div></section></main>
    );
  }

  const result = await searchParams;

  return (
    <main><section><div className="container" style={{ maxWidth: 820 }}>
      <span className="eyebrow">Private owner area</span>
      <h1>Import Rental History</h1>
      <p className="muted">
        Imports completed rentals into Supabase. Existing confirmation codes and matching customer/trailer/date records are skipped automatically.
      </p>

      {result.imported !== undefined && (
        <div className="notice" style={{ marginBottom: 18 }}>
          Added {result.imported} rental{result.imported === "1" ? "" : "s"}; updated {result.updated ?? "0"}; skipped {result.skipped ?? "0"} duplicate{result.skipped === "1" ? "" : "s"}.
        </div>
      )}

      <form action={importHistory} className="panel" style={{ display: "grid", gap: 14 }}>
        <label htmlFor="payload"><strong>Validated rental data</strong></label>
        <textarea
          id="payload"
          name="payload"
          required
          rows={14}
          spellCheck={false}
          placeholder="Paste the validated JSON rental array here."
          style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
        />
        <button className="btn" type="submit">Import Completed Rentals</button>
      </form>

      <div className="actions" style={{ marginTop: 18 }}>
        <Link className="btn2" href="/owner/fleet">Back to Fleet</Link>
        <Link className="btn2" href="/owner/bookings">View All Rentals</Link>
      </div>
    </div></section></main>
  );
}
