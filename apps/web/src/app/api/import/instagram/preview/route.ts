import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { requireAdmin } from "@/lib/admin";
import { parseConversationJson } from "@recipe-planner/shared";

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
    await requireAdmin();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ZIP file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const folders = listInboxFolders(zip);

    const threads = folders.map((folder) => {
      const json = findMessageJson(zip, folder);
      if (!json) {
        return {
          folderName: folder,
          displayName: folder.replace(/_/g, " "),
          messageCount: 0,
          urls: [] as string[],
        };
      }
      return parseConversationJson(folder, json);
    });

    return NextResponse.json({ threads });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
