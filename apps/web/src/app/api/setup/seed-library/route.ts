import { NextResponse } from "next/server";
import { getAdminCredentials } from "@/lib/admin";
import { getSharedOwnerUserId } from "@/lib/shared-user";
import { queueSeedLibrary } from "@/lib/seed-library";

export const dynamic = "force-dynamic";

/** Queue starter recipes. POST with header x-setup-secret: AUTH_PASSWORD */
export async function POST(req: Request) {
  const secret = req.headers.get("x-setup-secret")?.trim();
  const { password } = getAdminCredentials();

  if (!secret || secret !== password) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUserId = await getSharedOwnerUserId();
    const summary = await queueSeedLibrary(adminUserId);
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seed import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
