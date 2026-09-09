import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

const AVATARS = ["🌸", "🌟", "🦋", "🌺", "⚡", "🍀", "💖", "🌞", "🌙", "🐉", "🎀", "🦸‍♀️"];

export async function PATCH(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { avatar } = body ?? {};
  if (avatar && !AVATARS.includes(avatar)) {
    return NextResponse.json({ error: "Avatar tidak valid" }, { status: 400 });
  }
  const p = await db.participant.update({
    where: { id: auth.participantId },
    data: { avatar: avatar || auth.user.avatar || "🌸" },
  });
  return NextResponse.json({ ok: true, avatar: p.avatar });
}

export async function GET() {
  return NextResponse.json({ avatars: AVATARS });
}
