import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { requireAdmin } from "@/lib/admin";
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
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const recipe = await prisma.recipe.updateMany({
      where: { id },
      data: body,
    });

    if (recipe.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.recipe.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    const status =
      message === "Unauthorized" || message === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.recipe.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    const status =
      message === "Unauthorized" || message === "Admin access required"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
