import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";
import { parseWeekParam } from "@/lib/week";
import { z } from "zod";

const slotSchema = z.object({
  week: z.string().optional(),
  recipeId: z.string(),
  day: z.number().int().min(0).max(6),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  servingsMultiplier: z.number().positive().default(1),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = slotSchema.parse(await req.json());
    const week = parseWeekParam(body.week);

    let plan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: { userId: user.id, weekStartDate: week },
      },
    });

    if (!plan) {
      plan = await prisma.mealPlan.create({
        data: { userId: user.id, weekStartDate: week },
      });
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: body.recipeId, userId: user.id },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const slot = await prisma.mealSlot.create({
      data: {
        mealPlanId: plan.id,
        recipeId: body.recipeId,
        day: body.day,
        mealType: body.mealType,
        servingsMultiplier: body.servingsMultiplier,
      },
      include: { recipe: true },
    });

    return NextResponse.json(slot);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");
    if (!slotId) {
      return NextResponse.json({ error: "slotId required" }, { status: 400 });
    }

    const slot = await prisma.mealSlot.findFirst({
      where: { id: slotId },
      include: { mealPlan: true },
    });

    if (!slot || slot.mealPlan.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.mealSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { slotId, servingsMultiplier } = body;

    const slot = await prisma.mealSlot.findFirst({
      where: { id: slotId },
      include: { mealPlan: true },
    });

    if (!slot || slot.mealPlan.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.mealSlot.update({
      where: { id: slotId },
      data: { servingsMultiplier },
      include: { recipe: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
