"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(params.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>
      <p className="muted">Use the credentials configured in your environment.</p>
      <form onSubmit={onSubmit} className="card">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted">
        Google sign-in is available when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
        are set.
      </p>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      >
        Sign in with Google
      </button>
    </div>
  );
}
