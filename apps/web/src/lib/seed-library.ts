import { readFile } from "fs/promises";
import { join } from "path";
import { findMonorepoRoot } from "./monorepo-root";
import { getSharedOwnerUserId } from "./shared-user";
import { enqueueUrlImport } from "./import";

type SeedEntry = { name: string; url: string };

export async function loadSeedEntries(): Promise<SeedEntry[]> {
  const root = findMonorepoRoot();
  const filePath = join(root, "seeds", "initial-recipes.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SeedEntry[];
}

export async function queueSeedLibrary(adminUserId: string) {
  const entries = await loadSeedEntries();
  const ownerId = await getSharedOwnerUserId();
  void ownerId;

  const results: {
    name: string;
    url: string;
    recipeId: string;
    skipped: boolean;
    error?: string;
  }[] = [];

  for (const entry of entries) {
    try {
      const result = await enqueueUrlImport(adminUserId, entry.url, {
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

  return {
    total: entries.length,
    queued: results.filter((r) => !r.skipped && !r.error).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}
