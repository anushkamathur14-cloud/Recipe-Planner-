import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { enqueueImageImport, MAX_IMAGE_IMPORT_BYTES } from "@/lib/import";
import type { ImageImportPayload } from "@recipe-planner/shared";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "Upload at least one image (JPEG, PNG, WebP, or GIF)" },
        { status: 400 }
      );
    }

    const results: {
      fileName: string;
      recipeId: string;
      jobId: string;
      skipped: boolean;
    }[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported type for ${file.name}: ${file.type || "unknown"}. Use JPEG, PNG, WebP, or GIF.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_IMAGE_IMPORT_BYTES) {
        return NextResponse.json(
          {
            error: `${file.name} is too large (max ${MAX_IMAGE_IMPORT_BYTES / (1024 * 1024)} MB)`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const payload: ImageImportPayload = {
        mimeType: file.type,
        dataBase64: buffer.toString("base64"),
        fileName: file.name,
      };

      const result = await enqueueImageImport(user.id, payload);
      results.push({ fileName: file.name, ...result });
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
