import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";

// POST: penilaian video & penetapan Duta
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body ?? {};

  if (action === "grade") {
    const { videoId, grade, note } = body;
    const g = parseInt(String(grade), 10);
    if (isNaN(g) || g < 0 || g > 100) return NextResponse.json({ error: "Nilai harus 0-100" }, { status: 400 });
    const video = await db.videoSubmission.findUnique({ where: { id: videoId } });
    if (!video) return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });

    const xp = Math.round(g * 3); // maks 300 XP
    const prevXp = video.xpAwarded ?? 0;

    const updated = await db.videoSubmission.update({
      where: { id: videoId },
      data: { status: "GRADED", grade: g, adminNote: note ?? null, xpAwarded: xp },
    });

    const delta = xp - prevXp;
    if (delta !== 0) await awardXp(video.participantId, delta, "VIDEO_GRADED", video.missionKey);

    // Selesaikan M8 jika nilai >= 60
    if (g >= 60 && video.missionKey === "M8") {
      const mp = await db.missionProgress.findUnique({
        where: { participantId_missionKey: { participantId: video.participantId, missionKey: "M8" } },
      });
      if (mp && mp.status !== "COMPLETED") {
        await db.missionProgress.update({
          where: { id: mp.id },
          data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
        });
      }
    }
    return NextResponse.json({ ok: true, video: updated, xpDelta: delta });
  }

  if (action === "setDuta") {
    const { participantId, isDuta } = body;
    if (typeof participantId !== "string" || typeof isDuta !== "boolean") {
      return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    }
    const p = await db.participant.update({
      where: { id: participantId },
      data: { isDuta, isDutaCandidate: isDuta ? true : undefined },
    });
    return NextResponse.json({ ok: true, participant: { id: p.id, isDuta: p.isDuta } });
  }

  if (action === "setCandidatesCount") {
    const { count } = body;
    const n = parseInt(String(count), 10);
    if (isNaN(n) || n < 0) return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
    await db.appSetting.upsert({
      where: { key: "duta_winners" },
      create: { key: "duta_winners", value: String(n) },
      update: { value: String(n) },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
