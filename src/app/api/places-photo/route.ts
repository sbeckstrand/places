import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGooglePlacePhoto } from "@/lib/googlePlaces";

const MAX_WIDTH = 800;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const requestedWidth = Number(req.nextUrl.searchParams.get("maxWidth"));
  const maxWidthPx =
    Number.isFinite(requestedWidth) && requestedWidth > 0
      ? Math.min(requestedWidth, MAX_WIDTH)
      : 200;

  try {
    const { body, contentType } = await fetchGooglePlacePhoto(name, maxWidthPx);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
