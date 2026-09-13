import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { customMissionKey } from "@/lib/constants";
import { completeMission } from "@/lib/gamification";

// ------------------------------------------------------------
// API PESERTA: selesaikan Misi Buatan Admin (pembaruan 15)
// POST { id } → tandai misi selesai + terima XP SEKALI
// (idempoten: menekan ulang tidak menambah XP).
// XP dihitung SERVER-SIDE dari data misi — input XP dari
// frontend tidak dipercaya.
// ------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID misi wajib" }, { status: 400 });

  try {
    const mission = await db.customMission.findUnique({ where: { id } });
    if (!mission || !mission.active) {
      return NextResponse.json({ error: "Misi tidak tersedia" }, { status: 404 });
    }

    const res = await completeMission(auth.participantId, customMissionKey(mission.id), {
      xpOverride: mission.xp,
    });
    return NextResponse.json({
      ok: true,
      already: res.already,
      xpAwarded: res.xpAwarded,
      title: mission.title,
    });
  } catch (e) {
    console.error("PARTICIPANT_CUSTOM_MISSION_ERR", e);
    return NextResponse.json({ error: "SERVER", message: "Gagal menyimpan. Coba lagi." }, { status: 500 });
  }
}
