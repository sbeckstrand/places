import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getObject } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const storageKey = key.join("/");

  // Uploaded objects are namespaced by user id (entries/<userId>/...), which
  // doubles as the access-control check without needing a DB round trip.
  if (!storageKey.startsWith(`entries/${session.user.id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { body, contentType } = await getObject(storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
