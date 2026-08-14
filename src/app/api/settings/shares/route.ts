import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareEmailSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shares = await db.mapShare.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ shares });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = shareEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  if (session.user.email && email === session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You can't share with yourself" },
      { status: 400 },
    );
  }

  const existing = await db.mapShare.findUnique({
    where: {
      ownerId_sharedWithEmail: { ownerId: session.user.id, sharedWithEmail: email },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already shared with this email" },
      { status: 409 },
    );
  }

  const share = await db.mapShare.create({
    data: { ownerId: session.user.id, sharedWithEmail: email },
  });

  return NextResponse.json({ share }, { status: 201 });
}
