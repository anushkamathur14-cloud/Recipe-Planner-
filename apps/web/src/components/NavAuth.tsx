"use client";

import { signOut } from "next-auth/react";

export function NavAuth({
  isAdmin,
  userName,
}: {
  isAdmin: boolean;
  userName?: string | null;
}) {
  if (!isAdmin) return null;

  return (
    <div className="nav-auth">
      <span className="admin-badge" title="Admin mode — import & transcribe enabled">
        Admin
      </span>
      {userName && <span className="nav-user muted">{userName}</span>}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </button>
    </div>
  );
}
