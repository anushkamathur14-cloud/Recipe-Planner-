import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { prisma, ImportJobStatus, ImportJobType } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";
import { enqueueUrlImport } from "@/lib/import";
import {
  parseConversationJson,
  filterThreadsByConfig,
  type IgThreadSummary,
} from "@recipe-planner/shared";

function findMessageJson(zip: AdmZip, folderName: string): unknown | null {
  const prefix = `your_instagram_activity/messages/inbox/${folderName}/`;
  for (const entry of zip.getEntries()) {
    if (
      entry.entryName.startsWith(prefix) &&
      entry.entryName.endsWith(".json") &&
      entry.entryName.includes("message")
    ) {
      return JSON.parse(entry.getData().toString("utf8"));
    }
  }
  return null;
}

function listInboxFolders(zip: AdmZip): string[] {
  const folders = new Set<string>();
  const re = /your_instagram_activity\/messages\/inbox\/([^/]+)\//;
  for (const entry of zip.getEntries()) {
    const m = entry.entryName.match(re);
    if (m) folders.add(m[1]);
  }
  return [...folders].sort();
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const selectedRaw = form.get("threads") as string | null;

    if (!file) {
      return NextResponse.json({ error: "ZIP file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const folders = listInboxFolders(zip);

    const configs = await prisma.igThreadConfig.findMany({
      where: { userId: user.id, enabled: true },
    });
    const enabledFolders = new Set(configs.map((c) => c.threadFolderName));

    const selectedFolders = selectedRaw
      ? (JSON.parse(selectedRaw) as string[])
      : folders;

    const threads: IgThreadSummary[] = [];
    for (const folder of folders) {
      if (!selectedFolders.includes(folder)) continue;
      const json = findMessageJson(zip, folder);
      if (!json) continue;
      threads.push(parseConversationJson(folder, json));
    }

    const filtered = filterThreadsByConfig(threads, enabledFolders);
    const allUrls = new Set<string>();
    for (const t of filtered) {
      for (const u of t.urls) allUrls.add(u);
    }

    await prisma.importJob.create({
      data: {
        userId: user.id,
        type: ImportJobType.instagram_export,
        status: ImportJobStatus.completed,
        payload: {
          threadCount: filtered.length,
          urlCount: allUrls.size,
          threads: filtered.map((t) => ({
            folder: t.folderName,
            displayName: t.displayName,
            urlCount: t.urls.length,
          })),
        },
        progress: "Parsed export",
        completedAt: new Date(),
      },
    });

    const results = [];
    for (const url of allUrls) {
      try {
        const result = await enqueueUrlImport(user.id, url);
        results.push({ url, ...result });
      } catch {
        results.push({ url, skipped: true, recipeId: "", jobId: "" });
      }
    }

    return NextResponse.json({
      threads: filtered,
      enqueued: results.filter((r) => !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export parse failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({
    hint: "POST multipart form with file=ZIP and optional threads JSON array",
  });
}
