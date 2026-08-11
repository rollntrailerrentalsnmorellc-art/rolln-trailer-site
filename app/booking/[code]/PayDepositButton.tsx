"use client";

import { useState } from "react";

type PayDepositButtonProps = {
  bookingId: string;
};

export default function PayDepositButton({
  bookingId,
}: PayDepositButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start payment.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start payment."
      );
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        style={{
          width: "100%",
          background: "#7DFB00",
          color: "#111827",
          border: "none",
          borderRadius: 9,
          padding: "16px 20px",
          fontSize: 17,
          fontWeight: 800,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Opening Secure Checkout..." : "Pay $50 Deposit"}
      </button>

      {error && (
        <p
          style={{
            color: "#ff6b6b",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
