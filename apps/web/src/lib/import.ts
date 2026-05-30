import {
  prisma,
  SourceType,
  RecipeStatus,
  ImportJobType,
  ImportJobStatus,
} from "@recipe-planner/db";
import { createHash } from "crypto";
import {
  normalizeSourceUrl,
  resolveSourceType,
  type ImageImportPayload,
} from "@recipe-planner/shared";
import { getSharedOwnerUserId } from "./shared-user";

export const MAX_IMAGE_IMPORT_BYTES = 8 * 1024 * 1024;

export async function enqueueUrlImport(
  adminUserId: string,
  url: string,
  options?: { name?: string }
): Promise<{ recipeId: string; jobId: string; skipped: boolean }> {
  const userId = await getSharedOwnerUserId();
  void adminUserId;
  const normalizedUrl = normalizeSourceUrl(url);
  const kind = resolveSourceType(normalizedUrl);
  const sourceType =
    kind === "youtube"
      ? SourceType.youtube
      : kind === "instagram"
        ? SourceType.instagram
        : kind === "facebook"
          ? SourceType.facebook
          : null;

  if (!sourceType) {
    throw new Error(
      "URL must be a YouTube, Instagram, or Facebook reel/post link"
    );
  }

  const existing = await prisma.recipe.findUnique({
    where: { userId_sourceUrl: { userId, sourceUrl: normalizedUrl } },
  });

  if (existing) {
    return { recipeId: existing.id, jobId: "", skipped: true };
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: options?.name ?? "Untitled Recipe",
      sourceUrl: normalizedUrl,
      sourceType,
      status: RecipeStatus.pending,
    },
  });

  const job = await prisma.importJob.create({
    data: {
      userId: adminUserId,
      recipeId: recipe.id,
      type:
        sourceType === SourceType.youtube
          ? ImportJobType.youtube_url
          : ImportJobType.instagram_url,
      sourceUrl: normalizedUrl,
      status: ImportJobStatus.queued,
    },
  });

  return { recipeId: recipe.id, jobId: job.id, skipped: false };
}

export async function enqueueWebsiteImport(
  adminUserId: string,
  url: string,
  options?: { name?: string }
): Promise<{ recipeId: string; jobId: string; skipped: boolean }> {
  const userId = await getSharedOwnerUserId();
  void adminUserId;
  const normalizedUrl = normalizeSourceUrl(url);

  const existing = await prisma.recipe.findUnique({
    where: { userId_sourceUrl: { userId, sourceUrl: normalizedUrl } },
  });

  if (existing) {
    return { recipeId: existing.id, jobId: "", skipped: true };
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: options?.name ?? "Untitled Recipe",
      sourceUrl: normalizedUrl,
      sourceType: SourceType.website,
      status: RecipeStatus.pending,
    },
  });

  const job = await prisma.importJob.create({
    data: {
      userId: adminUserId,
      recipeId: recipe.id,
      type: ImportJobType.website_url,
      sourceUrl: normalizedUrl,
      status: ImportJobStatus.queued,
    },
  });

  return { recipeId: recipe.id, jobId: job.id, skipped: false };
}

export async function enqueueImageImport(
  adminUserId: string,
  payload: ImageImportPayload,
  options?: { name?: string }
): Promise<{ recipeId: string; jobId: string; skipped: boolean }> {
  const userId = await getSharedOwnerUserId();
  void adminUserId;

  const hash = createHash("sha256")
    .update(payload.dataBase64)
    .digest("hex");
  const sourceUrl = `image://${hash}`;

  const existing = await prisma.recipe.findUnique({
    where: { userId_sourceUrl: { userId, sourceUrl } },
  });

  if (existing) {
    return { recipeId: existing.id, jobId: "", skipped: true };
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: options?.name ?? payload.fileName ?? "Screenshot recipe",
      sourceUrl,
      sourceType: SourceType.image,
      status: RecipeStatus.pending,
    },
  });

  const job = await prisma.importJob.create({
    data: {
      userId: adminUserId,
      recipeId: recipe.id,
      type: ImportJobType.image_upload,
      sourceUrl,
      payload,
      status: ImportJobStatus.queued,
    },
  });

  return { recipeId: recipe.id, jobId: job.id, skipped: false };
}
