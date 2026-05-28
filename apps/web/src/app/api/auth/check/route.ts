import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { adminEmailForUsername, getAdminCredentials } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({
        ok: false,
        message:
          "Server misconfigured: NEXTAUTH_SECRET is missing on Railway (web service).",
      });
    }

    const { username, password } = await req.json();
    const { username: allowedUsername, password: allowedPassword } =
      getAdminCredentials();

    if (username?.trim() !== allowedUsername || password !== allowedPassword) {
      return NextResponse.json({
        ok: false,
        message: `Invalid name or password. Use ${allowedUsername} / ${allowedPassword}.`,
      });
    }

    await prisma.$queryRaw`SELECT 1`;

    const email = adminEmailForUsername(allowedUsername);
    await prisma.user.upsert({
      where: { email },
      create: { email, name: allowedUsername },
      update: { name: allowedUsername },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/check]", err);
    return NextResponse.json({
      ok: false,
      message:
        "Database connection failed. Link Postgres DATABASE_URL on the web service and run migrations.",
    });
  }
}
