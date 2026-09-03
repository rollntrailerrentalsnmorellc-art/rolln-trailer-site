import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import Stripe from "stripe";
import { addOnTotal, parseRentalAddOns } from "@/lib/addons";
import { TZDate } from "@date-fns/tz";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
  searchParams: Promise<{
    charge?: string;
    edit?: string;
  }>;
};

const ownerChargeTypes = [
  "extra_day",
  "damage",
  "cleaning",
  "late_fee",
  "add_on",
  "other",
] as const;

type OwnerChargeType = (typeof ownerChargeTypes)[number];

async function requireStaff() {
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

function dollarsToCents(value: string) {
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value.trim())) {
    throw new Error("Enter a valid charge amount.");
  }

  const [dollars, cents = ""] = value.trim().split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));

  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 5_000_000) {
    throw new Error("Charge amount must be between $1.00 and $50,000.00.");
  }

  return amount;
}

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

function parseEasternDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new TZDate(
    Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute),
    0, "America/New_York"
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTimeInput(value: string | null) {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function calculateRentalSubtotal(
  pickupAt: Date,
  returnAt: Date,
  dailyRate: number,
  weeklyRate: number | null
) {
  const rentalMs = returnAt.getTime() - pickupAt.getTime();
  const rentalDays = Math.max(1, Math.ceil(rentalMs / (24 * 60 * 60 * 1000)));

  if (weeklyRate && rentalDays >= 7) {
    const fullWeeks = Math.floor(rentalDays / 7);
    const extraDays = rentalDays % 7;
    return fullWeeks * weeklyRate + extraDays * dailyRate;
  }

  return rentalDays * dailyRate;
}

export default async function BookingDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const pageSearchParams = await searchParams;
  const chargeResult = pageSearchParams.charge;
  const editResult = pageSearchParams.edit;

  async function editBookingDates(formData: FormData) {
    "use server";

    await requireStaff();

    const pickupAt = parseEasternDateTime(String(formData.get("pickupAt") ?? ""));
    const returnAt = parseEasternDateTime(String(formData.get("returnAt") ?? ""));

    if (!pickupAt || !returnAt || returnAt <= pickupAt) {
      redirect(`/owner/bookings/${id}?edit=invalid`);
    }

    const admin = createAdminClient();
    const { data: currentBooking, error: bookingError } = await admin
      .from("bookings")
      .select("id, status, trailer_id, deposit_cents, owner_notes")
      .eq("id", id)
      .single();

    if (bookingError || !currentBooking) {
      redirect(`/owner/bookings/${id}?edit=load_failed`);
    }

    if (!["pending", "pending_payment"].includes(currentBooking.status)) {
      redirect(`/owner/bookings/${id}?edit=not_pending`);
    }

    const { data: conflicts, error: conflictError } = await admin
      .from("bookings")
      .select("id, confirmation_code")
      .eq("trailer_id", currentBooking.trailer_id)
      .neq("id", id)
      .in("status", ["pending_payment", "confirmed", "active"])
      .lt("pickup_at", returnAt.toISOString())
      .gt("return_at", pickupAt.toISOString())
      .limit(1);

    if (conflictError) redirect(`/owner/bookings/${id}?edit=check_failed`);
    if (conflicts?.length) redirect(`/owner/bookings/${id}?edit=conflict`);

    const { data: trailer, error: trailerError } = await admin
      .from("trailers")
      .select("daily_rate_cents, weekly_rate_cents, deposit_cents")
      .eq("id", currentBooking.trailer_id)
      .single();

    if (trailerError || !trailer) {
      redirect(`/owner/bookings/${id}?edit=pricing_failed`);
    }

    const subtotalCents = calculateRentalSubtotal(
      pickupAt,
      returnAt,
      trailer.daily_rate_cents ?? 0,
      trailer.weekly_rate_cents ?? null
    );
    const rentalDays = Math.max(1, Math.ceil((returnAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000)));
    const updatedSubtotalCents = subtotalCents + addOnTotal(parseRentalAddOns(currentBooking.owner_notes), rentalDays);

    const { error: updateError } = await admin
      .from("bookings")
      .update({
        pickup_at: pickupAt.toISOString(),
        return_at: returnAt.toISOString(),
        subtotal_cents: updatedSubtotalCents,
        deposit_cents: currentBooking.deposit_cents ?? trailer.deposit_cents ?? 5000,
        total_cents: updatedSubtotalCents,
      })
      .eq("id", id)
      .in("status", ["pending", "pending_payment"]);

    if (updateError) redirect(`/owner/bookings/${id}?edit=save_failed`);

    revalidatePath(`/owner/bookings/${id}`);
    revalidatePath("/owner/bookings");
    revalidatePath("/owner");
    redirect(`/owner/bookings/${id}?edit=updated`);
  }

  async function approveBooking() {
  "use server";

  await requireStaff();

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
      trailer_id,
      tow_rating_lbs,
      status,
      stripe_balance_invoice_id
      `)
    .eq("id", id)
    .single();

  if (bookingError || !currentBooking) {
    throw new Error(
      `Unable to load booking: ${bookingError?.message || "Booking not found"}`
    );
  }

  if (!["pending", "pending_payment"].includes(currentBooking.status)) {
    redirect(`/owner/bookings/${id}`);
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("trailer_id", currentBooking.trailer_id)
    .neq("id", id)
    .in("status", ["pending_payment", "confirmed", "active"])
    .lt("pickup_at", currentBooking.return_at)
    .gt("return_at", currentBooking.pickup_at)
    .limit(1);

  if (conflictError || conflicts?.length) {
    redirect(`/owner/bookings/${id}?edit=conflict`);
  }
  const { data: trailer, error: trailerError } = await supabase
  .from("trailers")
  .select("name, gvwr_lbs, status, is_public")
  .eq("id", currentBooking.trailer_id)
  .single();

if (trailerError || !trailer) {
  throw new Error("Unable to verify the trailer before approval.");
}

if (trailer.status === "inactive" || !trailer.is_public) {
  redirect(`/owner/bookings/${id}?edit=trailer_unavailable`);
}

if (!currentBooking.tow_rating_lbs || currentBooking.tow_rating_lbs > 40000 || (trailer.gvwr_lbs && currentBooking.tow_rating_lbs < trailer.gvwr_lbs)) {
  redirect(`/owner/bookings/${id}?edit=tow_rating`);
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
  replyTo: "rollntrailer@gmail.com",
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
    trailer_id,
    stripe_balance_invoice_id
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
  replyTo: "rollntrailer@gmail.com",
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
  async function resendBalanceInvoice() {
  "use server";

  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("stripe_balance_invoice_id")
    .eq("id", id)
    .single();

  if (error || !booking) {
    throw new Error("Unable to load booking.");
  }

  if (!booking.stripe_balance_invoice_id) {
    throw new Error("No balance invoice has been created for this booking.");
  }

  const invoice = await stripe.invoices.retrieve(
    booking.stripe_balance_invoice_id
  );

  if (invoice.status === "paid") {
    throw new Error("This invoice has already been paid.");
  }

  if (invoice.status !== "open") {
    throw new Error(`Invoice cannot be resent because it is ${invoice.status}.`);
  }

  await stripe.invoices.sendInvoice(
    booking.stripe_balance_invoice_id
  );

  revalidatePath(`/owner/bookings/${id}`);
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

  async function recordBalancePaidOffline() {
    "use server";

    const supabase = createAdminClient();

    const { data: currentBooking, error: bookingError } = await supabase
      .from("bookings")
      .select("total_cents, amount_paid_cents, stripe_balance_invoice_id")
      .eq("id", id)
      .single();

    if (bookingError || !currentBooking) {
      throw new Error("Unable to load the booking payment balance.");
    }

    const total = currentBooking.total_cents ?? 0;
    const amountPaid = currentBooking.amount_paid_cents ?? 0;

    if (amountPaid >= total) {
      redirect(`/owner/bookings/${id}`);
    }

    if (currentBooking.stripe_balance_invoice_id) {
      const invoice = await stripe.invoices.retrieve(
        currentBooking.stripe_balance_invoice_id
      );

      if (invoice.status === "open") {
        await stripe.invoices.voidInvoice(invoice.id);
      } else if (invoice.status === "paid") {
        redirect(`/owner/bookings/${id}`);
      }
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ amount_paid_cents: total })
      .eq("id", id);

    if (updateError) {
      throw new Error(
        `Unable to record offline payment: ${updateError.message}`
      );
    }

    revalidatePath(`/owner/bookings/${id}`);
    revalidatePath("/owner/bookings");
    revalidatePath("/owner");

    redirect(`/owner/bookings/${id}`);
  }

  async function chargeSavedCard(formData: FormData) {
    "use server";

    await requireStaff();

    const chargeType = String(formData.get("chargeType") ?? "") as OwnerChargeType;
    const description = String(formData.get("description") ?? "").trim();
    const amountCents = dollarsToCents(String(formData.get("amount") ?? ""));
    const requestedReturnAt = String(formData.get("requestedReturnAt") ?? "").trim();

    if (!ownerChargeTypes.includes(chargeType)) {
      throw new Error("Select a valid charge type.");
    }
    if (description.length < 3 || description.length > 500) {
      throw new Error("Add a short description between 3 and 500 characters.");
    }
    if (String(formData.get("confirmCharge")) !== "yes") {
      throw new Error("Confirm the charge before submitting it.");
    }

    const admin = createAdminClient();
    const { data: currentBooking, error: bookingError } = await admin
      .from("bookings")
      .select(`
        id,
        confirmation_code,
        customer_email,
        customer_name,
        trailer_id,
        status,
        return_at,
        stripe_customer_id,
        stripe_payment_intent_id
      `)
      .eq("id", id)
      .single();

    if (bookingError || !currentBooking) {
      throw new Error("Unable to load the rental for this charge.");
    }
    if (["cancelled", "declined"].includes(currentBooking.status)) {
      throw new Error("Cancelled or declined rentals cannot be charged.");
    }

    let approvedReturnAt: string | null = null;
    if (chargeType === "extra_day") {
      if (!["confirmed", "active"].includes(currentBooking.status)) {
        throw new Error("Only confirmed or active rentals can be extended.");
      }

      const parsedReturnAt = new Date(requestedReturnAt);
      if (!requestedReturnAt || !Number.isFinite(parsedReturnAt.getTime())) {
        throw new Error("Choose the new return date and time.");
      }
      if (parsedReturnAt <= new Date(currentBooking.return_at)) {
        throw new Error("The extended return must be later than the current return.");
      }

      approvedReturnAt = parsedReturnAt.toISOString();
      const { data: conflicts, error: conflictError } = await admin
        .from("bookings")
        .select("id, confirmation_code")
        .eq("trailer_id", currentBooking.trailer_id)
        .neq("id", currentBooking.id)
        .in("status", ["pending_payment", "confirmed", "active"])
        .lt("pickup_at", approvedReturnAt)
        .gt("return_at", currentBooking.return_at)
        .limit(1);

      if (conflictError) throw new Error(`Unable to verify availability: ${conflictError.message}`);
      if (conflicts?.length) {
        throw new Error(`Extension conflicts with rental ${conflicts[0].confirmation_code ?? conflicts[0].id}.`);
      }
    }

    let customerId = currentBooking.stripe_customer_id as string | null;
    if (!customerId) {
      const existing = await stripe.customers.list({
        email: currentBooking.customer_email,
        limit: 1,
      });
      customerId = existing.data[0]?.id ?? null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: currentBooking.customer_email,
          name: currentBooking.customer_name ?? undefined,
          metadata: {
            booking_id: currentBooking.id,
            confirmation_code: currentBooking.confirmation_code,
          },
        });
        customerId = customer.id;
      }

      await admin.from("bookings").update({ stripe_customer_id: customerId }).eq("id", id);
    }

    const { data: chargeRecord, error: chargeCreateError } = await admin
      .from("charges")
      .insert({
        booking_id: id,
        type: chargeType,
        description,
        amount_cents: amountCents,
        status: "pending",
      })
      .select("id")
      .single();

    if (chargeCreateError || !chargeRecord) {
      throw new Error(`Unable to record charge: ${chargeCreateError?.message ?? "Unknown error"}`);
    }

    let paymentMethodId: string | null = null;
    if (currentBooking.stripe_payment_intent_id) {
      try {
        const originalPayment = await stripe.paymentIntents.retrieve(
          currentBooking.stripe_payment_intent_id
        );
        paymentMethodId = typeof originalPayment.payment_method === "string"
          ? originalPayment.payment_method
          : originalPayment.payment_method?.id ?? null;
      } catch {
        paymentMethodId = null;
      }
    }

    if (!paymentMethodId) {
      const methods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      paymentMethodId = methods.data[0]?.id ?? null;
    }

    let chargePaid = false;
    if (paymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: "usd",
            customer: customerId,
            payment_method: paymentMethodId,
            off_session: true,
            confirm: true,
            description: `${description} — ${currentBooking.confirmation_code}`,
            metadata: {
              booking_id: id,
              confirmation_code: currentBooking.confirmation_code,
              charge_id: chargeRecord.id,
              charge_type: chargeType,
            },
          },
          { idempotencyKey: `owner-charge-${chargeRecord.id}` }
        );

        let receiptUrl: string | null = null;
        let stripeChargeId: string | null = null;
        if (typeof paymentIntent.latest_charge === "string") {
          const stripeCharge = await stripe.charges.retrieve(paymentIntent.latest_charge);
          stripeChargeId = stripeCharge.id;
          receiptUrl = stripeCharge.receipt_url;
        }

        const paidAt = new Date().toISOString();
        await admin.from("charges").update({
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
          paid_at: paidAt,
        }).eq("id", chargeRecord.id);

        await admin.from("payments").insert({
          booking_id: id,
          charge_id: chargeRecord.id,
          amount_cents: amountCents,
          status: "succeeded",
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: stripeChargeId,
          stripe_receipt_url: receiptUrl,
          paid_at: paidAt,
        });

        if (chargeType === "extra_day" && approvedReturnAt) {
          await admin.from("extensions").insert({
            booking_id: id,
            requested_return_at: approvedReturnAt,
            approved_return_at: approvedReturnAt,
            amount_cents: amountCents,
            status: "paid",
            owner_note: description,
          });
          await admin.from("bookings").update({ return_at: approvedReturnAt }).eq("id", id);
        }

        revalidatePath(`/owner/bookings/${id}`);
        revalidatePath("/owner/bookings");
        revalidatePath("/owner/payments");
        revalidatePath("/owner/fleet");
        chargePaid = true;
      } catch (error) {
        console.error("Saved card charge failed; sending invoice:", error);
      }
    }

    if (chargePaid) {
      redirect(`/owner/bookings/${id}?charge=paid`);
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 1,
      description: `${description} — ${currentBooking.confirmation_code}`,
      metadata: {
        booking_id: id,
        confirmation_code: currentBooking.confirmation_code,
        charge_id: chargeRecord.id,
        charge_type: chargeType,
        approved_return_at: approvedReturnAt ?? "",
      },
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: amountCents,
      currency: "usd",
      description,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalizedInvoice.id);
    await admin.from("charges").update({
      stripe_invoice_id: finalizedInvoice.id,
      status: "pending",
    }).eq("id", chargeRecord.id);

    if (chargeType === "extra_day" && approvedReturnAt) {
      const { error: extensionError } = await admin.from("extensions").insert({
        booking_id: id,
        requested_return_at: approvedReturnAt,
        approved_return_at: approvedReturnAt,
        amount_cents: amountCents,
        status: "approved",
        owner_note: `${description} · Stripe invoice ${finalizedInvoice.id}`,
      });
      const { error: returnUpdateError } = await admin
        .from("bookings")
        .update({ return_at: approvedReturnAt })
        .eq("id", id);

      if (extensionError || returnUpdateError) {
        await admin.from("extensions")
          .delete()
          .eq("booking_id", id)
          .eq("approved_return_at", approvedReturnAt)
          .eq("status", "approved");
        await admin.from("bookings").update({ return_at: currentBooking.return_at }).eq("id", id);
        await stripe.invoices.voidInvoice(finalizedInvoice.id);
        await admin.from("charges").update({ status: "failed" }).eq("id", chargeRecord.id);
        throw new Error("The extension could not be reserved, so its invoice was voided.");
      }
    }

    revalidatePath(`/owner/bookings/${id}`);
    revalidatePath("/owner/payments");
    redirect(`/owner/bookings/${id}?charge=invoice_sent`);
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
  const adminSupabase = createAdminClient();

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
      stripe_balance_invoice_id,
      stripe_customer_id,
      completed_at,
      cancelled_at,
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

  const selectedAddOns = parseRentalAddOns(booking.owner_notes);

  let driversLicenseUrl: string | null = null;
let insuranceUrl: string | null = null;

if (booking.drivers_license_path) {
  const { data } = await adminSupabase.storage
    .from("rental-documents")
    .createSignedUrl(booking.drivers_license_path, 60 * 60 * 24 * 365);

  driversLicenseUrl = data?.signedUrl ?? null;
}

if (booking.insurance_path) {
  const { data } = await adminSupabase.storage
    .from("rental-documents")
    .createSignedUrl(booking.insurance_path, 60 * 60 * 24 * 365);

  insuranceUrl = data?.signedUrl ?? null;
}

  const [{ data: additionalCharges }, { data: chargePayments }] = await Promise.all([
    adminSupabase
      .from("charges")
      .select("id, type, description, amount_cents, status, stripe_invoice_id, stripe_payment_intent_id, paid_at, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("payments")
      .select("charge_id, stripe_receipt_url")
      .eq("booking_id", id),
  ]);

  let savedCardLabel = "No saved card yet";
  if (booking.stripe_customer_id) {
    try {
      const methods = await stripe.paymentMethods.list({
        customer: booking.stripe_customer_id,
        type: "card",
        limit: 1,
      });
      const card = methods.data[0]?.card;
      if (card) savedCardLabel = `${card.brand.toUpperCase()} ending in ${card.last4}`;
    } catch (cardLookupError) {
      console.error("Unable to check saved card:", cardLookupError);
    }
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

          {editResult === "updated" && (
            <div className="notice" style={{ marginTop: 18 }}>
              Booking dates, times, and rental price were updated. The request
              is still pending and can now be approved.
            </div>
          )}

          {editResult && editResult !== "updated" && (
            <div className="notice" style={{ marginTop: 18 }}>
              {editResult === "invalid" &&
                "Choose a valid pickup and return time. The return must be after pickup."}
              {editResult === "conflict" &&
                "Those dates overlap another pending, confirmed, or active rental. Choose different times before approving."}
              {editResult === "not_pending" &&
                "Only bookings waiting for approval can be edited here."}
              {editResult === "tow_rating" &&
                "Approval is blocked because the tow rating is missing, unrealistic, or below this trailer's GVWR. Verify the vehicle capacity and decline the request if it is unsuitable."}
              {editResult === "trailer_unavailable" &&
                "Approval is blocked because this trailer is paused or archived."}
              {["load_failed", "check_failed", "pricing_failed", "save_failed"].includes(editResult) &&
                "The booking could not be updated. Please try again."}
            </div>
          )}

          {["pending", "pending_payment"].includes(booking.status) && (
            <form action={editBookingDates} className="panel" style={{ marginTop: 18 }}>
              <span className="eyebrow">Before approval</span>
              <h2>Edit Booking Schedule</h2>
              <p className="muted">
                Change the requested pickup or return time, then save. The site
                will check availability and recalculate the daily or weekly
                rental price. Saving does not approve the booking.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                  marginTop: 18,
                }}
              >
                <label>
                  <strong>Pickup date and time</strong>
                  <input
                    name="pickupAt"
                    type="datetime-local"
                    defaultValue={formatDateTimeInput(booking.pickup_at)}
                    required
                    style={{ width: "100%", minWidth: 0, marginTop: 6 }}
                  />
                </label>

                <label>
                  <strong>Return date and time</strong>
                  <input
                    name="returnAt"
                    type="datetime-local"
                    defaultValue={formatDateTimeInput(booking.return_at)}
                    required
                    style={{ width: "100%", minWidth: 0, marginTop: 6 }}
                  />
                </label>
              </div>

              <button className="btn secondary" type="submit" style={{ width: "100%", marginTop: 18 }}>
                Save New Dates &amp; Recalculate Price
              </button>

              <p className="muted" style={{ marginBottom: 0 }}>
                The corrected schedule will appear in the customer&apos;s approval
                email when you press Approve.
              </p>
            </form>
          )}

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
              {selectedAddOns.length > 0 && <div><strong>Rental add-ons:</strong><ul>{selectedAddOns.map((item) => <li key={item.id}>{item.name} — {formatMoney(item.pricePerDayCents)}/day</li>)}</ul></div>}
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

              <p>
                <strong>Card on file:</strong> {savedCardLabel}
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

          {chargeResult === "paid" && (
            <div className="notice" style={{ marginTop: 18, borderColor: "var(--green)" }}>
              Saved card charged successfully. The payment and receipt are recorded below.
            </div>
          )}

          {chargeResult === "invoice_sent" && (
            <div className="notice" style={{ marginTop: 18 }}>
              The saved card could not be charged automatically, so Stripe emailed the customer a secure invoice.
            </div>
          )}

          {!(["cancelled", "declined"] as string[]).includes(booking.status) && (
            <div className="panel" style={{ marginTop: 18 }}>
              <h2>Charge Customer</h2>
              <p className="muted">
                Charges the saved card securely. If the card needs customer approval or is not yet saved, Stripe emails a secure invoice instead.
              </p>

              <form action={chargeSavedCard} style={{ display: "grid", gap: 14 }}>
                <label>
                  <strong>Charge type</strong>
                  <select name="chargeType" required defaultValue="extra_day" style={{ width: "100%", minHeight: 48, marginTop: 6 }}>
                    <option value="extra_day">Rental extension / extra day</option>
                    <option value="damage">Damage</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="late_fee">Late fee</option>
                    <option value="add_on">Add-on</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  <strong>Amount</strong>
                  <input name="amount" inputMode="decimal" placeholder="120.00" required style={{ width: "100%", minHeight: 48, marginTop: 6 }} />
                </label>

                <label>
                  <strong>Description</strong>
                  <textarea name="description" rows={3} maxLength={500} placeholder="Example: One-day rental extension" required style={{ width: "100%", marginTop: 6 }} />
                </label>

                <label>
                  <strong>New return date and time</strong>
                  <span className="muted"> — required only for an extension</span>
                  <input name="requestedReturnAt" type="datetime-local" style={{ width: "100%", minHeight: 48, marginTop: 6 }} />
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input name="confirmCharge" type="checkbox" value="yes" required style={{ width: 22, height: 22, marginTop: 2 }} />
                  <span>I reviewed the amount and reason and authorize this customer charge.</span>
                </label>

                <button className="btn" type="submit" style={{ width: "100%" }}>
                  Charge Saved Card / Send Invoice
                </button>
              </form>
            </div>
          )}

          <div className="panel" style={{ marginTop: 18 }}>
            <h2>Additional Charges &amp; Receipts</h2>
            {!additionalCharges?.length ? (
              <p className="muted">No extension, damage, cleaning, or late-fee charges recorded.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {additionalCharges.map((charge) => (
                  <div key={charge.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ textTransform: "capitalize" }}>{charge.type.replaceAll("_", " ")}</strong>
                      <strong>{formatMoney(charge.amount_cents)}</strong>
                    </div>
                    <p style={{ margin: "8px 0" }}>{charge.description || "No description"}</p>
                    <div className="muted" style={{ fontSize: 13, textTransform: "capitalize" }}>
                      {charge.status.replaceAll("_", " ")} · {formatDate(charge.paid_at || charge.created_at)}
                    </div>
                    {chargePayments?.find((payment) => payment.charge_id === charge.id)?.stripe_receipt_url && (
                      <a
                        className="btn2"
                        href={chargePayments.find((payment) => payment.charge_id === charge.id)?.stripe_receipt_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginTop: 10 }}
                      >
                        View Stripe Receipt
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
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

          {(booking.status === "confirmed" || booking.status === "active") &&
  balance > 0 &&
  booking.stripe_balance_invoice_id && (
    <form action={resendBalanceInvoice} style={{ width: "100%" }}>
      <button
        className="btn secondary"
        type="submit"
        style={{ width: "100%" }}
      >
        Resend Balance Invoice — {formatMoney(balance)}
      </button>
    </form>
  )}

{booking.status === "confirmed" && (
  <form action={markPickedUp} style={{ width: "100%" }}>
    <button
      className="btn secondary"
      type="submit"
      style={{ width: "100%" }}
    >
      Mark Picked Up
    </button>
  </form>
)}

{booking.status === "active" && (
  <>
    {balance > 0 ? (
      <>
        <div
          className="notice"
          style={{ width: "100%", gridColumn: "1 / -1" }}
        >
          Record or collect the remaining {formatMoney(balance)} balance before
          marking this rental returned.
        </div>
        <form
          action={recordBalancePaidOffline}
          style={{ width: "100%" }}
        >
          <button
            className="btn secondary"
            type="submit"
            style={{ width: "100%" }}
          >
            Record Balance Paid Offline — {formatMoney(balance)}
          </button>
        </form>
      </>
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
