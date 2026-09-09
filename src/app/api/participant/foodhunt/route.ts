import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { PASS_SCORE } from "@/lib/constants";
import { assertMissionUnlocked, awardBadge, completeMission, syncMissionUnlocks } from "@/lib/gamification";

// Mission 4 — Iron Food Hunt (grading server-side)
// LULUS jika score >= 80 — XP = 100 × skor/100, hanya sekali saat lulus pertama.
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  // Validasi unlock server-side (anti manipulasi API/URL)
  const unlocked = await assertMissionUnlocked(pid, "M4");
  if (!unlocked) {
    return NextResponse.json({ error: "Mission 4 masih terkunci. Lulus Mission 3 dulu!" }, { status: 403 });
  }

  const { picked } = await req.json();
  if (!Array.isArray(picked)) return NextResponse.json({ error: "picked wajib" }, { status: 400 });

  const { FOODS } = await import("@/lib/content-quizzes");
  const ironSources = FOODS.map((f, i) => (f.isIron ? i : -1)).filter((i) => i >= 0);
  const pickedSet = new Set(picked.map((n: number) => Math.round(n)));

  const correctPicks = ironSources.filter((i) => pickedSet.has(i)).length;
  const wrongPicks = Array.from(pickedSet).filter((i: number) => !FOODS[i]?.isIron).length;
  const correctSkips = FOODS.length - ironSources.length - wrongPicks;
  const totalCorrect = correctPicks + correctSkips;
  const score = Math.round((totalCorrect / FOODS.length) * 100);

  // STEP 2 — batas kelulusan score >= 80 (80 dianggap LULUS) & minimal memilih 7 makanan
  const passed = score >= PASS_SCORE && pickedSet.size >= 7;

  const mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId: pid, missionKey: "M4" } },
  });
  const alreadyCompleted = mp?.status === "COMPLETED";

  if (passed) {
    const xp = Math.round((100 * score) / 100); // reward maks 100 × skor/100
    const res = await completeMission(pid, "M4", {
      score,
      xpOverride: alreadyCompleted ? null : xp, // XP hanya sekali — ulangan tidak menambah
      dataJson: JSON.stringify({ score, correctPicks, wrongPicks }),
    });
    if (!res.already) await awardBadge(pid, "IRON_FOOD_HUNTER");
    await syncMissionUnlocks(pid);
    return NextResponse.json({
      ok: true,
      passed: true,
      score,
      correctPicks,
      wrongPicks,
      xpEarned: res.xpAwarded,
      alreadyRewarded: res.already,
      badge: res.already ? null : "IRON_FOOD_HUNTER",
    });
  }

  // Tidak lulus → 0 XP, tidak unlock. JANGAN bocorkan jawaban benar saat gagal.
  return NextResponse.json({
    ok: true,
    passed: false,
    score,
    passScore: PASS_SCORE,
    xpEarned: 0,
    correctPicks: null,
    wrongPicks: null,
  });
}
