"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Availability({
  trailerId,
}: {
  trailerId: string;
}) {
  const router = useRouter();

  const [result, setResult] = useState("");
  const [checking, setChecking] = useState(false);

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setChecking(true);
    setResult("Checking...");

    const data = new FormData(event.currentTarget);

    const pickup = String(data.get("pickup"));
    const returnAt = String(data.get("returnAt"));

    const query = new URLSearchParams({
      trailerId,
      pickup,
      returnAt,
    });

    try {
      const response = await fetch(`/api/availability?${query.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        setResult(json.error || "Could not check dates.");
        setChecking(false);
        return;
      }

      if (!json.available) {
        setResult("Those dates are unavailable.");
        setChecking(false);
        return;
      }

      router.push(
        `/book?trailerId=${encodeURIComponent(
          trailerId
        )}&pickup=${encodeURIComponent(
          pickup
        )}&returnAt=${encodeURIComponent(returnAt)}`
      );
    } catch {
      setResult("Could not check dates. Please try again.");
      setChecking(false);
    }
  }

  return (
    <div className="availability">
      <h3>Check availability</h3>

      <form onSubmit={check}>
        <label htmlFor={`pickup-${trailerId}`}>Pickup date</label>
        <input
          id={`pickup-${trailerId}`}
          name="pickup"
          type="datetime-local"
          required
        />

        <label htmlFor={`return-${trailerId}`}>Return date</label>
        <input
          id={`return-${trailerId}`}
          name="returnAt"
          type="datetime-local"
          required
        />

        <button className="btn" type="submit" disabled={checking}>
          {checking ? "Checking..." : "Check Dates"}
        </button>
      </form>

      {result && (
        <div className="result" style={{ marginTop: 12 }}>
          {result}
        </div>
      )}
    </div>
  );
}
