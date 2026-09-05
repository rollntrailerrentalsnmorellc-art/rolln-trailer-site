import Stripe from "stripe";

type BalanceBooking = {
  id: string;
  confirmation_code: string;
  customer_email: string;
  customer_name: string | null;
  pickup_at: string;
  total_cents: number | null;
  amount_paid_cents: number | null;
  stripe_customer_id: string | null;
  stripe_balance_invoice_id: string | null;
};

export async function createBalanceInvoice(stripe: Stripe, booking: BalanceBooking) {
  if (booking.stripe_balance_invoice_id) return booking.stripe_balance_invoice_id;

  const balance = (booking.total_cents ?? 0) - (booking.amount_paid_cents ?? 0);
  if (balance <= 0) return null;

  let customerId = booking.stripe_customer_id;
  if (!customerId) {
    const matches = await stripe.customers.list({ email: booking.customer_email, limit: 1 });
    customerId = matches.data[0]?.id ?? (await stripe.customers.create({
      email: booking.customer_email,
      name: booking.customer_name ?? undefined,
      metadata: { booking_id: booking.id, confirmation_code: booking.confirmation_code },
    })).id;
  }

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    due_date: Math.max(Math.floor(new Date(booking.pickup_at).getTime() / 1000), Math.floor(Date.now() / 1000) + 3600),
    description: `Final balance for trailer rental ${booking.confirmation_code}`,
    metadata: { booking_id: booking.id, confirmation_code: booking.confirmation_code },
  }, { idempotencyKey: `balance-invoice-${booking.id}` });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: balance,
    currency: "usd",
    description: `Final rental balance — ${booking.confirmation_code}`,
  }, { idempotencyKey: `balance-invoice-balance-${booking.id}` });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {}, {
    idempotencyKey: `balance-invoice-finalize-${booking.id}`,
  });
  await stripe.invoices.sendInvoice(finalized.id, {}, {
    idempotencyKey: `balance-invoice-send-${booking.id}`,
  });
  return finalized.id;
}
