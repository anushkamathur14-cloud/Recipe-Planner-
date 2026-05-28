import {
  prisma,
  SourceType,
  RecipeStatus,
  ImportJobType,
  ImportJobStatus,
} from "@recipe-planner/db";
import { normalizeSourceUrl, resolveSourceType } from "@recipe-planner/shared";
import { getSharedOwnerUserId } from "./shared-user";

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
