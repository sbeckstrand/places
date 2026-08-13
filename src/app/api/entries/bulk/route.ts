import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage";
import { Category } from "@/generated/prisma/enums";

const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    action: z.literal("setCategory"),
    ids: z.array(z.string().min(1)).min(1),
    category: z.enum(Category),
  }),
  z.object({
    action: z.literal("setPublic"),
    ids: z.array(z.string().min(1)).min(1),
    isPublic: z.boolean(),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Scoping every query by authorId (not just id) means a tampered id list
  // can only ever touch the caller's own entries — no ownership pre-check
  // needed, ids for other users' entries are just silently excluded.
  const where = { id: { in: parsed.data.ids }, authorId: session.user.id };

  if (parsed.data.action === "delete") {
    const entries = await db.entry.findMany({
      where,
      include: { photos: true },
    });
    await db.entry.deleteMany({ where });
    await Promise.all(
      entries.flatMap((e) => e.photos.map((p) => deleteObject(p.storageKey))),
    );
    return NextResponse.json({ count: entries.length });
  }

  if (parsed.data.action === "setCategory") {
    const result = await db.entry.updateMany({
      where,
      data: { category: parsed.data.category },
    });
    return NextResponse.json({ count: result.count });
  }

  const result = await db.entry.updateMany({
    where,
    data: { isPublic: parsed.data.isPublic },
  });
  return NextResponse.json({ count: result.count });
}
