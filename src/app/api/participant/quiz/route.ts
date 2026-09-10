import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { PASS_SCORE, XP_RULES } from "@/lib/constants";
import {
  MYTHS,
  QUIZ_FINAL,
  QUIZ_M1,
  QUIZ_M2,
  QUIZ_POSTTEST,
  QUIZ_PRETEST,
} from "@/lib/content-quizzes";
import { assertMissionUnlocked, awardBadge, awardXp, completeMission, getMissionProgress, syncMissionUnlocks } from "@/lib/gamification";
import { parseBankData } from "@/lib/quiz-content";

type QuizKey = "M1" | "M2" | "PRETEST" | "POSTTEST" | "MITOS" | "FINAL_QUIZ";

// quizKey "M2" (quiz TTD) adalah konten MISSION 3 pada urutan baru
const QUIZ_TO_MISSION: Record<string, string | null> = {
  M1: "M1",
  M2: "M3",
  PRETEST: null,
  POSTTEST: null,
  MITOS: "M6",
  FINAL_QUIZ: null,
};

// Ambil bank soal: HASIL EDITAN ADMIN dari database lebih dulu;
// kalau tidak ada / bentuknya tidak valid → soal bawaan dari kode.
// Dibuat async karena membaca database.
async function getBank(key: QuizKey, level: "SMP" | "SMA"): Promise<typeof QUIZ_PRETEST> {
  try {
    const row = await db.quizContent.findUnique({ where: { key: String(key) } });
    if (row) {
      const d = parseBankData(row.dataJson);
      if (d) {
        if (d.kind === "list") return d.questions;
        if (d.kind === "level") {
          const arr = d.levels[level];
          if (Array.isArray(arr) && arr.length > 0) return arr;
        }
        if (d.kind === "myths") {
          return d.myths.map((m) => ({
            q: m.statement,
            options: ["MITOS", "FAKTA"],
            answer: m.isFact ? 1 : 0,
            explain: m.explain,
          }));
        }
      }
    }
  } catch {
    // database bermasalah → lanjut ke soal bawaan
  }
  switch (key) {
    case "M1": return QUIZ_M1[level];
    case "M2": return QUIZ_M2[level];
    case "PRETEST": return QUIZ_PRETEST;
    case "POSTTEST": return QUIZ_POSTTEST;
    case "MITOS": return MYTHS.map((m) => ({ q: m.statement, options: ["MITOS", "FAKTA"], answer: m.isFact ? 1 : 0, explain: m.explain }));
    case "FINAL_QUIZ": return QUIZ_FINAL;
  }
}

