#!/usr/bin/env node
/**
 * Queue all URLs from seeds/initial-recipes.json (run from repo root).
 * Requires: DATABASE_URL, worker running to process jobs.
 *
 * Usage: node scripts/seed-recipes.mjs
 */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin-1@recipe-planner.admin";

function normalizeUrl(url) {
  const u = new URL(url.trim());
  u.search = "";
  u.hash = "";
  let s = u.toString();
  if (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

function sourceType(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  return null;
}

async function main() {
  const seedPath = path.join(__dirname, "../seeds/initial-recipes.json");
  const entries = JSON.parse(await readFile(seedPath, "utf8"));

  let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: ADMIN_EMAIL, name: "Admin-1" },
    });
    console.log("Created admin user:", user.id);
  }

  let queued = 0;
  let skipped = 0;

  for (const { name, url } of entries) {
    const normalized = normalizeUrl(url);
    const type = sourceType(normalized);
    if (!type) {
      console.warn("Skip unsupported URL:", url);
      continue;
    }

    const existing = await prisma.recipe.findUnique({
      where: {
        userId_sourceUrl: { userId: user.id, sourceUrl: normalized },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name,
        sourceUrl: normalized,
        sourceType: type,
        status: "pending",
      },
    });

    await prisma.importJob.create({
      data: {
        userId: user.id,
        recipeId: recipe.id,
        type: type === "youtube" ? "youtube_url" : "instagram_url",
        sourceUrl: normalized,
        status: "queued",
      },
    });
    queued++;
  }

  console.log(`Done. Queued: ${queued}, skipped (duplicates): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
