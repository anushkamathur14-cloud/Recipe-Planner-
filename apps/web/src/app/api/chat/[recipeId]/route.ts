import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";
import { parseIngredients, parseSteps } from "@recipe-planner/shared";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

function buildRecipeContext(recipe: {
  name: string;
  servings: number;
  ingredients: unknown;
  steps: unknown;
  transcript: string | null;
  sourceUrl: string;
}): string {
  const ingredients = parseIngredients(recipe.ingredients);
  const steps = parseSteps(recipe.steps);
  return JSON.stringify(
    {
      name: recipe.name,
      servings: recipe.servings,
      sourceUrl: recipe.sourceUrl,
      ingredients,
      steps,
      transcriptExcerpt: recipe.transcript?.slice(0, 4000) ?? null,
    },
    null,
    2
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const user = await requireUser();
    const { recipeId } = await params;

    const messages = await prisma.recipeChatMessage.findMany({
      where: { recipeId, userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json(messages);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const user = await requireUser();
    const { recipeId } = await params;
    const { question } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId: user.id },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.recipeChatMessage.create({
      data: {
        userId: user.id,
        recipeId,
        role: "user",
        content: question.trim(),
      },
    });

    const history = await prisma.recipeChatMessage.findMany({
      where: { recipeId, userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const context = buildRecipeContext(recipe);
    const chatHistory = history
      .filter(
        (m: { role: string }) => m.role === "user" || m.role === "assistant"
      )
      .slice(0, -1)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful cooking assistant. Answer only based on the recipe data provided. If unsure, say so. Suggest substitutions with quantities when asked.

Recipe data:
${context}`,
        },
        ...chatHistory,
        { role: "user", content: question.trim() },
      ],
    });

    const answer =
      response.choices[0]?.message?.content ??
      "I could not generate a response.";

    await prisma.recipeChatMessage.create({
      data: {
        userId: user.id,
        recipeId,
        role: "assistant",
        content: answer,
      },
    });

    return NextResponse.json({ answer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
