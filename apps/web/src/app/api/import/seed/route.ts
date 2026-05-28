import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/admin";
import { enqueueUrlImport } from "@/lib/import";

type SeedEntry = { name: string; url: string };

async function loadSeedEntries(): Promise<SeedEntry[]> {
  const candidates = [
    path.join(process.cwd(), "data", "initial-recipes.json"),
    path.join(process.cwd(), "seeds", "initial-recipes.json"),
    path.join(process.cwd(), "..", "..", "seeds", "initial-recipes.json"),
  ];
  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as SeedEntry[];
    } catch {
      // try next path
    }
  }
  throw new Error("Seed file initial-recipes.json not found");
}

export async function POST() {
  try {
    const user = await requireAdmin();
    const entries = await loadSeedEntries();

    const results: {
      name: string;
      url: string;
      recipeId: string;
      skipped: boolean;
      error?: string;
    }[] = [];

    for (const entry of entries) {
      try {
        const result = await enqueueUrlImport(user.id, entry.url, {
          name: entry.name,
        });
        results.push({
          name: entry.name,
          url: entry.url,
          recipeId: result.recipeId,
          skipped: result.skipped,
        });
      } catch (err) {
        results.push({
          name: entry.name,
          url: entry.url,
          recipeId: "",
          skipped: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const queued = results.filter((r) => !r.skipped && !r.error).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => r.error).length;

    return NextResponse.json({
      total: entries.length,
      queued,
      skipped,
      failed,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seed import failed";
    const status =
      message === "Unauthorized" || message === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
