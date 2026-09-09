import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { CORE_MISSIONS, MISSIONS, prevMissionInChain } from "@/lib/constants";
import { checkTrackerMissions, countCompleted, getMissionProgress, startMission, syncMissionUnlocks } from "@/lib/gamification";

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  await checkTrackerMissions(pid);

  const p = await db.participant.findUnique({
    where: { id: pid },
    include: { missionProgress: true, badges: true, quizResults: true },
  });
  if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

  // Pastikan semua misi terinisialisasi (M1 & M2 otomatis STARTED — terbuka sejak awal)
  for (const m of MISSIONS) await getMissionProgress(pid, m.key);

  // Sinkronkan unlock berantai di SERVER (sumber kebenaran = database)
  await syncMissionUnlocks(pid);

  const rows = await db.missionProgress.findMany({ where: { participantId: pid } });
  const statusOf = (k: string) => rows.find((r) => r.missionKey === k)?.status ?? "LOCKED";

  const completed = countCompleted(rows);
  const coreDone = CORE_MISSIONS.every((k) => statusOf(k) === "COMPLETED");

  return NextResponse.json({
    missions: rows.map((r) => ({
      key: r.missionKey,
      status: r.status,
      progress: r.progress,
      score: r.score,
      xpAwarded: r.xpAwarded,
      completedAt: r.completedAt,
      dataJson: r.dataJson,
      // Info unlock dihitung server-side (klien tidak bisa memalsukan)
      unlocked: r.status !== "LOCKED",
      prevMission: prevMissionInChain(r.missionKey),
    })),
    badges: p.badges.map((b) => b.badgeKey),
    completed,
    preTestDone: p.preTestScore !== null,
    postTestUnlocked: coreDone,
    allCompleted: completed >= 9,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { missionKey, action } = body ?? {};
  if (!missionKey) return NextResponse.json({ error: "missionKey wajib" }, { status: 400 });

  if (action === "start") {
    // startMission memvalidasi unlock di server → misi terkunci ditolak
    const ok = await startMission(auth.participantId, missionKey);
    if (!ok) return NextResponse.json({ error: "Mission masih terkunci!" }, { status: 403 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
