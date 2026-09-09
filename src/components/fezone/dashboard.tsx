"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { LEVELS, MISSIONS } from "@/lib/constants";
import { BadgeVisual, LevelProgressBar, ProgressBar, SectionTitle, UserAvatar, XpCounter } from "@/components/fezone/ui-bits";
import { BadgeDef, BADGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Crown, Flame, Medal, Play, Target, Trophy, BookOpen, Zap } from "lucide-react";

export default function DashboardView({ data, refresh }: { data: DashData; refresh: () => void }) {
  const { setTab, setCommunitySubmitOpen } = useFez();
  const p = data.profile;

  const nextMission = MISSIONS.find((m) => {
    const st = data.missions.find((x) => x.key === m.key)?.status;
    return st === "STARTED";
  }) ?? MISSIONS.find((m) => data.missions.find((x) => x.key === m.key)?.status === "LOCKED");

  const missionPct = Math.round((data.missionsCompleted / 9) * 100);
  const earnedBadges = BADGES.filter((b) => data.badges.includes(b.key));

  return (
    <div className="space-y-6">
      {/* ---------- Sapaan ---------- */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-fez-ink">
              Hi, {p.name.split(" ")[0]}! 👋
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-muted-foreground">Siap menyelesaikan misi hari ini?</p>
          </div>
          <span className="rounded-full border-2 border-fez-ink bg-gradient-to-r from-violet-100 to-rose-100 px-3 py-1 text-xs font-extrabold text-fez-ink sticker-sm">
            🏫 PEJUANG Fe-ZONE — {p.educationLevel}
          </span>
        </div>
      </motion.div>

      {/* ---------- Pre-test prompt (jika belum) ---------- */}
      {p.preTestScore === null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="pop-in rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-amber-200 to-rose-200 p-5 shadow-[5px_5px_0_0_#4a1d33]"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-5xl">🧪</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-extrabold text-fez-ink">Langkah Pertamamu: PRE-TEST!</p>
              <p className="text-sm text-fez-ink/70">Selesaikan pre-test (10 soal) untuk membuka semua misi. Santai, ini bukan ujian — cuma buat ngukur titik awalmu 😉</p>
            </div>
            <Button onClick={() => setTab("pretest")} className="h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-6 font-extrabold text-white hover:bg-fez-berry">
              <Play className="mr-1.5 h-5 w-5" /> Mulai Pre-Test
            </Button>
          </div>
        </motion.div>
      )}

      {/* ---------- Tombol Peer Educator ---------- */}
      {p.preTestScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-cyan-50 to-violet-50 p-4"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-4xl">🎥</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold text-fez-ink">Peer Educator Fe-Zone</p>
              <p className="text-xs text-fez-ink/60">
                Buat video edukasi 30–60 detik — setiap video yang disetujui admin = +100 XP. Bisa berkali-kali!
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCommunitySubmitOpen(true)}
            className="mt-3 h-11 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-cyan-500 to-teal-400 px-5 font-extrabold text-white hover:translate-x-0.5 hover:translate-y-0.5 sm:w-auto"
          >
            ➕ Buat Video Peer Educator
          </Button>
        </motion.div>
      )}

      {/* ---------- Profile card ---------- */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl border-2 border-fez-ink bg-white p-5 md:col-span-2"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTab("profile")}
              aria-label="Ubah foto profil"
              className="relative shrink-0 transition hover:scale-105"
            >
              <UserAvatar photoUrl={p.profilePhotoUrl} avatar={p.avatar} size={64} />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-fez-ink bg-amber-300 text-[11px]">📷</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-extrabold text-fez-ink">{p.name}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {p.age} tahun · {p.school}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-extrabold text-teal-700">
                  🎖 {earnedBadges.length} Badge
                </span>
                <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-extrabold text-rose-700">
                  ✅ {data.missionsCompleted}/9 Misi
                </span>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                  🏆 #{data.rank} di {p.educationLevel}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 p-2.5 border border-rose-100">
              <p className="font-display text-xl font-extrabold text-fez-rose"><XpCounter xp={p.xp} /></p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Total XP</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-2.5 border border-amber-100">
              <p className="font-display text-xl font-extrabold text-amber-600">🔥 {p.streakWeeks}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Streak (minggu)</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-2.5 border border-teal-100">
              <p className="font-display text-xl font-extrabold text-teal-600">💊 {data.totalCheckins}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Check-in TTD</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 p-2.5 border border-pink-100">
              <p className="font-display text-xl font-extrabold text-pink-600">🏆 #{data.rank}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Ranking</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50 p-2.5 border border-cyan-100">
              <p className="font-display text-xl font-extrabold text-cyan-600">🎥 {data.community?.peerVideos?.total ?? 0}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Video</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-2.5 border border-violet-100">
              <p className="font-display text-xl font-extrabold text-violet-600">❤️ {data.community?.totalLikes ?? 0}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Like Didapat</p>
            </div>
          </div>
        </motion.div>

        {/* Level card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-violet-100 via-rose-50 to-amber-100 p-5"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-fez-rose">Level Kamu</p>
          {(() => {
            const cur = LEVELS.slice().reverse().find((l) => p.xp >= l.minXp)!;
            return (
              <div className="mt-1 flex items-center gap-3">
                <span className="pulse-soft text-5xl">{cur.icon}</span>
                <div>
                  <p className="font-display text-2xl font-extrabold leading-none text-fez-ink">Level {cur.level}</p>
                  <p className="font-display text-lg font-bold text-fez-berry">{cur.name}</p>
                </div>
              </div>
            );
          })()}
          <div className="mt-1">
            <LevelProgressBar xp={p.xp} />
          </div>
        </motion.div>
      </div>

      {/* ---------- Spread the Fe-Zone & Engagement ---------- */}
      {p.preTestScore !== null && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-extrabold text-fez-ink">📚 Spread the Fe-Zone</p>
              {data.community?.spreadCompleted ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">✅ Selesai</span>
              ) : (
                <button onClick={() => setTab("missions")} className="text-xs font-bold text-fez-rose hover:underline">Bagikan →</button>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              Progress ajak teman: <b className="text-fez-ink">{Math.min(data.community?.spreadShares ?? 0, data.community?.spreadTarget ?? 3)}/{data.community?.spreadTarget ?? 3} teman</b>
            </p>
            <ProgressBar
              pct={(Math.min(data.community?.spreadShares ?? 0, data.community?.spreadTarget ?? 3) / (data.community?.spreadTarget ?? 3)) * 100}
              className="mt-2 h-3"
              barClass="bg-gradient-to-r from-rose-400 to-pink-500"
            />
            {data.community?.spreadCompleted && (
              <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700">
                🎉 Kamu berhasil mengajak minimal 3 teman mengenal pentingnya pencegahan anemia!
              </p>
            )}
          </div>
          <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-extrabold text-fez-ink">🎥 Peer Educator</p>
              <button onClick={() => setCommunitySubmitOpen(true)} className="text-xs font-bold text-fez-rose hover:underline">+ Buat Video</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-cyan-50 p-2">
                <p className="font-display text-lg font-extrabold text-cyan-700">{data.community?.peerVideos?.total ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Video</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2">
                <p className="font-display text-lg font-extrabold text-emerald-700">{data.community?.peerVideos?.approved ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2">
                <p className="font-display text-lg font-extrabold text-amber-700">{data.community?.peerVideos?.pending ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Pending</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              ❤️ Engagement: <b className="text-fez-ink">{data.community?.totalLikes ?? 0} like</b> dari konten publikmu
              {data.community?.peerVideos?.pending ? " · ⏳ ada video menunggu moderasi" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ---------- Mission progress ---------- */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold text-fez-ink">🎯 Mission Progress</p>
          <p className="font-display text-lg font-extrabold text-fez-rose">{missionPct}%</p>
        </div>
        <ProgressBar pct={missionPct} className="h-4" />
        <div className="mt-3 grid grid-cols-9 gap-1.5">
          {MISSIONS.map((m) => {
            const st = data.missions.find((x) => x.key === m.key)?.status;
            return (
              <div
                key={m.key}
                title={`Mission ${m.key.slice(1)}: ${m.short}`}
                className={`flex h-8 items-center justify-center rounded-lg border text-sm transition ${
                  st === "COMPLETED" ? "border-emerald-500 bg-emerald-100" :
                  st === "STARTED" ? "border-amber-500 bg-amber-100 pulse-soft" :
                  "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                {st === "COMPLETED" ? "✅" : st === "STARTED" ? m.icon : "🔒"}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{data.missionsCompleted} dari 9 misi selesai — makin jauh, makin dekat jadi Duta Fe-Zone!</p>
      </div>

      {/* ---------- Aksi cepat ---------- */}
      <div>
        <SectionTitle icon="⚡" title="Aksi Cepat" sub="Lanjutkan perjalananmu!" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {nextMission && p.preTestScore !== null && (
            <QuickCard
              icon={nextMission.icon} title={`Lanjut Misi ${nextMission.key.slice(1)}`} desc={nextMission.short}
              color="from-rose-100 to-orange-50" onClick={() => setTab("missions")}
            />
          )}
          <QuickCard icon="💊" title="TTD Tracker" desc={data.totalCheckins > 0 ? `${data.totalCheckins} check-in · 🔥${p.streakWeeks} mgg` : "Catat konsumsi TTD-mu"} color="from-teal-100 to-emerald-50" onClick={() => setTab("ttd")} />
          <QuickCard icon="📚" title="Pojok Edukasi" desc="7 kategori materi seru" color="from-violet-100 to-purple-50" onClick={() => setTab("edukasi")} />
          <QuickCard icon="🏆" title="Leaderboard" desc={`Peringkat #${data.rank} · ${p.educationLevel}`} color="from-amber-100 to-yellow-50" onClick={() => setTab("leaderboard")} />
          <QuickCard icon="🎖" title="Koleksi Badge" desc={`${earnedBadges.length}/6 badge terkumpul`} color="from-pink-100 to-rose-50" onClick={() => setTab("badges")} />
          <QuickCard icon="👑" title="Duta Challenge" desc={p.isDutaCandidate ? "Kamu KANDIDAT DUTA!" : p.postTestScore !== null ? "Tantangan final menantimu" : "Selesaikan misi dulu"} color="from-yellow-100 to-amber-50" onClick={() => setTab("duta")} />
        </div>
      </div>

      {/* ---------- Badge terbaru ---------- */}
      {earnedBadges.length > 0 && (
        <div>
          <SectionTitle icon="🎖" title="Badge Kamu" sub="Bukti perjalananmu sejauh ini" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {BADGES.map((b: BadgeDef) => (
              <BadgeVisual key={b.key} def={b} earned={data.badges.includes(b.key)} />
            ))}
          </div>
        </div>
      )}

      {/* ---------- Skor test ---------- */}
      {(p.preTestScore !== null || p.postTestScore !== null) && (
        <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
          <p className="mb-3 font-display text-lg font-extrabold text-fez-ink">📈 Perkembangan Pengetahuan</p>
          <div className="grid grid-cols-2 gap-4">
            <ScoreBox label="Pre-Test" score={p.preTestScore} color="bg-gradient-to-t from-slate-200 to-slate-50" />
            <ScoreBox label="Post-Test" score={p.postTestScore} color="bg-gradient-to-t from-emerald-200 to-emerald-50" locked={!p.postTestScore && !data.postTestUnlocked} />
          </div>
          {p.preTestScore !== null && p.postTestScore !== null && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-fez-ink">
              {p.postTestScore >= p.preTestScore
                ? `🎉 Pengetahuanmu meningkat ${p.postTestScore - p.preTestScore} poin!`
                : "Tetap semangat belajar, coba tingkatkan nilai post-testmu!"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBox({ label, score, color, locked }: { label: string; score: number | null; color: string; locked?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 border-fez-ink/10 p-3 text-center ${color}`}>
      <p className="text-xs font-extrabold uppercase text-fez-ink/60">{label}{locked ? " 🔒" : ""}</p>
      <p className="font-display text-4xl font-extrabold text-fez-ink">{score ?? "–"}</p>
    </div>
  );
}

function QuickCard({ icon, title, desc, color, onClick }: { icon: string; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`card-pop rounded-3xl border-2 border-fez-ink bg-gradient-to-br ${color} p-4 text-left`}>
      <p className="text-3xl">{icon}</p>
      <p className="mt-1.5 font-display text-sm font-extrabold leading-tight text-fez-ink">{title}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-fez-ink/55">{desc}</p>
    </button>
  );
}
