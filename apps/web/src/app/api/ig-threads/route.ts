import { NextResponse } from "next/server";
import { prisma } from "@recipe-planner/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const configSchema = z.object({
  threadFolderName: z.string().min(1),
  displayName: z.string().min(1),
  enabled: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await requireUser();
    const configs = await prisma.igThreadConfig.findMany({
      where: { userId: user.id },
      orderBy: { displayName: "asc" },
    });
    return NextResponse.json(configs);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = configSchema.parse(await req.json());

    const config = await prisma.igThreadConfig.upsert({
      where: {
        userId_threadFolderName: {
          userId: user.id,
          threadFolderName: body.threadFolderName,
        },
      },
      create: {
        userId: user.id,
        threadFolderName: body.threadFolderName,
        displayName: body.displayName,
        enabled: body.enabled,
      },
      update: {
        displayName: body.displayName,
        enabled: body.enabled,
      },
    });

    return NextResponse.json(config);
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.igThreadConfig.deleteMany({
      where: { id, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
