"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { DUTA_WEIGHTS } from "@/lib/constants";
import { ProgressBar, SectionTitle } from "@/components/fezone/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DutaData {
  stages: { posttest: boolean; quiz: boolean; peer: boolean; video: boolean; presentation: string | null };
  completedAt: string | null;
  isDutaCandidate: boolean;
  isDuta: boolean;
  score: { knowledge: number; missions: number; ttd: number; peer: number; creativity: number; activity: number; total: number } | null;
  postTestScore: number | null;
  m7: string | null;
  videos: { id: string; fileUrl: string; status: string; grade: number | null; missionKey: string }[];
}

const STEPS = [
  { key: "posttest", icon: "🧪", title: "Post-Test", desc: "Selesaikan post-test pengetahuan (LULUS jika nilai ≥ 80)" },
  { key: "quiz", icon: "🧠", title: "Quiz Anemia Final", desc: "8 soal berpikir kritis seputar anemia & TTD" },
  { key: "peer", icon: "🤝", title: "Tantangan Edukasi Sebaya", desc: "Catat minimal 3 teman yang sudah kamu edukasi" },
  { key: "video", icon: "🎬", title: "Video Edukasi", desc: "Kirim video kreatifmu lewat Mission 8" },
  { key: "presentation", icon: "🎤", title: "Presentasi Singkat", desc: "Usul ide program TTD di sekolahmu (tema: bagaimana membuat remaja putri lebih rutin mengonsumsi TTD?)" },
] as const;

