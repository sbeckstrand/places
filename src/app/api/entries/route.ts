import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entryInputSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasLocation = req.nextUrl.searchParams.get("hasLocation") === "true";

  const entries = await db.entry.findMany({
    where: {
      authorId: session.user.id,
      ...(hasLocation
        ? { latitude: { not: null }, longitude: { not: null } }
        : {}),
    },
    include: { photos: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { visitedAt: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = entryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { photos, ...entryData } = parsed.data;

  const entry = await db.entry.create({
    data: {
      ...entryData,
      authorId: session.user.id,
      photos: { create: photos },
    },
    include: { photos: true },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
