import { NextResponse } from "next/server";
import {
  prisma,
  RecipeStatus,
  ImportJobStatus,
  ImportJobType,
} from "@recipe-planner/db";
import { requireAdmin } from "@/lib/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
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

    let payload: object | undefined;
    if (recipe.sourceType === "image") {
      const lastImageJob = await prisma.importJob.findFirst({
        where: { recipeId: id, type: ImportJobType.image_upload },
        orderBy: { createdAt: "desc" },
      });
      if (!lastImageJob?.payload) {
        return NextResponse.json(
          {
            error:
              "Re-upload the screenshot from Import → Web / Screenshot to retry this recipe.",
          },
          { status: 400 }
        );
      }
      payload = lastImageJob.payload as object;
    }

    const jobType =
      recipe.sourceType === "youtube"
        ? ImportJobType.youtube_url
        : recipe.sourceType === "website"
          ? ImportJobType.website_url
          : recipe.sourceType === "image"
            ? ImportJobType.image_upload
            : ImportJobType.instagram_url;

    const job = await prisma.importJob.create({
      data: {
        userId: user.id,
        recipeId: id,
        type: jobType,
        sourceUrl: recipe.sourceUrl,
        payload,
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
