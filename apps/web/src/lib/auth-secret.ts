import { createHash } from "crypto";

/** Must match authOptions.secret and any JWT verification. */
export function getAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET?.trim()) {
    return process.env.NEXTAUTH_SECRET.trim();
  }
  if (process.env.NODE_ENV !== "production") {
    return "dev-nextauth-secret";
  }
  const material =
    process.env.AUTH_PASSWORD ??
    process.env.DATABASE_URL ??
    "recipe-planner-fallback";
  return createHash("sha256").update(`nextauth:${material}`).digest("hex");
}

/** Only true when NEXTAUTH_URL is https — must match NextAuth + getToken secureCookie. */
export function useSecureAuthCookies(): boolean {
  return process.env.NEXTAUTH_URL?.startsWith("https://") === true;
}
