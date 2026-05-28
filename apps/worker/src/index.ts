import http from "http";
import { prisma, ImportJobStatus } from "@recipe-planner/db";
import { processImportJob } from "./process-job";

const POLL_MS = parseInt(process.env.WORKER_POLL_MS ?? "3000", 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

let active = 0;
let ready = false;

function healthPayload() {
  return {
    ok: true,
    service: "recipe-planner-worker",
    activeJobs: active,
    ready,
    hasDatabase: Boolean(process.env.DATABASE_URL),
    hasOpenAi: Boolean(process.env.OPENAI_API_KEY),
  };
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
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(healthPayload()));
        return;
      }
      res.writeHead(404);
      res.end();
    })
    .listen(port, "0.0.0.0", () => {
      console.log(`Health server listening on 0.0.0.0:${port}`);
    });
}

// Start health server immediately so Railway healthchecks pass during boot
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
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required — worker idle until set");
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("Database connection failed:", err);
    return;
  }

  ready = true;
  console.log("Recipe Planner worker started");
  setInterval(() => {
    poll().catch((e) => console.error("Poll error:", e));
  }, POLL_MS);
  await poll();
}

main().catch((e) => {
  console.error(e);
});
