import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

const AVATARS = ["🌸", "🌟", "🦋", "🌺", "⚡", "🍀", "💖", "🌞", "🌙", "🐉", "🎀", "🦸‍♀️"];

export async function PATCH(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { avatar } = body ?? {};
  const data: { avatar?: string } = {};

  if (avatar !== undefined) {
    if (avatar && !AVATARS.includes(avatar)) {
      return NextResponse.json({ error: "Avatar tidak valid" }, { status: 400 });
    }
    data.avatar = avatar || auth.user.avatar || "🌸";
  }

  // ---- Pemeriksaan Hemoglobin (pembaruan 19 Tahap 4) ----
  // Hasil Hb TIDAK lagi diinput peserta sendiri. Hanya petugas
  // Puskesmas yang boleh mencatat lewat endpoint khusus
  // (/api/puskesmas/remaja/[id]/hemoglobin) — data lama dari
  // pembaruan 15 tetap ditampilkan sebagai "Hb terakhir".

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
  }

  const p = await db.participant.update({
    where: { id: auth.participantId },
    data,
  });
  return NextResponse.json({
    ok: true,
    avatar: p.avatar,
    hbValue: p.hbValue,
    hbCheckDate: p.hbCheckDate,
  });
}

export async function GET() {
  return NextResponse.json({ avatars: AVATARS });
}
