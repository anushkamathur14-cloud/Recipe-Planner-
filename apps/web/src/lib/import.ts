import {
  prisma,
  SourceType,
  RecipeStatus,
  ImportJobType,
  ImportJobStatus,
} from "@recipe-planner/db";
import { isInstagramUrl, isYouTubeUrl } from "@recipe-planner/shared";

export async function enqueueUrlImport(
  userId: string,
  url: string
): Promise<{ recipeId: string; jobId: string; skipped: boolean }> {
  const sourceType = isYouTubeUrl(url)
    ? SourceType.youtube
    : isInstagramUrl(url)
      ? SourceType.instagram
      : null;

  if (!sourceType) {
    throw new Error("URL must be a YouTube or Instagram link");
  }

  const existing = await prisma.recipe.findUnique({
    where: { userId_sourceUrl: { userId, sourceUrl: url } },
  });

  if (existing) {
    return { recipeId: existing.id, jobId: "", skipped: true };
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      sourceUrl: url,
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
      sourceUrl: url,
      status: ImportJobStatus.queued,
    },
  });

  return { recipeId: recipe.id, jobId: job.id, skipped: false };
}
