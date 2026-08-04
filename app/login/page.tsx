"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSigningIn(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setSigningIn(false);
      return;
    }

    router.push("/owner");
    router.refresh();
  }

  return (
    <main>
      <section>
        <div className="container">
          <form
            className="form"
            onSubmit={signIn}
            style={{
              width: "100%",
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            <span className="eyebrow">Private owner access</span>

            <h1>Owner sign-in</h1>

            <p className="muted">
              Sign in with your authorized owner email and password.
            </p>

            <label htmlFor="email">Email address</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />

            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />

            <button className="btn" type="submit" disabled={signingIn}>
              {signingIn ? "Signing In…" : "Sign In"}
            </button>

            {message && (
              <div className="notice" style={{ marginTop: 16 }}>
                {message}
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}