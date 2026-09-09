"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { MISSIONS, missionByKey } from "@/lib/constants";
import { ProgressBar, SectionTitle } from "@/components/fezone/ui-bits";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lock } from "lucide-react";
import {
  FoodHunt, MateriAccordion, MenuBuilder, MythGame, QuizEngine, SpreadFeZone, VideoUpload,
} from "@/components/fezone/mission-games";
import { PeerEducatorPanel } from "@/components/fezone/peer-educator";
import { QUIZ_M1, QUIZ_M2 } from "@/lib/content-quizzes";
import { MATERI_M1, MATERI_M2 } from "@/lib/content-edukasi";

type DetailView =
  | { kind: "materi-quiz"; mission: "M1" | "M3"; quizKey: "M1" | "M2"; stage: "materi" | "quiz" }
  | { kind: "foodhunt" }
  | { kind: "menu" }
  | { kind: "myth" }
  | { kind: "spread" }
  | { kind: "video" }
  | { kind: "tracker" }
  | { kind: "streak" };

export default function MissionCenter({ data, refresh }: { data: DashData; refresh: () => void }) {
  const { celebrate, setTab } = useFez();
  const [detail, setDetail] = useState<DetailView | null>(null);
  const level = (data.profile.educationLevel === "SMA" ? "SMA" : "SMP") as "SMP" | "SMA";

  function statusOf(key: string) {
    return data.missions.find((m) => m.key === key)?.status ?? "LOCKED";
  }

  function prevOf(key: string) {
    return data.missions.find((m) => m.key === key)?.prevMission ?? null;
  }

  function openMission(key: string) {
    const st = statusOf(key);
    if (st === "LOCKED") return;
    switch (key) {
      case "M1": setDetail({ kind: "materi-quiz", mission: "M1", quizKey: "M1", stage: statusOf("M1") === "COMPLETED" ? "quiz" : "materi" }); break;
      case "M2": setDetail({ kind: "tracker" }); break;
      case "M3": setDetail({ kind: "materi-quiz", mission: "M3", quizKey: "M2", stage: statusOf("M3") === "COMPLETED" ? "quiz" : "materi" }); break;
      case "M4": setDetail({ kind: "foodhunt" }); break;
      case "M5": setDetail({ kind: "menu" }); break;
      case "M6": setDetail({ kind: "myth" }); break;
      case "M7": setDetail({ kind: "spread" }); break;
      case "M8": setDetail({ kind: "video" }); break;
      case "M9": setDetail({ kind: "streak" }); break;
    }
  }

  async function onMissionResult(missionKey: string, res: { score: number; xpEarned: number; badge: string | null; passed: boolean }) {
    if (res.passed) {
      const def = missionByKey(missionKey);
      await refresh();
      celebrate(`Mission ${missionKey.slice(1)} — ${def?.title ?? ""} SELESAI!`, res.xpEarned, res.badge);
    } else {
      await refresh();
    }
  }

  function onGameComplete(key: string, xp: number, badge?: string) {
    refresh();
    const def = missionByKey(key);
    celebrate(`Mission ${key.slice(1)} — ${def?.title ?? ""} SELESAI!`, xp, badge ?? null);
  }

  // ===================== DETAIL VIEW =====================
  if (detail) {
    const back = () => { setDetail(null); refresh(); };

    if (detail.kind === "materi-quiz") {
      const def = missionByKey(detail.mission)!;
      const questions = detail.mission === "M1" ? QUIZ_M1[level] : QUIZ_M2[level];
      return (
        <div>
          {detail.stage === "materi" ? (
            <div>
              <Button variant="outline" size="sm" onClick={back} className="mb-4 rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
              <div className="mb-4 rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-100 to-amber-50 p-5">
                <p className="font-display text-xl font-extrabold text-fez-ink">{def.icon} Mission {def.key.slice(1)} — {def.title}</p>
                <p className="mt-1 text-sm text-fez-ink/70">Baca materi berikut dengan teliti, lalu kerjakan quiz di akhir. Nilai ≥80 = LULUS dan dapat {def.icon} badge + XP sesuai nilaimu (maks {def.xp} XP)!</p>
              </div>
              <MateriAccordion items={detail.mission === "M1" ? MATERI_M1 : MATERI_M2} />
              <Button
                onClick={() => setDetail({ ...detail, stage: "quiz" })}
                className="mt-5 h-14 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 text-lg font-extrabold text-white"
              >
                {statusOf(detail.mission) === "COMPLETED" ? "Ulangi Quiz (latihan)" : "Saya Siap, Mulai Quiz! 🚀"}
              </Button>
            </div>
          ) : (
            <QuizEngine
              title={`Quiz: ${def.title}`}
              questions={questions}
              quizKey={detail.quizKey}
              level={level}
              onBack={back}
              onResult={(r) => onMissionResult(detail.mission, r)}
            />
          )}
        </div>
      );
    }

    if (detail.kind === "foodhunt") {
      return <FoodHunt level={level} onBack={back} onComplete={() => onGameComplete("M4", 100, "IRON_FOOD_HUNTER")} />;
    }
    if (detail.kind === "menu") {
      return <MenuBuilder onBack={back} onComplete={() => onGameComplete("M5", 150)} />;
    }
    if (detail.kind === "myth") {
      return <MythGame onBack={back} onComplete={() => onGameComplete("M6", 100)} />;
    }
    if (detail.kind === "spread") {
      return <SpreadFeZone onBack={back} onComplete={() => onGameComplete("M7", 200, "PEER_EDUCATOR")} />;
    }
    if (detail.kind === "video") {
      return (
        <div className="space-y-5">
          <PeerEducatorPanel onBack={back} onSubmitted={() => refresh()} />
          <details className="mx-auto max-w-2xl rounded-3xl border-2 border-fez-ink/15 bg-white/70 p-4">
            <summary className="cursor-pointer text-sm font-extrabold text-fez-ink/70">
              🎓 Mode Kreativitas Mission 8 — Upload langsung untuk dinilai admin (hingga +300 XP)
            </summary>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Selain Peer Educator berkali-kali, kamu tetap bisa mengirim SATU video karya terbaikmu untuk penilaian
              kreativitas admin (+XP sesuai nilai). Jalur ini yang dihitung untuk kreativitas Final Duta Challenge.
            </p>
            <div className="mt-3">
              <VideoUpload onBack={() => {}} videos={data.videos} onComplete={() => refresh()} />
            </div>
          </details>
        </div>
      );
    }
    if (detail.kind === "tracker") {
      return (
        <div className="mx-auto max-w-xl text-center">
          <div className="rounded-3xl border-2 border-fez-ink bg-white p-6">
            <p className="text-5xl">📅</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">Mission 2 — TTD Tracker</p>
            <p className="mt-2 text-sm text-fez-ink/70">
              Misi ini TERBUKA sejak hari pertama dan berjalan di TTD Tracker. Check-in 1× per minggu setelah minum TTD
              (+10 XP per check-in). Kamu sudah <span className="font-extrabold text-teal-600">{data.totalCheckins} check-in</span>.
              Selesaikan 2 check-in untuk menamatkan misi ini!
            </p>
            <ProgressBar pct={Math.min(100, data.totalCheckins * 50)} className="mx-auto mt-4 max-w-xs" />
            <Button onClick={() => setTab("ttd")} className="mt-5 h-12 rounded-2xl border-2 border-fez-ink bg-teal-500 px-6 font-extrabold text-white hover:bg-teal-600">
              Buka TTD Tracker →
            </Button>
          </div>
          <Button variant="outline" onClick={back} className="mt-3 rounded-2xl border-2 border-fez-ink bg-white px-6 font-bold text-fez-ink">
            <ChevronLeft className="mr-1 h-4 w-4" /> Kembali ke Misi
          </Button>
        </div>
      );
    }
    if (detail.kind === "streak") {
      const streak = data.profile.streakWeeks;
      return (
        <div className="mx-auto max-w-xl">
          <Button variant="outline" size="sm" onClick={back} className="mb-4 rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Button>
          <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-orange-50 to-rose-50 p-6 text-center">
            <p className="text-6xl">🔥</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-fez-ink">Mission 9 — Iron Streak</p>
            <p className="mt-1 text-sm text-fez-ink/70">Jaga konsistensi check-in TTD setiap minggunya. Capai 4 minggu berturut-turut untuk badge CONSISTENCY QUEEN!</p>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((w) => (
                <div
                  key={w}
                  className={`rounded-2xl border-2 p-3 transition ${
                    streak >= w ? "border-fez-rose bg-gradient-to-br from-orange-200 to-rose-200 pulse-soft" : "border-gray-200 bg-white opacity-60"
                  }`}
                >
                  <p className="text-2xl">{streak >= w ? "🔥" : "🔒"}</p>
                  <p className="mt-1 text-[11px] font-extrabold text-fez-ink">{w} Minggu</p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-display text-xl font-extrabold text-fez-rose">Streak kamu: {streak} minggu</p>
            <ProgressBar pct={(streak / 4) * 100} className="mx-auto mt-2 max-w-xs" barClass="bg-gradient-to-r from-orange-400 to-rose-500" />
            <Button onClick={() => setTab("ttd")} className="mt-5 h-12 rounded-2xl border-2 border-fez-ink bg-teal-500 px-6 font-extrabold text-white hover:bg-teal-600">
              Jaga Streak di TTD Tracker →
            </Button>
          </div>
        </div>
      );
    }
  }

  // ===================== MISSION CENTER =====================
  return (
    <div>
      <SectionTitle icon="🎯" title="MISSION CENTER" sub={`Misi spesial jalur ${level} — luluskan misi berurutan (nilai ≥80) untuk membuka misi berikutnya!`} />

      {/* Info bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-fez-ink bg-white p-3">
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-fez-rose">✅ {data.missionsCompleted}/9 selesai</span>
        <span className="text-xs font-bold text-emerald-600">🔓 Mission 1 &amp; 2 terbuka sejak awal — misi berikutnya terbuka setelah misi sebelumnya LULUS!</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MISSIONS.map((m, i) => {
          const st = statusOf(m.key);
          const locked = st === "LOCKED";
          const done = st === "COMPLETED";
          const prevKey = prevOf(m.key);
          const prevTitle = prevKey ? missionByKey(prevKey)?.title : null;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card-pop relative overflow-hidden rounded-3xl border-2 p-4 ${
                done ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50"
                : locked ? "border-gray-200 bg-gray-50 opacity-75"
                : "border-fez-ink bg-white"
              }`}
            >
              {done && <span className="absolute right-3 top-3 rounded-full border-2 border-emerald-500 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">✅ SELESAI</span>}
              {locked && <span className="absolute right-3 top-3 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-extrabold text-gray-500">🔒 TERKUNCI</span>}
              {st === "STARTED" && <span className="absolute right-3 top-3 rounded-full border-2 border-amber-400 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">⏳ BERLANGSUNG</span>}

              <div className="flex items-start gap-3">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 text-3xl ${locked ? "border-gray-300 bg-gray-100 grayscale" : "border-fez-ink sticker-sm"}`} style={{ background: done ? "#d1fae5" : m.color + "20" }}>
                  {locked ? <Lock className="h-6 w-6 text-gray-400" /> : m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: locked ? "#999" : m.color }}>
                    Mission {m.key.slice(1)} · {m.key === "M8" ? `maks +${m.xp} XP/video` : m.key === "M9" ? `bonus +${m.xp} XP` : m.key === "M2" ? "+10 XP/check-in" : `maks +${m.xp} XP`}
                  </p>
                  <p className="font-display text-base font-extrabold leading-tight text-fez-ink">{m.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-fez-ink/60">{m.desc}</p>
                  {locked && prevKey && (
                    <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700">
                      🔒 Selesaikan Mission {prevKey.slice(1)}{prevTitle ? ` — ${prevTitle}` : ""} dengan nilai ≥80 untuk membuka misi ini
                    </p>
                  )}
                </div>
              </div>

              {st === "STARTED" && m.key !== "M2" && m.key !== "M9" && (
                <ProgressBar pct={m.key === "M8" ? 60 : 30} className="mt-3 h-2.5" />
              )}

              <Button
                onClick={() => openMission(m.key)}
                disabled={locked}
                className={`mt-3 h-11 w-full rounded-2xl border-2 font-extrabold ${
                  done
                    ? "border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50"
                    : locked
                    ? "border-gray-300 bg-gray-100 text-gray-400"
                    : "border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 text-white"
                }`}
              >
                {done ? "✅ Main Ulang / Lihat" : locked ? "🔒 Terkunci" : st === "STARTED" ? "⏳ Lanjutkan Misi" : "▶ Mulai Misi"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
