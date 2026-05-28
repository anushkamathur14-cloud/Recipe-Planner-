import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";
import { ingredientSchema, stepSchema } from "@recipe-planner/shared";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  servings: z.number().int().positive().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(stepSchema).optional(),
  status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const recipe = await prisma.recipe.findFirst({
      where: { id, userId: user.id },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const recipe = await prisma.recipe.updateMany({
      where: { id, userId: user.id },
      data: body,
    });

    if (recipe.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.recipe.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await prisma.recipe.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