// STEP 1: hitung skor (server-side dari jawaban) → STEP 2: cek score >= 80
// → STEP 3: lulus = XP proporsional sekali + unlock + kunci jawaban; gagal = 0 XP + kunci disembunyikan.
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const body = await req.json();
  const { quizKey, answers, level } = body ?? {};
  if (!quizKey || !Array.isArray(answers)) {
    return NextResponse.json({ error: "quizKey dan answers wajib" }, { status: 400 });
  }

  const lv: "SMP" | "SMA" = level === "SMA" ? "SMA" : "SMP";
  const bank = await getBank(quizKey as QuizKey, lv);
  if (!bank) return NextResponse.json({ error: "Quiz tidak dikenal" }, { status: 400 });

  // ===== Validasi unlock misi di SERVER (anti manipulasi URL/API/frontend) =====
  const missionKey = QUIZ_TO_MISSION[String(quizKey)] ?? null;
  if (missionKey) {
    const unlocked = await assertMissionUnlocked(pid, missionKey);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Mission masih terkunci. Lulus misi sebelumnya (nilai ≥80) untuk membukanya!" },
        { status: 403 }
      );
    }
  }
  if (quizKey === "POSTTEST") {
    const p = await db.participant.findUnique({
      where: { id: pid },
      include: { missionProgress: { select: { missionKey: true, status: true } } },
    });
    const coreDone = ["M1", "M3", "M4", "M5", "M6", "M7"].every(
      (k) => p?.missionProgress.find((m) => m.missionKey === k)?.status === "COMPLETED"
    );
    if (!coreDone) {
      return NextResponse.json({ error: "Post-Test masih terkunci. Selesaikan 6 misi inti dulu!" }, { status: 403 });
    }
  }
  if (quizKey === "FINAL_QUIZ") {
    const ds = await db.dutaStage.findUnique({ where: { participantId: pid } });
    if (!ds?.stage1Posttest) {
      return NextResponse.json({ error: "Kerjakan Post-Test dulu untuk membuka Final Quiz!" }, { status: 403 });
    }
  }

  // ===== STEP 1 — Hitung skor di server =====
  let correct = 0;
  const detail = bank.map((q, i) => {
    const userAns = typeof answers[i] === "number" ? answers[i] : -1;
    const ok = userAns === q.answer;
    if (ok) correct++;
    return { q: q.q, userAns, answer: q.answer, ok, explain: q.explain, options: q.options };
  });
  const score = Math.round((correct / bank.length) * 100);

  // ===== STEP 2 — Batas kelulusan: score >= 80 (80 dianggap LULUS) =====
  const passed = score >= PASS_SCORE;

  // Kunci jawaban & pembahasan HANYA jika lulus (anti bocor untuk nilai <80).
  // Saat gagal: detail = null — tidak ada kunci, pembahasan, maupun petunjuk benar/salah per soal.
  const safeDetail = passed ? detail : null;

  // Simpan hasil
  await db.quizResult.create({
    data: {
      participantId: pid,
      quizKey: String(quizKey),
      score,
      correct,
      total: bank.length,
      detailJson: JSON.stringify(detail),
    },
  });

  let xpEarned = 0;
  let badge: string | null = null;
  let missionCompleted = false;
  const messages: string[] = [];

  // Apakah ini LULUS PERTAMA untuk jenis quiz ini? (dasar pemberian XP sekali)
  const prevPassCount = await db.quizResult.count({
    where: { participantId: pid, quizKey: String(quizKey), score: { gte: PASS_SCORE } },
  });
  const firstTimePassed = passed && prevPassCount <= 1; // 1 = attempt yang baru saja disimpan

  if (quizKey === "PRETEST") {
    // Baseline = attempt PERTAMA yang pernah dicatat
    const first = await db.quizResult.findFirst({
      where: { participantId: pid, quizKey: "PRETEST" },
      orderBy: { createdAt: "asc" },
    });
    if (first) await db.participant.update({ where: { id: pid }, data: { preTestScore: first.score } });
    if (firstTimePassed) {
      const xp = Math.round((XP_RULES.PRETEST * score) / 100);
      await awardXp(pid, xp, "PRETEST");
      xpEarned = xp;
    }
  } else if (quizKey === "POSTTEST") {
    // Nilai terbaik yang dipakai untuk skor pengetahuan; XP hanya sekali pada lulus pertama
    // (kolom score TIDAK pernah null di database — filter "not: null" justru
    //  membuat Prisma menolak query & server crash, tampil sebagai "Koneksi bermasalah")
    const prevBest = await db.quizResult.findFirst({
      where: { participantId: pid, quizKey: "POSTTEST" },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    });
    const best = Math.max(score, prevBest?.score ?? 0);
    await db.participant.update({ where: { id: pid }, data: { postTestScore: best } });
    if (firstTimePassed) {
      const xp = Math.round((XP_RULES.POSTTEST * score) / 100);
      await awardXp(pid, xp, "POSTTEST");
      xpEarned = xp;
    }
  } else if (quizKey === "MITOS") {
    if (passed) {
      // XP = reward × skor/100 — hanya SEKALI pada lulus pertama (idempotent)
      const xp = firstTimePassed ? Math.round((100 * score) / 100) : 0;
      const res = await completeMission(pid, "M6", { score, xpOverride: firstTimePassed ? xp : null });
      xpEarned = res.xpAwarded;
      missionCompleted = !res.already;
    }
  } else if (quizKey === "FINAL_QUIZ") {
    if (passed) {
      if (firstTimePassed) {
        const xp = Math.round((XP_RULES.FINAL_QUIZ * score) / 100);
        await awardXp(pid, xp, "FINAL_QUIZ");
        xpEarned = xp;
      }
      const ds = await db.dutaStage.upsert({
        where: { participantId: pid },
        create: { participantId: pid, stage2Quiz: true },
        update: { stage2Quiz: true },
      });
      await maybeCompleteDuta(pid, ds.stage1Posttest, ds.stage2Quiz, ds.stage3Peer, ds.stage4Video, ds.stage5Presentation);
    }
  } else if (quizKey === "M1" || quizKey === "M2") {
    const mp = await getMissionProgress(pid, missionKey!);
    if (passed) {
      if (mp.status !== "COMPLETED") {
        // XP = reward maksimal × skor/100 — sekali saja (xpAwarded tersimpan di DB)
        const xp = Math.round((100 * score) / 100);
        const res = await completeMission(pid, missionKey!, { score, xpOverride: xp });
        xpEarned = res.xpAwarded;
        missionCompleted = !res.already;
        badge = quizKey === "M1" ? "ANEMIA_FIGHTER" : "TTD_CHAMPION";
        if (badge) await awardBadge(pid, badge);
      }
    } else {
      // STEP 3 gagal: 0 XP, tidak unlock, status tetap STARTED (boleh ulang)
      if (mp.status === "LOCKED") await db.missionProgress.update({ where: { id: mp.id }, data: { status: "STARTED" } });
    }
  }

  if (missionKey && passed) await syncMissionUnlocks(pid);

  if (xpEarned > 0) messages.push(`+${xpEarned} XP`);
  if (badge) messages.push("Badge baru!");

  return NextResponse.json({
    ok: true,
    score,
    correct: passed ? correct : null, // jumlah benar juga tidak dibocorkan saat gagal
    total: bank.length,
    passScore: PASS_SCORE,
    detail: safeDetail,
    showAnswerKey: passed,
    xpEarned,
    badge,
    missionCompleted,
    passed,
    alreadyRewarded: passed && !firstTimePassed,
    messages,
  });
}

async function maybeCompleteDuta(
  pid: string,
  s1: boolean, s2: boolean, s3: boolean, s4: boolean, s5: string | null
) {
  if (s1 && s2 && s3 && s4 && s5 && !s5.startsWith("__")) {
    await db.dutaStage.update({
      where: { participantId: pid },
      data: { completedAt: new Date() },
    });
    await db.participant.update({ where: { id: pid }, data: { isDutaCandidate: true } });
    await db.activityLog.create({ data: { participantId: pid, type: "DUTA_STAGE", meta: "COMPLETED" } });
  }
}
