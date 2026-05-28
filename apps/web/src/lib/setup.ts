import { prisma } from "@recipe-planner/db";

export { getAuthSecret } from "./auth-secret";

export function getSetupIssues(): string[] {
  const issues: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) {
    issues.push("DATABASE_URL is not set on the web service.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.NEXTAUTH_SECRET?.trim()
  ) {
    issues.push(
      "NEXTAUTH_SECRET is not set (using a derived secret from AUTH_PASSWORD until you add one).",
    );
  }
  if (!process.env.NEXTAUTH_URL?.trim()) {
    issues.push(
      "NEXTAUTH_URL should be your public URL, e.g. https://recipe-plannerweb-production.up.railway.app",
    );
  }
  return issues;
}

export async function checkDatabase(): Promise<{
  ok: boolean;
  message?: string;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("does not exist") ||
      msg.includes("P2021") ||
      msg.includes("relation")
    ) {
      return {
        ok: false,
        message:
          "Database is connected but tables are missing. Run: npm run db:push (with Railway DATABASE_URL).",
      };
    }
    return {
      ok: false,
      message: `Database error: ${msg}`,
    };
  }
}
