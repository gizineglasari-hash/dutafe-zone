import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeDutaScore } from "@/lib/gamification";
import { getLevel } from "@/lib/constants";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [participants, checkins, missionRows, quizRows, activityRows] = await Promise.all([
    db.participant.findMany({
      include: { badges: true, missionProgress: { where: { status: "COMPLETED" } }, user: { select: { username: true, createdAt: true } } },
    }),
    db.tTDCheckIn.findMany({ orderBy: { date: "desc" } }),
    db.missionProgress.findMany({ where: { status: "COMPLETED" } }),
    db.quizResult.findMany({ where: { quizKey: { in: ["PRETEST", "POSTTEST"] } } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const total = participants.length;
  const totalSmp = participants.filter((p) => p.educationLevel === "SMP").length;
  const totalSma = participants.filter((p) => p.educationLevel === "SMA").length;

  // Peserta aktif: ada aktivitas dalam 7 hari terakhir
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const activeIds = new Set(activityRows.filter((a) => a.createdAt >= weekAgo).map((a) => a.participantId));
  const active = participants.filter((p) => activeIds.has(p.id)).length;

  const candidates = participants.filter((p) => p.isDutaCandidate);
  const dutas = participants.filter((p) => p.isDuta);

  // Grafik: peserta per sekolah
  const schoolMap = new Map<string, { school: string; SMP: number; SMA: number }>();
  for (const p of participants) {
    const cur = schoolMap.get(p.school) || { school: p.school, SMP: 0, SMA: 0 };
    if (p.educationLevel === "SMP") cur.SMP++; else cur.SMA++;
    schoolMap.set(p.school, cur);
  }
  const perSchool = Array.from(schoolMap.values()).sort((a, b) => (b.SMP + b.SMA) - (a.SMP + a.SMA));

  // Grafik: penyelesaian per misi
  const perMission = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"].map((k) => ({
    mission: k,
    completed: missionRows.filter((m) => m.missionKey === k).length,
  }));

  // Grafik: aktivitas TTD 14 hari terakhir
  const ttdDaily: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toLocaleDateString("en-CA");
    ttdDaily.push({ date: d.slice(5), count: checkins.filter((c) => c.date === d).length });
  }

  // Rata-rata pre & post (per peserta terbaik)
  const preScores = new Map<string, number>();
  const postScores = new Map<string, number>();
  for (const q of quizRows) {
    if (q.quizKey === "PRETEST") {
      const cur = preScores.get(q.participantId);
      preScores.set(q.participantId, Math.max(cur ?? 0, q.score));
    } else {
      const cur = postScores.get(q.participantId);
      postScores.set(q.participantId, Math.max(cur ?? 0, q.score));
    }
  }
  const avgPre = preScores.size ? Math.round(Array.from(preScores.values()).reduce((a, b) => a + b, 0) / preScores.size) : 0;
  const postPids = Array.from(postScores.keys());
  const avgPost = postPids.length ? Math.round(Array.from(postScores.values()).reduce((a, b) => a + b, 0) / postPids.length) : 0;
  const gain = avgPost - avgPre;

  // Kandidat Duta + skor
  const dutaCandidates = await Promise.all(
    candidates.map(async (p) => {
      const s = await computeDutaScore(p.id);
      return {
        id: p.id, name: p.name, school: p.school, educationLevel: p.educationLevel,
        xp: p.xp, level: getLevel(p.xp).name,
        score: s, isDuta: p.isDuta,
      };
    })
  );
  dutaCandidates.sort((a, b) => b.score.total - a.score.total);

  return NextResponse.json({
    stats: { total, totalSmp, totalSma, missionsCompleted: missionRows.length, totalCheckins: checkins.length, active, candidates: candidates.length, dutas: dutas.length, avgPre, avgPost, gain },
    charts: {
      smpVsSma: [
        { name: "SMP", value: totalSmp },
        { name: "SMA", value: totalSma },
      ],
      perSchool,
      perMission,
      ttdDaily,
      prePost: [
        { name: "Pre-Test", value: avgPre },
        { name: "Post-Test", value: avgPost },
      ],
    },
    dutaCandidates,
  });
}
