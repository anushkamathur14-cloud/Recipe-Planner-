import { prisma, RecipeStatus, ImportJobStatus } from "@recipe-planner/db";
import type { ExtractedRecipe } from "@recipe-planner/shared";
import { downloadAudio, cleanupPath } from "./download";
import {
  transcribeAudio,
  extractRecipeFromTranscript,
} from "./openai";
import { tryYouTubeCaptions } from "./youtube-transcript";
import {
  extractRecipeFromYouTubeWithGemini,
  hasGeminiApiKey,
} from "./gemini-youtube";
import { formatImportError } from "./import-errors";

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

  if (job.type === "youtube_url") {
    await processYouTubeJob(jobId, job.sourceUrl, job.recipeId);
    return;
  }

  let audioPath: string | null = null;

  try {
    await updateProgress(jobId, "Downloading audio");
    audioPath = await downloadAudio(job.sourceUrl);

    await updateProgress(jobId, "Transcribing with Whisper");
    const transcript = await transcribeAudio(audioPath);

    await updateProgress(jobId, "Extracting recipe");
    const extracted = await extractRecipeFromTranscript(
      transcript,
      job.sourceUrl
    );

    await saveRecipeResult(job.recipeId, extracted, transcript);
    await completeJob(jobId);
  } catch (err) {
    const message = formatImportError(err, {
      geminiConfigured: hasGeminiApiKey(),
    });
    await failJob(jobId, job.recipeId, message);
  } finally {
    if (audioPath) await cleanupPath(audioPath);
  }
}

async function processYouTubeJob(
  jobId: string,
  sourceUrl: string,
  recipeId: string | null
) {
  const geminiOn = hasGeminiApiKey();
  let geminiError: string | null = null;

  if (geminiOn) {
    try {
      await processYouTubeWithGemini(jobId, sourceUrl, recipeId);
      return;
    } catch (err) {
      geminiError =
        err instanceof Error ? err.message : String(err);
      console.warn(`Gemini failed for ${sourceUrl}:`, geminiError);
      await updateProgress(jobId, "Gemini failed — trying captions");
    }
  }

  try {
    await updateProgress(jobId, "Checking YouTube captions");
    const transcript = await tryYouTubeCaptions(sourceUrl);

    if (transcript) {
      await updateProgress(jobId, "Extracting recipe from captions");
      const extracted = await extractRecipeFromTranscript(
        transcript,
        sourceUrl
      );
      await saveRecipeResult(recipeId, extracted, transcript);
      await completeJob(jobId);
      return;
    }

    if (geminiOn) {
      await failJob(
        jobId,
        recipeId,
        geminiError
          ? `${geminiError} Captions were not available for this video.`
          : formatImportError(new Error("Captions not available"), {
              geminiConfigured: true,
            })
      );
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      await failJob(
        jobId,
        recipeId,
        "Set GEMINI_API_KEY (recommended) or OPENAI_API_KEY on the worker."
      );
      return;
    }

    let audioPath: string | null = null;
    try {
      await updateProgress(jobId, "Downloading audio (yt-dlp)");
      audioPath = await downloadAudio(sourceUrl);
      await updateProgress(jobId, "Transcribing with Whisper");
      const whisperTranscript = await transcribeAudio(audioPath);
      await updateProgress(jobId, "Extracting recipe");
      const extracted = await extractRecipeFromTranscript(
        whisperTranscript,
        sourceUrl
      );
      await saveRecipeResult(recipeId, extracted, whisperTranscript);
      await completeJob(jobId);
    } finally {
      if (audioPath) await cleanupPath(audioPath);
    }
  } catch (err) {
    await failJob(
      jobId,
      recipeId,
      formatImportError(err, { geminiConfigured: geminiOn })
    );
  }
}

async function processYouTubeWithGemini(
  jobId: string,
  sourceUrl: string,
  recipeId: string | null
) {
  await updateProgress(jobId, "Analyzing video with Gemini");
  const { extracted, transcript } =
    await extractRecipeFromYouTubeWithGemini(sourceUrl);
  await saveRecipeResult(recipeId, extracted, transcript);
  await completeJob(jobId);
}

async function saveRecipeResult(
  recipeId: string | null,
  extracted: ExtractedRecipe,
  transcript: string
) {
  if (!recipeId) return;

  await prisma.recipe.update({
    where: { id: recipeId },
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

async function completeJob(jobId: string) {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: ImportJobStatus.completed,
      progress: "Done",
      completedAt: new Date(),
    },
  });
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
