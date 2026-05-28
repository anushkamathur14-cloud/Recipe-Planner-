import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { queueSeedLibrary } from "@/lib/seed-library";

export async function POST() {
  try {
    const user = await requireAdmin();
    const summary = await queueSeedLibrary(user.id);
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seed import failed";
    const status =
      message === "Unauthorized" || message === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
