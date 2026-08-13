import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGooglePlacePhoto } from "@/lib/googlePlaces";
import { storeEntryPhoto } from "@/lib/storage";

// Copies a Google Places photo into our own storage so it behaves exactly
// like a normal upload from here on (served through /api/images, owned by
// the user, deleted with the entry) — used as the default photo when the
// user picks a search result but doesn't upload one of their own.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const photoName = body?.photoName;
  if (!photoName || typeof photoName !== "string") {
    return NextResponse.json({ error: "Missing photoName" }, { status: 400 });
  }

  try {
    const { body: imageData, contentType } = await fetchGooglePlacePhoto(
      photoName,
      1200,
    );
    const { storageKey, width, height } = await storeEntryPhoto(
      session.user.id,
      Buffer.from(imageData),
      contentType,
    );
    return NextResponse.json({ storageKey, width, height });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 502 },
    );
  }
}
