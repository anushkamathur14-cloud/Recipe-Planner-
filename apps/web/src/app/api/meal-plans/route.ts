import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { getSharedOwnerUserId } from "@/lib/shared-user";
import { parseWeekParam, formatWeekKey } from "@/lib/week";
import {
  aggregateIngredients,
  parseIngredients,
  formatShoppingLine,
} from "@recipe-planner/shared";

export async function GET(req: Request) {
  try {
    const ownerId = await getSharedOwnerUserId();
    const { searchParams } = new URL(req.url);
    const week = parseWeekParam(searchParams.get("week") ?? undefined);

    let plan = await prisma.mealPlan.findUnique({
      where: {
        userId_weekStartDate: { userId: ownerId, weekStartDate: week },
      },
      include: {
        slots: {
          include: { recipe: true },
          orderBy: [{ day: "asc" }, { mealType: "asc" }],
        },
      },
    });

    if (!plan) {
      plan = await prisma.mealPlan.create({
        data: { userId: ownerId, weekStartDate: week },
        include: {
          slots: { include: { recipe: true } },
        },
      });
    }

    const shoppingItems = plan.slots.map((slot) => ({
      ingredients: parseIngredients(slot.recipe.ingredients),
      multiplier: slot.servingsMultiplier,
    }));
    const shoppingList = aggregateIngredients(shoppingItems).map((line) => ({
      ...line,
      formatted: formatShoppingLine(line),
    }));

    return NextResponse.json({
      plan,
      week: formatWeekKey(week),
      shoppingList,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
