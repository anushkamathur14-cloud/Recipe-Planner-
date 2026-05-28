import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { join } from "path";
import { getAdminCredentials } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** One-time schema sync. POST with header x-setup-secret: AUTH_PASSWORD */
export async function POST(req: Request) {
  const secret = req.headers.get("x-setup-secret")?.trim();
  const { password } = getAdminCredentials();

  if (!secret || secret !== password) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set on this service" },
      { status: 503 },
    );
  }

  const schema = join(process.cwd(), "packages/db/prisma/schema.prisma");

  try {
    execSync(`npx prisma db push --schema="${schema}" --skip-generate`, {
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    return NextResponse.json({ ok: true, message: "Database schema applied." });
  } catch (err) {
    const message =
      err instanceof Error
        ? "stderr" in err
          ? String((err as { stderr?: string }).stderr ?? err.message)
          : err.message
        : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
