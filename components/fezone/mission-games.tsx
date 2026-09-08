"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/fezone/ui-bits";
import { MYTHS, FOODS, MENU_SLOTS, QUIZ_M1, QUIZ_M2 } from "@/lib/content-quizzes";
import { MATERI_M1, MATERI_M2, EDUKASI } from "@/lib/content-edukasi";
import type { QuizQuestion } from "@/lib/content-quizzes";
import { ChevronLeft, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

// ============================================================
// Quiz Engine (Mission 1, 2, Pre/Post, Final)
// ============================================================
export function QuizEngine({
  title, questions, quizKey, level,
  onResult, onBack,
}: {
  title: string;
  questions: QuizQuestion[];
  quizKey: string;
  level: "SMP" | "SMA";
  onResult: (r: { score: number; xpEarned: number; badge: string | null; passed: boolean }) => void;
  onBack: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number; correct: number | null; total: number; passScore?: number;
    detail: { q: string; userAns: number; answer?: number; ok: boolean; explain?: string; options?: string[] }[] | null;
    xpEarned: number; badge: string | null; passed: boolean; showAnswerKey?: boolean;
  } | null>(null);

  const q = questions[idx];
  const answered = answers.filter((a) => a !== null).length;

  function choose(opt: number) {
    setAnswers((a) => {
      const n = [...a];
      n[idx] = opt;
      return n;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/participant/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizKey, level, answers: answers.map((a) => a ?? -1) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      setResult(data);
      onResult({ score: data.score, xpEarned: data.xpEarned, badge: data.badge, passed: data.passed });
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    }
    setSubmitting(false);
  }

  // ---------- Hasil ----------
  // Kunci jawaban & pembahasan hanya ditampilkan jika LULUS (nilai >= 80).
  if (result) {
    const pass = result.passed;
    const passScore = result.passScore ?? 80;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-2xl">
        {pass ? (
          <div className="pop-in rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center">
            <p className="text-6xl">🎉</p>
            <h3 className="mt-2 font-display text-3xl font-extrabold text-fez-ink">LULUS!</h3>
            <p className="mt-1 text-sm font-bold text-emerald-700">Nilai kamu: {result.score} — mencapai batas kelulusan ≥{passScore}</p>
            <p className="mt-1 text-5xl font-display font-extrabold text-gradient-iron">{result.score}</p>
            {typeof result.correct === "number" && (
              <p className="text-sm font-bold text-muted-foreground">
                {result.correct} benar dari {result.total} soal
              </p>
            )}
            <div className="mt-3 inline-block rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 font-display text-xl font-extrabold text-white">
              {result.xpEarned > 0 ? `+${result.xpEarned} XP` : "🏅 Lulus!"}
            </div>
            {result.xpEarned === 0 && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">Reward misi ini sudah pernah kamu dapatkan — mode latihan (tanpa XP tambahan).</p>
            )}
            {result.badge && <p className="mt-2 text-sm font-extrabold text-fez-rose">🎖 Badge baru: {result.badge.replaceAll("_", " ")}!</p>}

            {/* Kunci jawaban + pembahasan (hanya untuk yang lulus) */}
            {result.showAnswerKey && result.detail && (
              <div className="thin-scroll mt-5 max-h-72 space-y-2.5 overflow-y-auto rounded-2xl bg-white/70 p-3 text-left">
                <p className="text-center text-xs font-extrabold uppercase tracking-wider text-fez-ink/50">🔓 Kunci Jawaban &amp; Pembahasan</p>
                {result.detail.map((d, i) => (
                  <div key={i} className={`rounded-xl border-2 p-3 ${d.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                    <p className="text-sm font-bold text-fez-ink">{i + 1}. {d.q}</p>
                    <p className="mt-1 text-xs font-semibold text-fez-ink/70">
                      Jawabanmu: <span className={d.ok ? "text-emerald-600" : "text-rose-600"}>
                        {d.userAns >= 0 ? (quizKey === "MITOS" ? (d.userAns === 1 ? "FAKTA" : "MITOS") : d.options?.[d.userAns]) : "—"}
                      </span>
                      {!d.ok && <> · Benar: <span className="font-extrabold text-emerald-600">{quizKey === "MITOS" ? (d.answer === 1 ? "FAKTA" : "MITOS") : d.options?.[d.answer]}</span></>}
                    </p>
                    {d.explain && <p className="mt-1 rounded-lg bg-white/80 p-2 text-xs italic text-fez-ink/80">💡 {d.explain}</p>}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={onBack} className="mt-5 h-12 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose font-extrabold text-white hover:bg-fez-berry">
              Kembali ke Misi
            </Button>
          </div>
        ) : (
          <div className="pop-in rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-center">
            <p className="text-6xl">❌</p>
            <h3 className="mt-2 font-display text-3xl font-extrabold text-fez-ink">Belum Lulus</h3>
            <p className="mt-3 text-sm font-bold text-fez-ink/80">Nilai kamu: <span className="font-display text-2xl font-extrabold text-fez-rose">{result.score}</span></p>
            <p className="mt-1 text-sm font-bold text-fez-ink/70">Nilai kelulusan: ≥{passScore}</p>
            <div className="mt-3 inline-block rounded-2xl bg-gray-200 px-5 py-1.5 font-display text-xl font-extrabold text-gray-600">
              XP diperoleh: 0 XP
            </div>
            <p className="mt-3 text-sm font-semibold text-fez-ink/75">Silakan ulangi quiz untuk mencapai nilai minimal {passScore}.</p>
            <p className="mt-2 rounded-2xl bg-white/70 p-3 text-xs font-bold text-fez-ink/60">📖 Baca kembali materi edukasi, dan coba lagi — kamu pasti bisa!</p>
            <Button onClick={onBack} className="mt-4 h-12 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose font-extrabold text-white hover:bg-fez-berry">
              Kembali &amp; Pelajari Materi
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  // ---------- Pertanyaan ----------
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">{title}</p>
      </div>
      <ProgressBar pct={((idx + 1) / questions.length) * 100} />
      <p className="mt-1.5 text-center text-xs font-bold text-muted-foreground">Soal {idx + 1} dari {questions.length} · terjawab {answered}</p>
      <p className="mt-1 text-center text-[11px] font-extrabold text-fez-rose">🎯 Nilai kelulusan: ≥80 — XP reward mengikuti nilaimu!</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="mt-5 rounded-3xl border-2 border-fez-ink bg-white p-5 sm:p-6"
        >
          <p className="font-display text-lg font-extrabold leading-snug text-fez-ink sm:text-xl">{q.q}</p>
          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, i) => {
              const sel = answers[idx] === i;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left text-sm font-semibold transition ${
                    sel
                      ? "border-fez-rose bg-rose-50 text-fez-ink shadow-[3px_3px_0_0_#e11d48]"
                      : "border-fez-ink/15 bg-white text-fez-ink/75 hover:border-fez-ink/40 hover:bg-rose-50/40"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-display text-xs font-extrabold ${
                    sel ? "border-fez-rose bg-fez-rose text-white" : "border-fez-ink/25 text-fez-ink/50"
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="outline" disabled={idx === 0}
          onClick={() => setIdx((i) => i - 1)}
          className="h-12 rounded-2xl border-2 border-fez-ink bg-white px-5 font-bold text-fez-ink"
        >
          ← Sebelumnya
        </Button>
        {idx < questions.length - 1 ? (
          <Button
            onClick={() => setIdx((i) => i + 1)}
            disabled={answers[idx] === null}
            className="h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-8 font-extrabold text-white hover:bg-fez-berry disabled:opacity-40"
          >
            Lanjut →
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={answered < questions.length || submitting}
            className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-8 font-extrabold text-white disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirim Jawaban! 🚀"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Materi accordion (M1 & M2)
// ============================================================
export function MateriAccordion({ items }: { items: { icon: string; title: string; text: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border-2 border-fez-ink bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xl">{it.icon}</span>
            <span className="flex-1 font-display text-base font-extrabold text-fez-ink">{it.title}</span>
            <span className={`text-fez-rose transition-transform ${open === i ? "rotate-45" : ""}`}><Plus className="h-5 w-5" /></span>
          </button>
          {open === i && (
            <motion.p
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              className="border-t-2 border-dashed border-fez-ink/10 px-4 pb-4 pt-3 text-sm leading-relaxed text-fez-ink/75"
            >
              {it.text}
            </motion.p>
          )}
        </div>
      ))}
    </div>
  );
}

export function MateriM1() { return <MateriAccordion items={MATERI_M1} />; }
export function MateriM2() { return <MateriAccordion items={MATERI_M2} />; }
export { QUIZ_M1, QUIZ_M2 };

// ============================================================
// Mission 4 — Iron Food Hunt (grading server-side, kunci hanya saat lulus)
// ============================================================
export function FoodHunt({ level, onComplete, onBack }: { level: "SMP" | "SMA"; onComplete: () => void; onBack: () => void }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [notes, setNotes] = useState<{ icon: string; name: string; ok: boolean; note: string }[]>([]);

  async function submit() {
    setBusy(true);
    try {
      // Grading di server — kirim pilihan, server menentukan lulus/tidak (score >= 80)
      const res = await fetch("/api/participant/foodhunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picked: Array.from(picked) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
        setBusy(false);
        return;
      }
      setScore(data.score);
      if (data.passed) {
        // LULUS → kunci jawaban boleh ditampilkan
        const results: typeof notes = [];
        FOODS.forEach((f, i) => {
          if (picked.has(i)) results.push({ icon: f.icon, name: f.name, ok: f.isIron, note: f.note });
        });
        setNotes(results);
        setPassed(true);
        setXpEarned(data.xpEarned ?? 0);
        onComplete();
      } else {
        // Belum lulus → TANPA membocorkan jawaban
        setPassed(false);
      }
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    }
    setBusy(false);
  }

  function retry() {
    setPicked(new Set());
    setPassed(null);
    setScore(null);
    setNotes([]);
    setXpEarned(0);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">🥗 Iron Food Hunt</p>
      </div>

      {/* Hasil gagal — tanpa kunci jawaban */}
      {passed === false ? (
        <div className="pop-in rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-center">
          <p className="text-6xl">❌</p>
          <h3 className="mt-2 font-display text-3xl font-extrabold text-fez-ink">Belum Lulus</h3>
          <p className="mt-3 text-sm font-bold text-fez-ink/80">
            Nilai kamu: <span className="font-display text-2xl font-extrabold text-fez-rose">{score}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-fez-ink/70">Nilai kelulusan: ≥80</p>
          <div className="mt-3 inline-block rounded-2xl bg-gray-200 px-5 py-1.5 font-display text-xl font-extrabold text-gray-600">
            XP diperoleh: 0 XP
          </div>
          <p className="mt-3 text-sm font-semibold text-fez-ink/75">Silakan ulangi untuk mencapai nilai minimal 80.</p>
          <p className="mt-2 rounded-2xl bg-white/70 p-3 text-xs font-bold text-fez-ink/60">
            📖 Pelajari lagi materi makanan sumber zat besi, lalu coba lagi — hati-hati, ada jebakan!
          </p>
          <Button onClick={retry} className="mt-4 h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-emerald-500 to-teal-400 px-6 font-extrabold text-white">
            <RefreshCw className="mr-1 h-4 w-4" /> Coba Lagi
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
          <p className="text-center text-sm font-bold text-fez-ink/70">
            🕵️‍♀️ Tugas: pilih SEMUA makanan yang termasuk <span className="text-fez-rose">sumber zat besi</span>! Hati-hati, ada jebakan...
          </p>
          <p className="mt-1 text-center text-[11px] font-extrabold text-fez-rose">🎯 Nilai kelulusan: ≥80 — kunci jawaban terbuka jika kamu lulus!</p>
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {FOODS.map((f, i) => {
              const sel = picked.has(i);
              const reveal = passed === true && sel;
              return (
                <motion.button
                  key={f.name}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { if (passed === null) toggle(setPicked, i); }}
                  className={`relative rounded-2xl border-2 p-3 text-center transition ${
                    reveal
                      ? f.isIron ? "border-emerald-500 bg-emerald-100" : "border-rose-400 bg-rose-100"
                      : sel ? "border-fez-rose bg-rose-50 shadow-[3px_3px_0_0_#e11d48]" : "border-fez-ink/15 bg-white hover:border-fez-rose/50"
                  }`}
                >
                  <p className="text-4xl">{f.icon}</p>
                  <p className="mt-1 text-[11px] font-extrabold text-fez-ink">{f.name}</p>
                  {sel && passed === null && <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-fez-ink bg-fez-rose text-[10px] font-extrabold text-white">✓</span>}
                  {reveal && <span className="absolute -right-1.5 -top-1.5 text-lg">{f.isIron ? "✅" : "❌"}</span>}
                </motion.button>
              );
            })}
          </div>

          {passed === true && notes.length > 0 && (
            <div className="thin-scroll mt-4 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-white/80 p-3">
              <p className="text-center text-xs font-extrabold uppercase tracking-wider text-fez-ink/50">🔓 Kunci Jawaban</p>
              {notes.map((n, i) => (
                <div key={i} className={`rounded-xl border p-2.5 text-xs ${n.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                  <p className="font-extrabold text-fez-ink">{n.icon} {n.name} {n.ok ? "✅" : "❌"}</p>
                  <p className="mt-0.5 italic text-fez-ink/70">{n.note}</p>
                </div>
              ))}
              {xpEarned > 0 && (
                <p className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 p-2 text-center font-display text-base font-extrabold text-white">+{xpEarned} XP</p>
              )}
              {xpEarned === 0 && (
                <p className="rounded-xl bg-amber-50 p-2 text-center text-xs font-bold text-amber-700">Reward sudah pernah diambil — mode latihan.</p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-extrabold text-fez-ink">Dipilih: {picked.size} makanan</p>
            {passed === null && (
              <Button
                onClick={submit} disabled={picked.size === 0 || busy}
                className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-emerald-500 to-teal-400 px-6 font-extrabold text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kunci Jawaban! 🔒"}
              </Button>
            )}
            {passed === true && (
              <Button variant="outline" onClick={retry} className="h-12 rounded-2xl border-2 border-fez-ink bg-white px-4 font-bold text-fez-ink">
                <RefreshCw className="mr-1 h-4 w-4" /> Main Lagi (latihan)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toggle(setPicked: React.Dispatch<React.SetStateAction<Set<number>>>, i: number) {
  setPicked((p) => {
    const n = new Set(p);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });
}

// ============================================================
// Mission 5 — Menu Bebas Anemia
// ============================================================
export function MenuBuilder({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; title: string; lines: string[] } | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  const [feedbackXp, setFeedbackXp] = useState(0);
  const [busy, setBusy] = useState(false);

  const allChosen = MENU_SLOTS.every((s) => choices[s.slot] !== undefined);

  async function submit() {
    setBusy(true);
    const menu = MENU_SLOTS.map((s) => ({ slot: s.slot, pick: s.options[choices[s.slot]].name }));
    const res = await fetch("/api/participant/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal", description: data.error, variant: "destructive" });
      return;
    }
    setFeedback(data.feedback);
    setFeedbackScore(typeof data.score === "number" ? data.score : null);
    setFeedbackXp(data.xpEarned ?? 0);
    setSubmitted(true);
    if (data.completed) onComplete();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">🍱 Menu Bebas Anemia</p>
      </div>

      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-lime-50 to-emerald-50 p-5">
        <p className="text-center text-sm font-bold text-fez-ink/70">
          Susun menu makan SEHARI pilihanmu! Pilih 1 menu per waktu makan. Nanti dapat feedback edukatif ✨
        </p>

        <div className="mt-4 space-y-4">
          {MENU_SLOTS.map((slot) => (
            <div key={slot.slot} className="rounded-2xl border-2 border-fez-ink/10 bg-white p-3.5">
              <p className="font-display text-base font-extrabold text-fez-ink">
                {slot.icon} {slot.slot} <span className="text-[11px] font-semibold text-muted-foreground">— {slot.hint}</span>
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {slot.options.map((opt, i) => {
                  const sel = choices[slot.slot] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => { if (!submitted) setChoices((c) => ({ ...c, [slot.slot]: i })); }}
                      disabled={submitted}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left text-xs font-bold transition ${
                        sel ? "border-fez-rose bg-rose-50 text-fez-ink" : "border-fez-ink/10 bg-white text-fez-ink/70 hover:border-fez-rose/40"
                      } ${submitted ? "opacity-70" : ""}`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="flex-1 leading-snug">{opt.name}</span>
                      {sel && <span className="text-fez-rose">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {feedback && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-2xl border-2 p-4 ${feedback.ok ? "border-emerald-400 bg-emerald-50" : "border-amber-400 bg-amber-50"}`}>
            <p className="font-display text-lg font-extrabold text-fez-ink">{feedback.ok ? "🌟" : "❌"} {feedback.title}</p>
            {typeof feedbackScore === "number" && (
              <p className="mt-1 text-sm font-extrabold text-fez-ink/80">
                Nilai menu kamu: <span className={feedback.ok ? "text-emerald-600" : "text-fez-rose"}>{feedbackScore}</span> · Nilai kelulusan: ≥80
                {!feedback.ok && <> · XP diperoleh: 0 XP</>}
              </p>
            )}
            {feedback.ok && feedbackXp > 0 && (
              <div className="mt-2 inline-block rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-1 font-display text-base font-extrabold text-white">+{feedbackXp} XP</div>
            )}
            <ul className="mt-2 space-y-1.5">
              {feedback.lines.map((l, i) => (
                <li key={i} className="flex gap-2 text-sm text-fez-ink/80"><span>•</span><span>{l}</span></li>
              ))}
            </ul>
            {!feedback.ok && (
              <Button variant="outline" onClick={() => { setSubmitted(false); setFeedback(null); setFeedbackScore(null); }} className="mt-3 h-10 rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
                <RefreshCw className="mr-1 h-4 w-4" /> Susun Ulang Menu
              </Button>
            )}
          </motion.div>
        )}

        {!submitted && (
          <div className="mt-4 text-center">
            <Button
              onClick={submit} disabled={!allChosen || busy}
              className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-lime-500 to-emerald-400 px-8 font-extrabold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirim Menu & Dapat Feedback! 🍽️"}
            </Button>
            {!allChosen && <p className="mt-1.5 text-xs text-muted-foreground">Pilih 1 menu untuk setiap waktu makan dulu ya</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Mission 6 — Mitos atau Fakta (grading di akhir oleh server;
// kunci jawaban + pembahasan HANYA jika lulus nilai >= 80)
// ============================================================
export function MythGame({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(boolean | null)[]>(Array(MYTHS.length).fill(null));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean; score: number; total: number; xpEarned: number; alreadyRewarded: boolean;
    detail: { q: string; userAns: number; answer: number; ok: boolean; explain: string }[] | null;
  } | null>(null);

  const item = MYTHS[idx];
  const answered = picks.filter((p) => p !== null).length;

  function pick(val: boolean) {
    setPicks((p) => {
      const n = [...p];
      n[idx] = val;
      return n;
    });
  }

  async function submitAll() {
    setBusy(true);
    try {
      // Grading di server — kirim seluruh pilihan (kunci tidak dikirim saat gagal)
      const res = await fetch("/api/participant/myth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: picks.map((p) => p === true) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" });
        setBusy(false);
        return;
      }
      setResult({
        passed: data.passed,
        score: data.score,
        total: data.total,
        xpEarned: data.xpEarned ?? 0,
        alreadyRewarded: data.alreadyRewarded ?? false,
        detail: data.detail ?? null,
      });
      if (data.passed && data.completed) onComplete();
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    }
    setBusy(false);
  }

  function retry() {
    setPicks(Array(MYTHS.length).fill(null));
    setIdx(0);
    setResult(null);
  }

  // ---------- Hasil ----------
  if (result) {
    return result.passed ? (
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center">
        <p className="text-6xl">🎉</p>
        <h3 className="mt-2 font-display text-3xl font-extrabold text-fez-ink">LULUS!</h3>
        <p className="mt-1 text-sm font-bold text-emerald-700">Nilai kamu: {result.score} — mencapai batas kelulusan ≥80</p>
        <p className="mt-1 text-5xl font-display font-extrabold text-gradient-iron">{result.score}</p>
        <div className="mt-3 inline-block rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 font-display text-xl font-extrabold text-white">
          {result.xpEarned > 0 ? `+${result.xpEarned} XP` : "🏅 Lulus!"}
        </div>
        {result.xpEarned === 0 && (
          <p className="mt-2 text-xs font-bold text-muted-foreground">Reward misi ini sudah pernah kamu dapatkan — mode latihan (tanpa XP tambahan).</p>
        )}

        {result.detail && (
          <div className="thin-scroll mt-5 max-h-72 space-y-2.5 overflow-y-auto rounded-2xl bg-white/70 p-3 text-left">
            <p className="text-center text-xs font-extrabold uppercase tracking-wider text-fez-ink/50">🔓 Kunci Jawaban &amp; Pembahasan</p>
            {result.detail.map((d, i) => (
              <div key={i} className={`rounded-xl border-2 p-3 ${d.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <p className="text-sm font-bold text-fez-ink">{i + 1}. {d.q}</p>
                <p className="mt-1 text-xs font-semibold text-fez-ink/70">
                  Jawabanmu: <span className={d.ok ? "text-emerald-600" : "text-rose-600"}>{d.userAns === 1 ? "FAKTA" : d.userAns === 0 ? "MITOS" : "—"}</span>
                  {!d.ok && <> · Benar: <span className="font-extrabold text-emerald-600">{d.answer === 1 ? "FAKTA" : "MITOS"}</span></>}
                </p>
                {d.explain && <p className="mt-1 rounded-lg bg-white/80 p-2 text-xs italic text-fez-ink/80">💡 {d.explain}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={retry} variant="outline" className="h-12 rounded-2xl border-2 border-fez-ink bg-white px-5 font-bold text-fez-ink">
            <RefreshCw className="mr-1 h-4 w-4" /> Main Lagi (latihan)
          </Button>
          <Button onClick={onBack} className="h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-5 font-extrabold text-white hover:bg-fez-berry">
            Kembali ke Misi
          </Button>
        </div>
      </div>
    ) : (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-amber-50 p-6 text-center">
        <p className="text-6xl">❌</p>
        <h3 className="mt-2 font-display text-3xl font-extrabold text-fez-ink">Belum Lulus</h3>
        <p className="mt-3 text-sm font-bold text-fez-ink/80">Nilai kamu: <span className="font-display text-2xl font-extrabold text-fez-rose">{result.score}</span></p>
        <p className="mt-1 text-sm font-bold text-fez-ink/70">Nilai kelulusan: ≥80</p>
        <div className="mt-3 inline-block rounded-2xl bg-gray-200 px-5 py-1.5 font-display text-xl font-extrabold text-gray-600">
          XP diperoleh: 0 XP
        </div>
        <p className="mt-3 text-sm font-semibold text-fez-ink/75">Silakan ulangi untuk mencapai nilai minimal 80.</p>
        <p className="mt-2 rounded-2xl bg-white/70 p-3 text-xs font-bold text-fez-ink/60">
          📖 Nilai kamu belum mencapai batas minimal 80. Baca kembali materi edukasi, dan coba lagi!
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={retry} className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-amber-400 to-orange-400 px-5 font-extrabold text-white">
            <RefreshCw className="mr-1 h-4 w-4" /> Ulangi Game
          </Button>
          <Button onClick={onBack} variant="outline" className="h-12 rounded-2xl border-2 border-fez-ink bg-white px-5 font-bold text-fez-ink">
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Pertanyaan (tanpa membocorkan benar/salah) ----------
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">🧠 Mitos atau Fakta</p>
      </div>
      <ProgressBar pct={((idx + 1) / MYTHS.length) * 100} />
      <p className="mt-1.5 text-center text-xs font-bold text-muted-foreground">Pernyataan {idx + 1}/{MYTHS.length} · terjawab {answered}</p>
      <p className="mt-1 text-center text-[11px] font-extrabold text-fez-rose">🎯 Nilai kelulusan: ≥80 — jawab semua, hasil &amp; pembahasan muncul di akhir!</p>

      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-5 rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-amber-50 to-rose-50 p-6 text-center"
      >
        <p className="text-xs font-extrabold uppercase tracking-widest text-fez-rose">Mitos atau Fakta?</p>
        <p className="mt-3 font-display text-xl font-extrabold leading-snug text-fez-ink">&ldquo;{item.statement}&rdquo;</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => pick(false)}
            className={`rounded-2xl border-2 border-fez-ink py-4 font-display text-xl font-extrabold shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] ${
              picks[idx] === false ? "bg-rose-600 text-white ring-4 ring-rose-300" : "bg-rose-500 text-white"
            }`}
          >
            ❌ MITOS
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => pick(true)}
            className={`rounded-2xl border-2 border-fez-ink py-4 font-display text-xl font-extrabold shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] ${
              picks[idx] === true ? "bg-teal-600 text-white ring-4 ring-teal-300" : "bg-teal-500 text-white"
            }`}
          >
            ✅ FAKTA
          </motion.button>
        </div>
        {picks[idx] !== null && <p className="mt-3 text-xs font-bold text-emerald-600">✓ Jawaban tersimpan — lanjut ke pernyataan berikutnya</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="outline" disabled={idx === 0}
            onClick={() => setIdx((i) => i - 1)}
            className="h-11 rounded-2xl border-2 border-fez-ink bg-white px-4 font-bold text-fez-ink"
          >
            ← Sebelumnya
          </Button>
          {idx < MYTHS.length - 1 ? (
            <Button
              onClick={() => setIdx((i) => i + 1)}
              disabled={picks[idx] === null}
              className="h-11 rounded-2xl border-2 border-fez-ink bg-fez-rose px-6 font-extrabold text-white disabled:opacity-40"
            >
              Lanjut →
            </Button>
          ) : (
            <Button
              onClick={submitAll}
              disabled={answered < MYTHS.length || busy}
              className="h-11 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-6 font-extrabold text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Selesai & Kirim! 🏁"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Mission 7 — Spread the Fe-Zone (share edukasi via WHATSAPP, target 5 teman)
// ============================================================
export function SpreadFeZone({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [progress, setProgress] = useState<{ total: number; target: number; completed: boolean } | null>(null);
  const [topic, setTopic] = useState(EDUKASI[0].key);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/participant/spread")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setProgress({ total: d.total, target: d.target, completed: d.completed }))
      .catch(() => {});
  }, []);

  const cat = EDUKASI.find((c) => c.key === topic) ?? EDUKASI[0];
  const shareTitle = `🩸 ${cat.title} — Kenali Anemia, Rutin Minum TTD!`;
  const shareBody = `${cat.subtitle} ${cat.cards[0]?.title ? "\n• " + cat.cards[0].title : ""}\n\nCek materi lengkapnya di FE-ZONE — program Duta Remaja Putri Bebas Anemia! ✨ #FEZONE #RemajaPutriBebasAnemia`;
  const fullText = `${shareTitle}\n${shareBody}`;
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://fe-zone.id";

  async function recordShare(platform: string) {
    try {
      const res = await fetch("/api/participant/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, contentId: topic }),
      });
      const d = await res.json();
      if (res.ok) {
        setProgress({ total: d.total, target: d.target, completed: d.completed });
        if (d.completed && !progress?.completed) {
          setJustCompleted(true);
          onComplete();
        }
      }
    } catch {
      // offline — tetap lanjutkan share
    }
  }

  function shareWhatsApp() {
    // Satu-satunya tombol share: 📱 WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText + "\n" + shareUrl)}`, "_blank");
    recordShare("whatsapp");
  }

  const total = progress?.total ?? 0;
  const target = progress?.target ?? 5;
  const done = progress?.completed ?? false;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">📚 Spread the Fe-Zone</p>
      </div>

      {/* Progress 0/5 → 5/5 */}
      <div className="mb-4 rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-pink-50 p-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: target }).map((_, i) => (
            <motion.span
              key={i}
              animate={total > i ? { scale: [1, 1.3, 1] } : {}}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 text-lg transition sm:h-11 sm:w-11 ${
                done || total > i ? "border-emerald-500 bg-emerald-100" : "border-fez-ink/20 bg-white opacity-60"
              }`}
            >
              {done || total > i ? "👧" : "🔍"}
            </motion.span>
          ))}
        </div>
        <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">
          {Math.min(total, target)}/{target} teman
        </p>
        <ProgressBar pct={(Math.min(total, target) / target) * 100} className="mx-auto mt-2 max-w-xs h-3.5" barClass="bg-gradient-to-r from-rose-400 to-pink-500" />
        {done || justCompleted ? (
          <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            ✅ Target Share Edukasi tercapai! Kamu berhasil membagikan edukasi ke {target} teman lewat WhatsApp.
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Bagikan materi edukasi lewat tombol WhatsApp di bawah ({total}/{target}). Setiap share tercatat otomatis → kumpulkan {target}!
          </p>
        )}
      </div>

      {/* Pilih materi */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="font-display text-lg font-extrabold text-fez-ink">1️⃣ Pilih materi edukasi yang mau dibagikan</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EDUKASI.map((c) => (
            <button
              key={c.key}
              onClick={() => setTopic(c.key)}
              className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-extrabold transition ${
                topic === c.key ? "border-fez-ink bg-rose-100 text-fez-ink sticker-sm" : "border-fez-ink/15 text-fez-ink/55 hover:border-fez-rose/40"
              }`}
            >
              {c.icon} {c.title}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border-2 border-dashed border-fez-rose/40 bg-cream/40 p-3">
          <p className="text-sm font-extrabold text-fez-ink">{shareTitle}</p>
          <p className="mt-1 whitespace-pre-line text-xs italic text-fez-ink/60">{shareBody}</p>
        </div>
      </div>

      {/* Tombol share — HANYA WhatsApp */}
      <div className="mt-4 rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="font-display text-lg font-extrabold text-fez-ink">2️⃣ Tekan tombol SHARE VIA WHATSAPP</p>
        <div className="mt-3">
          <button onClick={shareWhatsApp} className="card-pop w-full rounded-2xl border-2 border-fez-ink bg-emerald-400 p-4 text-center font-display text-lg font-extrabold text-fez-ink sticker-sm">
            <span className="text-3xl">📱</span><br />SHARE VIA WHATSAPP
          </button>
        </div>
        <p className="mt-3 rounded-2xl bg-cream/60 p-2.5 text-[10px] leading-relaxed text-fez-ink/55">
          ℹ️ WhatsApp adalah satu-satunya kanal share misi ini. Sistem mencatat aktivitas share dari website (waktu &amp; jumlah) —
          klik share adalah catatan aktivitas, bukan verifikasi otomatis bahwa pesan sudah diterima temanmu.
        </p>
      </div>

      {done && (
        <div className="mt-4 rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-5 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-1 font-display text-lg font-extrabold text-emerald-700">Mission 7 Selesai!</p>
          <p className="mt-1 text-sm text-emerald-700/80">
            ✅ Target Share Edukasi tercapai — kamu mengajak {target} teman mengenal pentingnya pencegahan anemia. Terus sebarkan manfaatnya, calon Duta Fe-Zone! 💪
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Mission 8 — Be an Educator (upload video)
// ============================================================
export function VideoUpload({ onBack, onComplete, videos }: { onBack: () => void; onComplete: () => void; videos: { id: string; fileUrl: string; status: string; grade: number | null }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "Video terlalu besar", description: "Maksimal 4MB ya! Video lebih besar? Gunakan link YouTube/TikTok.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("missionKey", "M8");
    const res = await fetch("/api/participant/video", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal upload", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "🎬 Video terkirim!", description: "Menunggu penilaian admin. Cek status di bawah." });
    onComplete();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <p className="font-display font-extrabold text-fez-ink">🎬 Be an Educator</p>
      </div>

      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-cyan-50 to-violet-50 p-5">
        <p className="font-display text-lg font-extrabold text-fez-ink">Tantangan: &ldquo;Kenapa Remaja Putri Harus Peduli Anemia?&rdquo;</p>
        <ul className="mt-2 space-y-1 text-sm text-fez-ink/75">
          <li>🎥 Durasi: 30–60 detik (potret dirimu atau slide kreatif)</li>
          <li>💬 Isi: kenapa penting, fakta menarik, ajakan rutin TTD</li>
          <li>✨ Kreatif itu dihitung! Admin menilai karyamu (maks +300 XP)</li>
          <li>📦 Format video (mp4/mov/webm), maksimal 4MB — atau tempel link YouTube/TikTok</li>
        </ul>

        <div
          onClick={() => inputRef.current?.click()}
          className="mt-4 cursor-pointer rounded-2xl border-[2.5px] border-dashed border-fez-rose/50 bg-white/70 p-6 text-center transition hover:bg-rose-50/60"
        >
          {preview ? (
            <video src={preview} controls className="mx-auto max-h-56 rounded-xl" />
          ) : (
            <>
              <Upload className="mx-auto h-10 w-10 text-fez-rose" />
              <p className="mt-2 text-sm font-bold text-fez-ink">Klik untuk pilih video dari HP/komputermu</p>
              <p className="text-xs text-muted-foreground">mp4 · mov · webm — maks 4MB</p>
            </>
          )}
        </div>
        <input
          ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="mt-2 truncate text-center text-xs font-bold text-fez-ink">📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        )}
        <Button
          onClick={upload} disabled={!file || busy}
          className="mt-4 h-13 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-cyan-500 to-teal-400 py-3 font-extrabold text-white disabled:opacity-40"
        >
          {busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengunggah...</> : "🚀 Kirim Video untuk Dinilai"}
        </Button>
      </div>

      {videos.length > 0 && (
        <div className="mt-4 rounded-3xl border-2 border-fez-ink bg-white p-5">
          <p className="font-display text-base font-extrabold text-fez-ink">📹 Video kamu</p>
          <div className="mt-2 space-y-2">
            {videos.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-fez-ink/10 bg-cream/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-fez-ink">Mission {v.missionKey === "M8" ? "8" : "Duta"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {v.status === "GRADED" ? `✅ Dinilai: ${v.grade}/100` : "⏳ Menunggu penilaian admin"}
                  </p>
                </div>
                {v.fileUrl && (
                  <a href={v.fileUrl} target="_blank" rel="noreferrer" className="rounded-xl border-2 border-fez-ink bg-amber-200 px-3 py-1.5 text-xs font-extrabold text-fez-ink">
                    Lihat
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
