import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const recipes = await prisma.recipe.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(recipes);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
