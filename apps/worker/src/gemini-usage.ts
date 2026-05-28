import { prisma, ImportJobStatus } from "@recipe-planner/db";

export function getGeminiDailyLimit(): number {
  const n = parseInt(process.env.GEMINI_DAILY_LIMIT ?? "3", 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** UTC midnight for consistent daily reset across Railway regions. */
export function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export async function getGeminiUsageToday(): Promise<number> {
  return prisma.importJob.count({
    where: {
      usedGemini: true,
      status: ImportJobStatus.completed,
      completedAt: { gte: startOfUtcDay() },
    },
  });
}

export async function getGeminiUsageSummary(): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const limit = getGeminiDailyLimit();
  const used = await getGeminiUsageToday();
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export async function canUseGeminiToday(): Promise<boolean> {
  const { used, limit } = await getGeminiUsageSummary();
  return used < limit;
}
