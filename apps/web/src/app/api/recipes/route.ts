import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const recipes = await prisma.recipe.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(recipes);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
