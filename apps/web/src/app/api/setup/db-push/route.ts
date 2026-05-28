import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { getAdminCredentials } from "@/lib/admin";
import { findMonorepoRoot } from "@/lib/monorepo-root";

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

  let root: string;
  try {
    root = findMonorepoRoot();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  try {
    execSync("npm run push --workspace=@recipe-planner/db", {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    return NextResponse.json({
      ok: true,
      message: "Database schema applied.",
      root,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? "stderr" in err
          ? String((err as { stderr?: string }).stderr ?? err.message)
          : err.message
        : String(err);
    return NextResponse.json({ error: message, root }, { status: 500 });
  }
}
