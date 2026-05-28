import {
  prisma,
  SourceType,
  RecipeStatus,
  ImportJobType,
  ImportJobStatus,
} from "@recipe-planner/db";
import {
  isInstagramUrl,
  isYouTubeUrl,
  normalizeSourceUrl,
} from "@recipe-planner/shared";

export async function enqueueUrlImport(
  userId: string,
  url: string,
  options?: { name?: string }
): Promise<{ recipeId: string; jobId: string; skipped: boolean }> {
  const normalizedUrl = normalizeSourceUrl(url);
  const sourceType = isYouTubeUrl(normalizedUrl)
    ? SourceType.youtube
    : isInstagramUrl(normalizedUrl)
      ? SourceType.instagram
      : null;

  if (!sourceType) {
    throw new Error("URL must be a YouTube or Instagram link");
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
      userId,
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