export default function DutaChallengeView({ data, refresh }: { data: DashData; refresh: () => void }) {
  const { setTab, celebrate } = useFez();
  const [duta, setDuta] = useState<DutaData | null>(null);
  const [friends, setFriends] = useState<string[]>(["", "", ""]);
  const [presentation, setPresentation] = useState("");
  const [busy, setBusy] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/participant/duta");
    if (res.ok) {
      const d = await res.json();
      setDuta(d);
      if (d.m7) {
        try {
          const f = JSON.parse(d.m7).friends as string[];
          if (f?.length) setFriends([...f, "", "", ""].slice(0, Math.max(3, f.length + 1)));
        } catch {}
      }
      if (d.stages?.presentation) setPresentation(d.stages.presentation);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function doStage(stage: string, payload?: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/participant/duta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, ...payload }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Ups!", description: d.error, variant: "destructive" });
      return false;
    }
    if (d.completed) {
      celebrate("FINAL DUTA CHALLENGE SELESAI — Kamu KANDIDAT DUTA!", 200, "DUTA_BESI");
    }
    await load();
    await refresh();
    return true;
  }

  if (!duta) {
    return <div className="p-8 text-center font-bold text-muted-foreground">Memuat tantangan...</div>;
  }

  const stageState: Record<string, boolean> = {
    posttest: duta.stages.posttest,
    quiz: duta.stages.quiz,
    peer: duta.stages.peer,
    video: duta.stages.video,
    presentation: !!duta.stages.presentation,
  };

  const allDone = Object.values(stageState).every(Boolean);

  return (
    <div className="space-y-6">
      <SectionTitle icon="👑" title="FINAL DUTA CHALLENGE" sub="Puncak perjalanan: jadilah Duta Remaja Putri Bebas Anemia!" />

      {/* Tema */}
      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-100 p-5 text-center">
        <p className="text-4xl">👑</p>
        <p className="mt-1 text-xs font-extrabold uppercase tracking-widest text-fez-rose">Tema Tantangan</p>
        <p className="mt-1 font-display text-xl font-extrabold text-fez-ink">
          &ldquo;Bagaimana cara membuat remaja putri lebih rutin mengonsumsi TTD?&rdquo;
        </p>
      </div>

      {/* Status kandidat */}
      {duta.isDuta && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-amber-300 to-yellow-200 p-5 text-center shadow-[5px_5px_0_0_#4a1d33]">
          <p className="text-5xl">👑✨</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-fez-berry">SELAMAT! KAMU TERPILIH SEBAGAI DUTA REMAJA PUTRI BEBAS ANEMIA!</p>
          <p className="mt-1 text-sm font-bold text-fez-ink/70">Kamu bisa mengunduh Sertifikat Duta di halaman Profil 🎓</p>
        </motion.div>
      )}
      {duta.isDutaCandidate && !duta.isDuta && (
        <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-violet-100 to-rose-100 p-5 text-center">
          <p className="text-4xl">🌟</p>
          <p className="mt-1 font-display text-xl font-extrabold text-fez-ink">Kamu adalah KANDIDAT DUTA!</p>
          <p className="mt-1 text-sm text-fez-ink/70">Menunggu penentuan Duta terpilih oleh admin/panitia. Terus jaga performamu!</p>
        </div>
      )}

      {/* Skor */}
      {duta.score && (
        <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-extrabold text-fez-ink">📊 Skor Penilaian Duta</p>
            <p className="font-display text-2xl font-extrabold text-gradient-iron">{duta.score.total}/100</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {[
              { key: "knowledge", val: duta.score.knowledge },
              { key: "missions", val: duta.score.missions },
              { key: "ttd", val: duta.score.ttd },
              { key: "peer", val: duta.score.peer },
              { key: "creativity", val: duta.score.creativity },
              { key: "activity", val: duta.score.activity },
            ].map((row) => {
              const w = DUTA_WEIGHTS[row.key as keyof typeof DUTA_WEIGHTS];
              return (
                <div key={row.key}>
                  <div className="mb-0.5 flex justify-between text-xs font-bold text-fez-ink/70">
                    <span>{w.label} <span className="text-muted-foreground">({w.pct}%)</span></span>
                    <span>{row.val}/100</span>
                  </div>
                  <ProgressBar pct={row.val} className="h-2.5" barClass="bg-gradient-to-r from-violet-400 to-rose-400" />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Penentuan Duta tidak hanya berdasarkan XP! Skor akhir = kombinasi bobot pengetahuan, konsistensi misi,
            aktivitas TTD tracker, edukasi sebaya, kreativitas, dan keaktifan. Panitia dapat menentukan jumlah pemenang.
          </p>
        </div>
      )}

      {/* Tahapan */}
      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const done = stageState[s.key];
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-3xl border-2 p-4 ${done ? "border-emerald-400 bg-emerald-50/60" : "border-fez-ink bg-white"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl ${done ? "border-emerald-500 bg-emerald-100" : "border-fez-ink bg-amber-100 sticker-sm"}`}>
                  {done ? "✅" : s.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-extrabold text-fez-ink">
                    Tahap {i + 1}: {s.title}
                  </p>
                  <p className="text-xs text-fez-ink/60">{s.desc}</p>
                </div>
              </div>

              {/* Aksi per tahap */}
              <div className="mt-3">
                {s.key === "posttest" && !done && (
                  <Button onClick={() => setTab("posttest")} className="h-10 rounded-xl border-2 border-fez-ink bg-fez-rose px-4 text-xs font-extrabold text-white hover:bg-fez-berry">
                    Kerjakan Post-Test dulu →
                  </Button>
                )}
                {s.key === "quiz" && !done && (
                  stageState.posttest ? (
                    <Button onClick={() => setQuizOpen(true)} className="h-10 rounded-xl border-2 border-fez-ink bg-violet-500 px-4 text-xs font-extrabold text-white hover:bg-violet-600">
                      Mulai Quiz Anemia Final →
                    </Button>
                  ) : (
                    <p className="text-[11px] font-bold text-muted-foreground">🔒 Selesaikan tahap 1 dulu</p>
                  )
                )}
                {s.key === "peer" && !done && (
                  <div className="space-y-2">
                    {friends.map((f, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Input
                          value={f}
                          onChange={(e) => setFriends((arr) => arr.map((x, k) => (k === j ? e.target.value : x)))}
                          placeholder={`Nama teman ${j + 1} yang sudah kamu edukasi`}
                          className="h-10 flex-1 rounded-xl border-2"
                        />
                        {j >= 3 && (
                          <button onClick={() => setFriends((arr) => arr.filter((_, k) => k !== j))} className="rounded-lg p-2 text-rose-400 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {friends.length < 6 && (
                      <Button variant="ghost" onClick={() => setFriends((arr) => [...arr, ""])} className="text-xs font-bold text-fez-rose">
                        <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
                      </Button>
                    )}
                    <Button
                      onClick={() => doStage("peer", { friends: friends.map((f) => f.trim()).filter(Boolean) })}
                      disabled={busy || friends.filter((f) => f.trim()).length < 3}
                      className="h-10 rounded-xl border-2 border-fez-ink bg-rose-500 px-4 text-xs font-extrabold text-white disabled:opacity-40"
                    >
                      ✅ Saya Sudah Edukasi 3+ Teman
                    </Button>
                  </div>
                )}
                {s.key === "video" && !done && (
                  <Button onClick={() => setTab("missions")} className="h-10 rounded-xl border-2 border-fez-ink bg-cyan-500 px-4 text-xs font-extrabold text-white hover:bg-cyan-600">
                    🎬 Upload video di Mission 8 →
                  </Button>
                )}
                {s.key === "presentation" && !done && (
                  <div className="space-y-2">
                    <textarea
                      value={presentation}
                      onChange={(e) => setPresentation(e.target.value)}
                      rows={4}
                      placeholder="Tulis presentasi singkat ide programmu... cth: Saya mengusulkan 'TTD Wednesday Club' — pengingat rutin tiap Rabu lewat grup WA kelas, poster kreatif di mading, dan peer educator berbagi cerita manfaat TTD setiap minggu..."
                      className="w-full rounded-xl border-2 border-fez-ink/20 bg-cream/40 p-3 text-sm focus:border-fez-rose focus:outline-none"
                    />
                    <p className="text-[11px] text-muted-foreground">{presentation.trim().length}/50 karakter minimal</p>
                    <Button
                      onClick={() => doStage("presentation", { presentation })}
                      disabled={busy || presentation.trim().length < 50}
                      className="h-10 rounded-xl border-2 border-fez-ink bg-amber-400 px-4 text-xs font-extrabold text-fez-ink disabled:opacity-40"
                    >
                      🎤 Kirim Presentasi
                    </Button>
                  </div>
                )}
                {done && (
                  <p className="text-xs font-extrabold text-emerald-600">
                    ✅ Tahap selesai{s.key === "posttest" && duta.postTestScore !== null ? ` — nilai: ${duta.postTestScore}` : ""}
                    {s.key === "presentation" && duta.stages.presentation ? " — usulanmu sudah masuk!" : ""}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {allDone && duta.completedAt && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-center text-sm font-extrabold text-emerald-700">
          🎉 Semua tahap selesai! Kamu terdaftar sebagai KANDIDAT DUTA ({data.profile.educationLevel}). Panitia akan menilai & menentukan Duta terpilih.
        </div>
      )}
      {!allDone && (
        <div className="rounded-2xl bg-amber-50 p-4 text-center text-xs font-bold text-amber-700">
          Selesaikan kelima tahap untuk menjadi Kandidat Duta. +200 XP & kelengkapan portofoliomu menanti!
        </div>
      )}

      {/* Quiz final overlay */}
      {quizOpen && (
        <FinalQuizOverlay
          level={(data.profile.educationLevel === "SMA" ? "SMA" : "SMP") as "SMP" | "SMA"}
          onClose={() => setQuizOpen(false)}
          onDone={async (xp) => {
            setQuizOpen(false);
            if (xp) celebrate("Quiz Anemia Final selesai!", xp, null);
            await load();
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
import { QuizEngine } from "@/components/fezone/mission-games";
import { QUIZ_FINAL } from "@/lib/content-quizzes";
import { useQuizBanks } from "@/lib/quiz-client";

function FinalQuizOverlay({ level, onClose, onDone }: { level: "SMP" | "SMA"; onClose: () => void; onDone: (xp: number) => void }) {
  const banks = useQuizBanks(); // soal editan admin (fallback: soal bawaan)
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-fez-cream p-4">
      <div className="mx-auto max-w-3xl py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold text-fez-ink">🧠 Quiz Anemia Final</p>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
            Tutup
          </Button>
        </div>
        <QuizEngine
          title="Quiz Anemia Final"
          questions={banks.FINAL_QUIZ ?? QUIZ_FINAL}
          quizKey="FINAL_QUIZ"
          level={level}
          onBack={onClose}
          onResult={(r) => {
            if (r.passed) onDone(r.xpEarned);
            else if (r.score < 80) toast({ title: "Belum lulus", description: `Nilaimu ${r.score}. Minimal 80 untuk lulus tahap ini. Coba lagi!` });
          }}
        />
      </div>
    </div>
  );
}
