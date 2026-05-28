import { prisma, RecipeStatus, ImportJobStatus } from "@recipe-planner/db";
import { downloadAudio, cleanupPath } from "./download";
import {
  transcribeAudio,
  extractRecipeFromTranscript,
} from "./openai";
import { tryYouTubeCaptions } from "./youtube-transcript";

export async function processImportJob(jobId: string): Promise<void> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { recipe: true },
  });

  if (!job || job.status !== ImportJobStatus.queued) return;
  if (!job.sourceUrl) {
    await failJob(jobId, job.recipeId, "Missing source URL");
    return;
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: ImportJobStatus.processing,
      startedAt: new Date(),
      progress: "Starting",
    },
  });

  if (job.recipeId) {
    await prisma.recipe.update({
      where: { id: job.recipeId },
      data: { status: RecipeStatus.processing },
    });
  }

  let audioPath: string | null = null;

  try {
    let transcript: string | null = null;

    if (job.type === "youtube_url") {
      await updateProgress(jobId, "Checking YouTube captions");
      transcript = await tryYouTubeCaptions(job.sourceUrl);
    }

    if (!transcript) {
      await updateProgress(jobId, "Downloading audio");
      audioPath = await downloadAudio(job.sourceUrl);

      await updateProgress(jobId, "Transcribing with Whisper");
      transcript = await transcribeAudio(audioPath);
    }

    await updateProgress(jobId, "Extracting recipe");
    const extracted = await extractRecipeFromTranscript(
      transcript,
      job.sourceUrl
    );

    if (job.recipeId) {
      await prisma.recipe.update({
        where: { id: job.recipeId },
        data: {
          name: extracted.name,
          servings: extracted.servings,
          ingredients: extracted.ingredients,
          steps: extracted.steps,
          transcript,
          rawExtraction: extracted,
          confidence: extracted.confidence,
          status: RecipeStatus.ready,
          errorMessage: null,
        },
      });
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.completed,
        progress: "Done",
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(jobId, job.recipeId, message);
  } finally {
    if (audioPath) await cleanupPath(audioPath);
  }
}

async function updateProgress(jobId: string, progress: string) {
  await prisma.importJob.update({
    where: { id: jobId },
    data: { progress },
  });
}

async function failJob(
  jobId: string,
  recipeId: string | null,
  message: string
) {
  if (recipeId) {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { status: RecipeStatus.failed, errorMessage: message },
    });
  }
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: ImportJobStatus.failed,
      errorMessage: message,
      progress: "Failed",
      completedAt: new Date(),
    },
  });
}
