import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { enqueueUrlImport } from "@/lib/import";
import { extractSocialReelUrls } from "@recipe-planner/shared";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const input = (body.urls ?? body.url ?? "") as string;
    const urls = extractSocialReelUrls(input);

    if (!urls.length) {
      return NextResponse.json(
        { error: "No valid Instagram or Facebook reel URLs found" },
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
