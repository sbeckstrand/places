import { NextRequest, NextResponse } from "next/server";
import { gps } from "exifr";
import convertHeic from "heic-convert";
import { auth } from "@/lib/auth";
import { storeEntryPhoto } from "@/lib/storage";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// Most browsers don't map HEIC/HEIF to a proper image MIME type — file.type
// commonly comes back as "" or "application/octet-stream" for them, so fall
// back to the extension for files the MIME check would otherwise reject.
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function resolveContentType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext && MIME_BY_EXTENSION[ext]) || null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const contentType = resolveContentType(file);
  if (!contentType) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  let buffer = Buffer.from(await file.arrayBuffer());

  let gpsCoords: { latitude: number; longitude: number } | null = null;
  try {
    const coords = await gps(buffer);
    if (coords) gpsCoords = coords;
  } catch {
    // best-effort only — many images have no GPS EXIF data
  }

  // No major browser other than Safari can decode HEIC/HEIF in an <img> tag,
  // so convert to JPEG at upload time rather than storing the original —
  // that way every photo is viewable everywhere, including in the client-side
  // upload preview.
  let storedContentType = contentType;
  if (contentType === "image/heic" || contentType === "image/heif") {
    buffer = Buffer.from(
      await convertHeic({ buffer, format: "JPEG", quality: 0.92 }),
    );
    storedContentType = "image/jpeg";
  }

  const { storageKey, width, height } = await storeEntryPhoto(
    session.user.id,
    buffer,
    storedContentType,
  );

  return NextResponse.json({
    storageKey,
    width,
    height,
    gps: gpsCoords,
  });
}
