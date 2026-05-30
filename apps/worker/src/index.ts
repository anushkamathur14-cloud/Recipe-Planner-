import http from "http";
import { prisma, ImportJobStatus } from "@recipe-planner/db";
import { processImportJob } from "./process-job";
import { hasGeminiApiKey } from "./gemini-youtube";
import { getGeminiDailyLimit, getGeminiUsageSummary } from "./gemini-usage";

const POLL_MS = parseInt(process.env.WORKER_POLL_MS ?? "3000", 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

let active = 0;
let ready = false;

async function healthPayload() {
  const base = {
    ok: true,
    service: "recipe-planner-worker",
    activeJobs: active,
    ready,
    hasDatabase: Boolean(process.env.DATABASE_URL),
    hasOpenAi: Boolean(process.env.OPENAI_API_KEY),
    hasGemini: hasGeminiApiKey(),
    youtubeProcessor: hasGeminiApiKey() ? "gemini-capped" : "openai",
    geminiDailyLimit: getGeminiDailyLimit(),
    maxVideoDurationSec: process.env.MAX_VIDEO_DURATION_SEC ?? "1200",
    geminiMaxVideoSec: process.env.GEMINI_MAX_VIDEO_SEC ?? "600",
  };

  if (!ready || !process.env.DATABASE_URL || !hasGeminiApiKey()) {
    return base;
  }

  try {
    const gemini = await getGeminiUsageSummary();
    return { ...base, gemini };
  } catch {
    return base;
  }
}

function startHealthServer() {
  const port = parseInt(process.env.PORT ?? "8080", 10);
  http
    .createServer((req, res) => {
      const path = req.url?.split("?")[0];
      if (
        path === "/health" ||
        path === "/api/health" ||
        path === "/"
      ) {
        healthPayload()
          .then((payload) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(payload));
          })
          .catch(() => {
            res.writeHead(500);
            res.end();
          });
        return;
      }
      res.writeHead(404);
      res.end();
    })
    .listen(port, "0.0.0.0", () => {
      console.log(`Health server listening on 0.0.0.0:${port}`);
    });
}

startHealthServer();

async function poll() {
  if (!ready || active >= CONCURRENCY) return;

  const job = await prisma.importJob.findFirst({
    where: { status: ImportJobStatus.queued },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return;

  active++;
  try {
    await processImportJob(job.id);
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err);
  } finally {
    active--;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required — worker idle until set");
    return;
  }

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  if (!hasOpenAi && !hasGeminiApiKey()) {
    console.error(
      "OPENAI_API_KEY or GEMINI_API_KEY is required — worker idle until set"
    );
    return;
  }

  if (!hasOpenAi) {
    console.warn(
      "OPENAI_API_KEY not set — Instagram/Facebook, website imports, screenshot fallback, and audio fallback will not work"
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("Database connection failed:", err);
    return;
  }

  ready = true;
  const geminiInfo = hasGeminiApiKey()
    ? await getGeminiUsageSummary()
    : null;
  console.log(
    `Recipe Planner worker started` +
      (geminiInfo
        ? ` — Gemini ${geminiInfo.used}/${geminiInfo.limit} used today (UTC)`
        : "")
  );
  setInterval(() => {
    poll().catch((e) => console.error("Poll error:", e));
  }, POLL_MS);
  await poll();
}

main().catch((e) => {
  console.error(e);
});
