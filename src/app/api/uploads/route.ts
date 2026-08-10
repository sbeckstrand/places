import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { imageSize } from "image-size";
import { gps } from "exifr";
import { auth } from "@/lib/auth";
import { ensureBucket, putObject } from "@/lib/storage";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let dimensions: { width?: number; height?: number } = {};
  try {
    const size = imageSize(buffer);
    dimensions = { width: size.width, height: size.height };
  } catch {
    // best-effort only
  }

  let gpsCoords: { latitude: number; longitude: number } | null = null;
  try {
    const coords = await gps(buffer);
    if (coords) gpsCoords = coords;
  } catch {
    // best-effort only — many images have no GPS EXIF data
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "jpg";
  const storageKey = `entries/${session.user.id}/${randomUUID()}.${extension}`;

  await ensureBucket();
  await putObject(storageKey, buffer, file.type);

  return NextResponse.json({
    storageKey,
    ...dimensions,
    gps: gpsCoords,
  });
}
