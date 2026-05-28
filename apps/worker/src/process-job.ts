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
import {
  canUseGeminiToday,
  getGeminiDailyLimit,
  getGeminiUsageSummary,
} from "./gemini-usage";
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

  try {
    await updateProgress(jobId, "Checking YouTube captions (free)");
    const captions = await tryYouTubeCaptions(sourceUrl);

    if (captions) {
      await updateProgress(jobId, "Extracting recipe from captions");
      const extracted = await extractRecipeFromTranscript(
        captions,
        sourceUrl
      );
      await saveRecipeResult(recipeId, extracted, captions);
      await completeJob(jobId);
      return;
    }

    if (geminiOn && (await canUseGeminiToday())) {
      try {
        await processYouTubeWithGemini(jobId, sourceUrl, recipeId);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Gemini failed for ${sourceUrl}:`, msg);
        await updateProgress(jobId, "Gemini failed — trying audio download");
      }
    } else if (geminiOn) {
      const { used, limit } = await getGeminiUsageSummary();
      await updateProgress(
        jobId,
        `Gemini daily limit reached (${used}/${limit}) — using audio download`
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      await failJob(
        jobId,
        recipeId,
        geminiOn
          ? `Daily Gemini limit (${getGeminiDailyLimit()}/day) may be reached and OPENAI_API_KEY is not set for audio fallback.`
          : "Set OPENAI_API_KEY on the worker for audio transcription."
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
  const { used, limit, remaining } = await getGeminiUsageSummary();
  await updateProgress(
    jobId,
    `Analyzing with Gemini (${used + 1}/${limit} today, ${Math.max(0, remaining - 1)} left after)`
  );
  const { extracted, transcript } =
    await extractRecipeFromYouTubeWithGemini(sourceUrl);
  await saveRecipeResult(recipeId, extracted, transcript);
  await completeJob(jobId, { usedGemini: true });
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

async function completeJob(
  jobId: string,
  opts?: { usedGemini?: boolean }
) {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: ImportJobStatus.completed,
      progress: opts?.usedGemini ? "Done (Gemini)" : "Done",
      completedAt: new Date(),
      usedGemini: opts?.usedGemini ?? false,
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
