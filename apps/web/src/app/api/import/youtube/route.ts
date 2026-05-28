import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { enqueueUrlImport } from "@/lib/import";
import { normalizeYouTubeUrls } from "@recipe-planner/shared";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const urls = normalizeYouTubeUrls(body.urls ?? "");

    if (!urls.length) {
      return NextResponse.json(
        { error: "No valid YouTube URLs found" },
        { status: 400 }
      );
    }

    const results = [];
    for (const url of urls) {
      const result = await enqueueUrlImport(user.id, url);
      results.push({ url, ...result });
    }

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
