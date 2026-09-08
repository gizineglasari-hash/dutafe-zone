import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { PASS_SCORE } from "@/lib/constants";
import { assertMissionUnlocked, completeMission, syncMissionUnlocks } from "@/lib/gamification";

// Mission 6 — Mitos atau Fakta (grading server-side)
// LULUS jika score >= 80 — XP = 100 × skor/100, hanya sekali saat lulus pertama.
// Kunci jawaban & pembahasan HANYA dikirim jika lulus.
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  // Validasi unlock server-side (anti manipulasi API/URL)
  const unlocked = await assertMissionUnlocked(pid, "M6");
  if (!unlocked) {
    return NextResponse.json({ error: "Mission 6 masih terkunci. Lulus Mission 5 dulu!" }, { status: 403 });
  }

  const { answers } = await req.json();
  if (!Array.isArray(answers)) return NextResponse.json({ error: "answers wajib" }, { status: 400 });

  const { MYTHS } = await import("@/lib/content-quizzes");
  let correct = 0;
  MYTHS.forEach((m, i) => {
    if (answers[i] === m.isFact) correct++;
  });
  const score = Math.round((correct / MYTHS.length) * 100);

  // STEP 2 — batas kelulusan score >= 80 (80 dianggap LULUS)
  const passed = score >= PASS_SCORE;

  await db.quizResult.create({
    data: {
      participantId: pid, quizKey: "MITOS", score, correct, total: MYTHS.length,
      detailJson: JSON.stringify({ answers }),
    },
  });

  if (passed) {
    const xp = score; // reward maks 100 × skor/100 = skor (sekali saja — completeMission idempotent)
    const res = await completeMission(pid, "M6", { score, xpOverride: xp });
    await syncMissionUnlocks(pid);
    // Kunci jawaban + pembahasan (hanya untuk yang LULUS)
    const detail = MYTHS.map((m, i) => ({
      q: m.statement,
      userAns: answers[i] === true ? 1 : answers[i] === false ? 0 : -1,
      answer: m.isFact ? 1 : 0,
      ok: answers[i] === m.isFact,
      explain: m.explain,
      options: ["MITOS", "FAKTA"],
    }));
    return NextResponse.json({
      ok: true,
      score, correct, total: MYTHS.length,
      passScore: PASS_SCORE,
      passed: true,
      completed: !res.already,
      xpEarned: res.xpAwarded,
      alreadyRewarded: res.already,
      showAnswerKey: true,
      detail,
    });
  }

  // Belum lulus → 0 XP, TIDAK ADA kunci jawaban/pembahasan/petunjuk
  return NextResponse.json({
    ok: true,
    score,
    correct: null,
    total: MYTHS.length,
    passScore: PASS_SCORE,
    passed: false,
    completed: false,
    xpEarned: 0,
    showAnswerKey: false,
    detail: null,
  });
}
