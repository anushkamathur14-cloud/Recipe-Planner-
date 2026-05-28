import { NextResponse } from "next/server";
import { prisma, ImportJobStatus } from "@recipe-planner/db";

export const dynamic = "force-dynamic";

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export async function GET() {
  const limit = parseInt(process.env.GEMINI_DAILY_LIMIT ?? "3", 10);
  const dailyLimit = Number.isFinite(limit) && limit > 0 ? limit : 3;

  const used = await prisma.importJob.count({
    where: {
      usedGemini: true,
      status: ImportJobStatus.completed,
      completedAt: { gte: startOfUtcDay() },
    },
  });

  return NextResponse.json({
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    resetsAtUtc: "midnight UTC",
    tips: [
      "YouTube captions are used first (no Gemini cost).",
      "Gemini only runs when captions are missing and daily quota remains.",
      "Set GEMINI_DAILY_LIMIT on the worker to change the cap.",
    ],
  });
}
