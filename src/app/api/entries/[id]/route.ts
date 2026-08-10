import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage";
import { entryUpdateSchema } from "@/lib/validation";

async function getOwnedEntry(id: string, userId: string) {
  const entry = await db.entry.findUnique({
    where: { id },
    include: { photos: true },
  });
  if (!entry || entry.authorId !== userId) return null;
  return entry;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await getOwnedEntry(id, session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedEntry(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = entryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { photos, ...entryData } = parsed.data;

  const entry = await db.entry.update({
    where: { id },
    data: {
      ...entryData,
      // Photos are managed as a full replace-on-write set when provided.
      ...(photos
        ? { photos: { deleteMany: {}, create: photos } }
        : {}),
    },
    include: { photos: true },
  });

  if (photos) {
    const removed = existing.photos.filter(
      (p) => !photos.some((np) => np.storageKey === p.storageKey),
    );
    await Promise.all(removed.map((p) => deleteObject(p.storageKey)));
  }

  return NextResponse.json({ entry });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await getOwnedEntry(id, session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.entry.delete({ where: { id } });
  await Promise.all(entry.photos.map((p) => deleteObject(p.storageKey)));

  return NextResponse.json({ ok: true });
}
