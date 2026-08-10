import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchLocation } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchLocation(q);
  return NextResponse.json({ results });
}
