import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { enqueueWebsiteImport } from "@/lib/import";
import { normalizeWebsiteUrls } from "@recipe-planner/shared";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const urls = normalizeWebsiteUrls(body.urls ?? "");

    if (!urls.length) {
      return NextResponse.json(
        {
          error:
            "No valid website URLs found. Use http(s) links to recipe blogs (not YouTube, Instagram, or Facebook).",
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const url of urls) {
      const result = await enqueueWebsiteImport(user.id, url);
      results.push({ url, ...result });
    }

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const status =
      message === "Unauthorized" || message === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
