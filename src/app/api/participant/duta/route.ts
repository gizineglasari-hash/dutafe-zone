import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { XP_RULES } from "@/lib/constants";
import { awardXp, computeDutaScore } from "@/lib/gamification";

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const p = await db.participant.findUnique({
    where: { id: pid },
    include: { missionProgress: true, dutaStage: true, quizResults: true, videoSubmissions: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ds = p.dutaStage ?? { stage1Posttest: false, stage2Quiz: false, stage3Peer: false, stage4Video: false, stage5Presentation: null as string | null, completedAt: null as Date | null };

  // Auto-set stage1Posttest jika post-test sudah dikerjakan
  if (p.postTestScore !== null && p.dutaStage && !p.dutaStage.stage1Posttest) {
    await db.dutaStage.update({ where: { participantId: pid }, data: { stage1Posttest: true } });
  }

  const score = p.isDutaCandidate ? await computeDutaScore(pid) : null;

  return NextResponse.json({
    stages: {
      posttest: p.postTestScore !== null,
      quiz: ds.stage2Quiz,
      peer: ds.stage3Peer,
      video: ds.stage4Video,
      presentation: ds.stage5Presentation || null,
    },
    completedAt: ds.completedAt,
    isDutaCandidate: p.isDutaCandidate,
    isDuta: p.isDuta,
    score,
    postTestScore: p.postTestScore,
    m7: p.missionProgress.find((m) => m.missionKey === "M7")?.dataJson ?? null,
    videos: p.videoSubmissions.map((v) => ({ id: v.id, fileUrl: v.fileUrl, status: v.status, grade: v.grade, missionKey: v.missionKey })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const body = await req.json();
  const { stage, friends, presentation } = body ?? {};

  const p = await db.participant.findUnique({ where: { id: pid } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let ds = await db.dutaStage.upsert({ where: { participantId: pid }, create: { participantId: pid }, update: {} });

  if (stage === "posttest") {
    if (p.postTestScore === null) return NextResponse.json({ error: "Kerjakan post-test dulu!" }, { status: 400 });
    ds = await db.dutaStage.update({ where: { participantId: pid }, data: { stage1Posttest: true } });
  } else if (stage === "peer") {
    if (!Array.isArray(friends) || friends.filter((f: string) => f && f.trim()).length < 3) {
      return NextResponse.json({ error: "Catat minimal 3 nama teman yang sudah kamu edukasi" }, { status: 400 });
    }
    ds = await db.dutaStage.update({ where: { participantId: pid }, data: { stage3Peer: true, dataJson: JSON.stringify({ friends: friends.filter((f: string) => f && f.trim()).map((f: string) => String(f).trim().slice(0, 50)) }) } });
    await db.activityLog.create({ data: { participantId: pid, type: "DUTA_STAGE", meta: "PEER" } });
  } else if (stage === "video") {
    const videos = await db.videoSubmission.findMany({ where: { participantId: pid, missionKey: { in: ["M8", "DUTA_VIDEO"] } } });
    if (videos.length === 0) return NextResponse.json({ error: "Upload video edukasimu dulu di Mission 8!" }, { status: 400 });
    ds = await db.dutaStage.update({ where: { participantId: pid }, data: { stage4Video: true } });
  } else if (stage === "presentation") {
    if (!presentation || String(presentation).trim().length < 50) {
      return NextResponse.json({ error: "Tulis presentasi minimal 50 karakter" }, { status: 400 });
    }
    ds = await db.dutaStage.update({
      where: { participantId: pid },
      data: { stage5Presentation: String(presentation).trim().slice(0, 2000) },
    });
  }

  // Cek kelengkapan semua tahap
  const allDone = ds.stage1Posttest && ds.stage2Quiz && ds.stage3Peer && ds.stage4Video && !!ds.stage5Presentation;
  if (allDone && !ds.completedAt) {
    await db.dutaStage.update({ where: { participantId: pid }, data: { completedAt: new Date() } });
    await db.participant.update({ where: { id: pid }, data: { isDutaCandidate: true } });
    await awardXp(pid, XP_RULES.DUTA_COMPLETE, "DUTA_COMPLETE");
    await db.activityLog.create({ data: { participantId: pid, type: "DUTA_STAGE", meta: "COMPLETED" } });
    return NextResponse.json({ ok: true, completed: true, message: "Selamat! Kamu resmi jadi KANDIDAT DUTA! 👑" });
  }

  return NextResponse.json({ ok: true, stages: ds });
}
