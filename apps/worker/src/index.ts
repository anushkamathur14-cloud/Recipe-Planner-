import http from "http";
import { prisma, ImportJobStatus } from "@recipe-planner/db";
import { processImportJob } from "./process-job";

const POLL_MS = parseInt(process.env.WORKER_POLL_MS ?? "3000", 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

let active = 0;

function startHealthServer() {
  const port = parseInt(process.env.PORT ?? "8080", 10);
  http
    .createServer((req, res) => {
      const path = req.url?.split("?")[0];
      if (path === "/health" || path === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            service: "recipe-planner-worker",
            activeJobs: active,
          })
        );
        return;
      }
      res.writeHead(404);
      res.end();
    })
    .listen(port, "0.0.0.0", () => {
      console.log(`Health server listening on 0.0.0.0:${port}`);
    });
}

async function poll() {
  if (active >= CONCURRENCY) return;

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
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }

  startHealthServer();

  console.log("Recipe Planner worker started");
  setInterval(() => {
    poll().catch((e) => console.error("Poll error:", e));
  }, POLL_MS);
  await poll();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
