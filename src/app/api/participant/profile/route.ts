import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

const AVATARS = ["🌸", "🌟", "🦋", "🌺", "⚡", "🍀", "💖", "🌞", "🌙", "🐉", "🎀", "🦸‍♀️"];

export async function PATCH(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { avatar, hbValue, hbCheckDate } = body ?? {};
  const data: { avatar?: string; hbValue?: number | null; hbCheckDate?: Date | null } = {};

  if (avatar !== undefined) {
    if (avatar && !AVATARS.includes(avatar)) {
      return NextResponse.json({ error: "Avatar tidak valid" }, { status: 400 });
    }
    data.avatar = avatar || auth.user.avatar || "🌸";
  }

  // ---- Pemeriksaan Hemoglobin (pembaruan 15) ----
  // Kirim { hbValue: null, hbCheckDate: null } untuk menghapus data.
  if (hbValue !== undefined || hbCheckDate !== undefined) {
    if (hbValue === null || hbCheckDate === null) {
      data.hbValue = null;
      data.hbCheckDate = null;
    } else {
      const value = typeof hbValue === "number" ? hbValue : parseFloat(String(hbValue).replace(",", "."));
      if (!Number.isFinite(value) || value < 3 || value > 25) {
        return NextResponse.json(
          { error: "VALIDASI", message: "Nilai Hb harus angka antara 3,0 sampai 25,0 g/dL." },
          { status: 400 }
        );
      }
      const parsed = new Date(String(hbCheckDate) + "T00:00:00");
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "VALIDASI", message: "Tanggal pemeriksaan tidak valid." }, { status: 400 });
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (parsed > today) {
        return NextResponse.json(
          { error: "VALIDASI", message: "Tanggal pemeriksaan tidak boleh di masa depan." },
          { status: 400 }
        );
      }
      data.hbValue = Math.round(value * 10) / 10; // bulatkan ke 1 desimal
      data.hbCheckDate = parsed;
    }
  }

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
