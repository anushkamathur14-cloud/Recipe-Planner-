import { NextResponse } from "next/server";
import {
  prisma,
  RecipeStatus,
  ImportJobStatus,
  ImportJobType,
} from "@recipe-planner/db";
import { requireUser } from "@/lib/session";

export async function POST(
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

    await prisma.recipe.update({
      where: { id },
      data: { status: RecipeStatus.pending, errorMessage: null },
    });

    const job = await prisma.importJob.create({
      data: {
        userId: user.id,
        recipeId: id,
        type:
          recipe.sourceType === "youtube"
            ? ImportJobType.youtube_url
            : ImportJobType.instagram_url,
        sourceUrl: recipe.sourceUrl,
        status: ImportJobStatus.queued,
      },
    });

    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Retry failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
