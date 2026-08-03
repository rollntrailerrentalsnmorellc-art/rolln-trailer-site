"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendOwnerLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/owner`,
      },
    });

    setMessage(
      error
        ? error.message
        : "Check your email for the secure owner sign-in link."
    );

    setSending(false);
  }

  return (
    <main>
      <section>
        <div className="container">
          <form className="form" onSubmit={sendOwnerLink}>
            <span className="eyebrow">Private owner access</span>

            <h1>Owner sign-in</h1>

            <p className="muted">
              Enter the authorized owner email address. We will send a secure
              sign-in link.
            </p>

            <label htmlFor="owner-email">Owner email address</label>

            <input
              id="owner-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />

            <button className="btn" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Email Secure Owner Link"}
            </button>

            {message && <p className="muted">{message}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}