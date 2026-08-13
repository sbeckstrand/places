import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.join("/");

  const session = await auth();
  // Uploaded objects are namespaced by user id (entries/<userId>/...), which
  // doubles as the access-control check without needing a DB round trip —
  // but that only covers the owner. Anyone else (including anonymous
  // visitors) can still view it if it belongs to a public entry.
  const isOwner =
    !!session?.user && storageKey.startsWith(`entries/${session.user.id}/`);

  if (!isOwner) {
    const photo = await db.photo.findUnique({
      where: { storageKey },
      select: { entry: { select: { isPublic: true } } },
    });
    if (!photo?.entry.isPublic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const { body, contentType } = await getObject(storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isOwner
          ? "private, max-age=31536000, immutable"
          : "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
