"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function formatSelectedDate(value: string | null) {
  if (!value) return "Not selected";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function BookingForm() {
  const searchParams = useSearchParams();

  const trailerId = searchParams.get("trailerId");
  const pickup = searchParams.get("pickup");
  const returnAt = searchParams.get("returnAt");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const form = event.currentTarget;

    setSubmitting(true);
    setMessage("");

    const formData = new FormData(form);

    const bookingData = {
      trailerId,
      pickup,
      returnAt,
      customerName: String(formData.get("customerName") || ""),
      customerEmail: String(formData.get("customerEmail") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      address: String(formData.get("address") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      zipCode: String(formData.get("zipCode") || ""),
      towVehicle: String(formData.get("towVehicle") || ""),
      towRatingLbs: Number(formData.get("towRatingLbs") || 0),
      intendedUse: String(formData.get("intendedUse") || ""),
      emergencyContactName: String(
        formData.get("emergencyContactName") || ""
      ),
      emergencyContactPhone: String(
        formData.get("emergencyContactPhone") || ""
      ),
      agreementAccepted: formData.get("agreementAccepted") === "on",
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Unable to submit your reservation.");
        setSubmitting(false);
        return;
      }

      setMessage(
        `Reservation submitted successfully. Confirmation: ${result.confirmationCode}`
      );

      form.reset();
    } catch {
      setMessage("Unable to submit your reservation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!trailerId || !pickup || !returnAt) {
    return (
      <main>
        <section>
          <div className="container">
            <div className="notice">
              <h1>Reservation information missing</h1>

              <p className="muted">
                Please return to the trailers section and select your rental
                dates again.
              </p>

              <a className="btn" href="/#trailers">
                View Trailers
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section>
        <div className="container">
          <span className="eyebrow">Rental request</span>

          <h1>Complete Your Reservation</h1>

          <p className="muted">
            Submit your information below. Your reservation remains pending
            until approved by Roll&apos;N Trailer Rentals N More LLC.
          </p>

          <div
            className="panel"
            style={{
              marginTop: 24,
              marginBottom: 24,
            }}
          >
            <h2>Reservation Details</h2>

            <p style={{ overflowWrap: "anywhere" }}>
              <strong>Trailer record:</strong> {trailerId}
            </p>

            <p>
              <strong>Pickup:</strong> {formatSelectedDate(pickup)}
            </p>

            <p>
              <strong>Return:</strong> {formatSelectedDate(returnAt)}
            </p>
          </div>

          <form
            className="form"
            onSubmit={submitBooking}
            style={{
              width: "100%",
              maxWidth: 850,
            }}
          >
            <h2>Customer Information</h2>

            <label htmlFor="customerName">Full name</label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              autoComplete="name"
              required
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label htmlFor="customerEmail">Email address</label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="customerPhone">Phone number</label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <label htmlFor="address">Street address</label>
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              required
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  required
                />
              </div>

              <div>
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  defaultValue="GA"
                  autoComplete="address-level1"
                  required
                />
              </div>

              <div>
                <label htmlFor="zipCode">ZIP code</label>
                <input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                />
              </div>
            </div>

            <hr style={{ margin: "28px 0" }} />

            <h2>Tow Vehicle</h2>

            <label htmlFor="towVehicle">
              Year, make, and model of tow vehicle
            </label>
            <input
              id="towVehicle"
              name="towVehicle"
              type="text"
              placeholder="Example: 2022 Ford F-250"
              required
            />

            <label htmlFor="towRatingLbs">
              Vehicle towing capacity in pounds
            </label>
            <input
              id="towRatingLbs"
              name="towRatingLbs"
              type="number"
              min="0"
              inputMode="numeric"
              required
            />

            <label htmlFor="intendedUse">
              What will you use the trailer for?
            </label>
            <textarea
              id="intendedUse"
              name="intendedUse"
              rows={4}
              required
            />

            <hr style={{ margin: "28px 0" }} />

            <h2>Emergency Contact</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <label htmlFor="emergencyContactName">Contact name</label>
                <input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  required
                />
              </div>

              <div>
                <label htmlFor="emergencyContactPhone">
                  Contact phone number
                </label>
                <input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  required
                />
              </div>
            </div>

            <label
              htmlFor="agreementAccepted"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 24,
              }}
            >
              <input
                id="agreementAccepted"
                name="agreementAccepted"
                type="checkbox"
                required
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 2,
                }}
              />

              <span>
                I certify that the information provided is accurate and
                understand that this is a rental request subject to owner
                approval.
              </span>
            </label>

            <button
              className="btn"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 22,
                width: "100%",
              }}
            >
              {submitting ? "Submitting Reservation…" : "Submit Reservation"}
            </button>

            {message && (
              <div className="notice" style={{ marginTop: 18 }}>
                {message}
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main>
          <section>
            <div className="container">
              <div className="notice">
                <h1>Loading reservation…</h1>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <BookingForm />
    </Suspense>
  );
}