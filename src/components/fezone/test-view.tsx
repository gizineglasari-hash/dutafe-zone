"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { QuizEngine } from "@/components/fezone/mission-games";
import { QUIZ_POSTTEST, QUIZ_PRETEST } from "@/lib/content-quizzes";
import { useQuizBanks } from "@/lib/quiz-client";
import { SectionTitle } from "@/components/fezone/ui-bits";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export default function TestView({ kind, data, refresh }: { kind: "pretest" | "posttest"; data: DashData; refresh: () => void }) {
  const { setTab, celebrate } = useFez();
  const [retake, setRetake] = useState(false);
  const p = data.profile;
  const isPre = kind === "pretest";
  const level = (p.educationLevel === "SMA" ? "SMA" : "SMP") as "SMP" | "SMA";
  const banks = useQuizBanks(); // soal editan admin (fallback: soal bawaan)
  const questions = isPre ? banks.PRETEST ?? QUIZ_PRETEST : banks.POSTTEST ?? QUIZ_POSTTEST;

  function onResult(r: { score: number; xpEarned: number; passed: boolean }) {
    refresh();
    setRetake(false);
    if (isPre) {
      celebrate(`Pre-Test selesai! Nilai awalmu: ${r.score}`, r.xpEarned, null);
    } else {
      celebrate(`Post-Test selesai! Nilaimu: ${r.score}`, r.xpEarned, null);
    }
  }

  if (isPre && p.preTestScore !== null && !retake) {
    const passed = (p.preTestScore ?? 0) >= 80;
    if (passed) {
      return (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-fez-ink bg-white p-6 text-center">
          <p className="text-5xl">✅</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">Pre-Test sudah selesai!</p>
          <p className="mt-1 text-5xl font-display font-extrabold text-gradient-iron">{p.preTestScore}</p>
          <p className="mt-2 text-sm font-bold text-emerald-600">🎉 LULUS — nilai ≥80!</p>
          <p className="mt-2 text-sm text-muted-foreground">Nilai pre-testmu tercatat. Sekarang lanjutkan misi & belajar, lalu buktikan peningkatan di Post-Test!</p>
          <Button onClick={() => setTab("missions")} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-6 font-extrabold text-white hover:bg-fez-berry">
            Lanjut ke Misi →
          </Button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-center">
        <p className="text-5xl">❌</p>
        <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">Belum Lulus</p>
        <p className="mt-3 text-sm font-bold text-fez-ink/80">Nilai kamu: <span className="font-display text-2xl font-extrabold text-fez-rose">{p.preTestScore}</span></p>
        <p className="mt-1 text-sm font-bold text-fez-ink/70">Nilai kelulusan: ≥80</p>
        <p className="mt-3 text-sm font-semibold text-fez-ink/75">Silakan ulangi pre-test untuk mencapai nilai minimal 80.</p>
        <Button onClick={() => setRetake(true)} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-6 font-extrabold text-white">
          Ulangi Pre-Test →
        </Button>
      </div>
    );
  }

  if (!isPre) {
    if (p.postTestScore !== null && !retake) {
      const postPassed = (p.postTestScore ?? 0) >= 80;
      const gain = (p.postTestScore ?? 0) - (p.preTestScore ?? 0);
      return (
        <div>
          <div className={`mx-auto max-w-md rounded-3xl border-2 border-fez-ink p-6 text-center ${postPassed ? "bg-gradient-to-br from-emerald-50 to-teal-50" : "bg-gradient-to-br from-rose-50 to-amber-50"}`}>
            <p className="text-5xl">{postPassed ? "🎉" : "❌"}</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">
              {postPassed ? "Post-Test selesai — LULUS!" : "Post-Test — Belum Lulus"}
            </p>
            {!postPassed && (
              <p className="mt-1 text-sm font-bold text-fez-rose">Nilai kelulusan: ≥80 · Silakan ulangi post-test untuk mencapai nilai minimal 80.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-fez-ink/10 bg-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground">PRE-TEST</p>
                <p className="font-display text-3xl font-extrabold text-fez-ink">{p.preTestScore ?? "–"}</p>
              </div>
              <div className={`rounded-2xl border-2 border-fez-ink p-3 ${postPassed ? "bg-emerald-100" : "bg-amber-100"}`}>
                <p className={`text-[10px] font-extrabold uppercase ${postPassed ? "text-emerald-700" : "text-amber-700"}`}>POST-TEST</p>
                <p className="font-display text-3xl font-extrabold text-fez-ink">{p.postTestScore}</p>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-center gap-3 rounded-2xl bg-white/70 p-4">
              <MiniBar label="Pre" value={p.preTestScore ?? 0} color="bg-slate-300" max={100} />
              <MiniBar label="Post" value={p.postTestScore ?? 0} color="bg-gradient-to-t from-emerald-500 to-teal-400" max={100} />
            </div>
            <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-fez-ink">
              {gain >= 0
                ? `📈 Pengetahuan kamu meningkat ${gain} poin! ${gain >= 20 ? "Luar biasa! 🎉" : "Terus berkembang! 💪"}`
                : "Semangat! Coba pelajari lagi materi edukasinya ya."}
            </p>
            {postPassed ? (
              <Button onClick={() => setTab("duta")} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-amber-400 px-6 font-extrabold text-fez-ink hover:bg-amber-300">
                <Trophy className="mr-1.5 h-5 w-5" /> Lanjut ke Duta Challenge →
              </Button>
            ) : (
              <Button onClick={() => setRetake(true)} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-6 font-extrabold text-white">
                Ulangi Post-Test →
              </Button>
            )}
          </div>
        </div>
      );
    }
    if (!data.postTestUnlocked) {
      return (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-fez-ink bg-white p-6 text-center">
          <p className="text-5xl">🔒</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">Post-Test masih terkunci</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Selesaikan dulu 6 misi inti (Mission 1, 3, 4, 5, 6, 7) untuk membuka Post-Test.
            Progress kamu: <span className="font-extrabold text-fez-rose">{data.missionsCompleted}/9</span> misi selesai.
          </p>
          <Button onClick={() => setTab("missions")} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-6 font-extrabold text-white hover:bg-fez-berry">
            Lihat Mission Center →
          </Button>
        </div>
      );
    }
  }

  return (
    <div>
      {!isPre && (
        <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-xs font-bold text-amber-700">
          🌟 Pintu Post-Test sudah terbuka! Nilai minimal kelulusan 80. Hasilnya dibandingkan dengan pre-test-mu.
        </div>
      )}
      {isPre && (
        <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-xs font-bold text-amber-700">
          📝 Nilai kelulusan ≥80. XP mengikuti nilaimu (maks +50 XP).
        </div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-4 text-center">
          <p className="font-display text-2xl font-extrabold text-fez-ink">{isPre ? "🧪 PRE-TEST" : "🧪 POST-TEST"}</p>
          <p className="text-sm text-muted-foreground">
            {isPre ? `${questions.length} soal untuk mengukur pengetahuan awalmu` : `${questions.length} soal untuk membuktikan peningkatan pengetahuanmu`}
          </p>
        </div>
        <QuizEngine
          title={isPre ? "Pre-Test Pengetahuan" : "Post-Test Pengetahuan"}
          questions={questions}
          quizKey={isPre ? "PRETEST" : "POSTTEST"}
          level={level}
          onBack={() => setTab("dashboard")}
          onResult={onResult}
        />
      </motion.div>
    </div>
  );
}

function MiniBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-lg font-extrabold text-fez-ink">{value}</span>
      <div className="flex h-24 w-10 items-end overflow-hidden rounded-xl border-2 border-fez-ink/10 bg-white">
        <motion.div
          initial={{ height: 0 }} animate={{ height: `${(value / max) * 100}%` }} transition={{ duration: 0.9 }}
          className={`w-full rounded-lg ${color}`}
        />
      </div>
      <span className="text-[10px] font-extrabold uppercase text-muted-foreground">{label}</span>
    </div>
  );
}
