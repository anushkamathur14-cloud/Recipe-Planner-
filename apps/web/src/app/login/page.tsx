"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("Admin-1");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = params.get("callbackUrl") ?? "/";

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.role === "admin" &&
      callbackUrl.startsWith("/")
    ) {
      window.location.replace(callbackUrl);
    }
  }, [status, session, callbackUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const check = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });
    const checkData = await check.json();

    if (!checkData.ok) {
      setLoading(false);
      setError(checkData.message ?? "Sign in failed");
      return;
    }

    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setError(
        "Credentials OK but session failed. Set NEXTAUTH_URL to https://recipe-plannerweb-production.up.railway.app and NEXTAUTH_SECRET on the web service.",
      );
      return;
    }

    window.location.replace(callbackUrl.startsWith("/") ? callbackUrl : "/");
  }

  if (status === "loading") {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (status === "authenticated" && session?.user?.role === "admin") {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <p className="muted">Already signed in. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Admin sign in</h1>
      <p className="muted">
        Only admins can import and transcribe videos.
      </p>
      <form onSubmit={onSubmit} className="card">
        <label htmlFor="username">Name</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
