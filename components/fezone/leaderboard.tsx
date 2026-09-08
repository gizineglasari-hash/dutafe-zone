"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { SectionTitle, UserAvatar } from "@/components/fezone/ui-bits";
import { Crown, School, Trophy, Heart, Film, Target } from "lucide-react";
import { PublicProfileModal } from "@/components/fezone/community";

interface Row {
  rank: number; id: string; name: string; school: string; avatar: string;
  profilePhotoUrl: string | null;
  xp: number; level: number; levelIcon: string; levelName: string;
  badges: string[]; missionsCompleted: number; streakWeeks: number;
  isDuta: boolean; isDutaCandidate: boolean;
}
interface SchoolRow {
  rank: number; school: string; xp: number; members: number; checkins: number;
  missions: number; contents: number; likes: number; videos: number;
}

export default function LeaderboardView({ data }: { data: DashData }) {
  const [tab, setTab] = useState<"SMP" | "SMA">(data.profile.educationLevel === "SMA" ? "SMA" : "SMP");
  const [rows, setRows] = useState<Row[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/participant/leaderboard?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.leaderboard ?? []);
        setSchools(d.schools ?? []);
        setMyRank(d.myRank ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  const medalFor = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`);

  return (
    <div className="space-y-6">
      <SectionTitle icon="🏆" title="LEADERBOARD" sub="Peringkat terpisah untuk SMP dan SMA — bersaing sehat!" />

      {/* Tab SMP/SMA */}
      <div className="mx-auto grid max-w-xs grid-cols-2 rounded-2xl border-2 border-fez-ink bg-white p-1">
        {(["SMP", "SMA"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2.5 font-display text-sm font-extrabold transition ${
              tab === t ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow" : "text-fez-ink/50 hover:text-fez-ink"
            }`}
          >
            {t === "SMP" ? "🏫" : "🎓"} {t}
          </button>
        ))}
      </div>

      {/* ======== Peringkat Saya ======== */}
      {myRank !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 p-4 shadow-[5px_5px_0_0_#4a1d33]"
        >
          <UserAvatar photoUrl={data.profile.profilePhotoUrl} avatar={data.profile.avatar} size={48} className="sticker-sm" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold leading-none text-fez-ink">Peringkat Saya #{myRank}</p>
            <p className="mt-0.5 truncate text-xs font-bold text-fez-ink/60">
              {data.profile.name} · {tab} · {data.profile.xp.toLocaleString("id-ID")} XP
            </p>
          </div>
          <span className="shrink-0 text-2xl">🎯</span>
        </motion.div>
      )}

      {/* Podium 3 besar dengan foto profil */}
      {!loading && rows.length >= 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const h = i === 1 ? "h-28" : i === 0 ? "h-20" : "h-16";
            const podium = i === 1 ? "bg-gradient-to-t from-amber-300 to-yellow-200" : i === 0 ? "bg-gradient-to-t from-slate-300 to-slate-100" : "bg-gradient-to-t from-orange-300 to-amber-200";
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setProfileId(r.id)}
                className="flex w-24 flex-col items-center sm:w-32"
                aria-label={`Profil ${r.name}`}
              >
                <div className="relative">
                  <UserAvatar photoUrl={r.profilePhotoUrl} avatar={r.avatar} size={i === 1 ? 56 : 46} className={i === 1 ? "sticker-sm" : ""} />
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-fez-ink bg-white px-1.5 text-[11px] font-extrabold">
                    {medalFor(r.rank)}
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-1 text-center text-xs font-extrabold text-fez-ink">{r.name.split(" ")[0]}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{r.xp.toLocaleString("id-ID")} XP</p>
                {r.isDuta && <span className="text-[10px]">👑</span>}
                <div className={`mt-1.5 flex w-full ${h} items-start justify-center rounded-t-2xl border-2 border-fez-ink ${podium} pt-1 font-display text-2xl`}>
                  <span className="sr-only">{`Peringkat ${r.rank}`}</span>
                  <span aria-hidden>{r.rank === 1 ? "1" : r.rank === 2 ? "2" : "3"}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-3xl border-2 border-fez-ink bg-white">
        <div className="border-b-2 border-fez-ink/10 bg-rose-50 px-4 py-3">
          <p className="font-display text-base font-extrabold text-fez-ink">
            {tab === "SMP" ? "🏫" : "🎓"} LEADERBOARD {tab}
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm font-bold text-muted-foreground">Memuat ranking...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-muted-foreground">Belum ada peserta {tab}. Jadilah yang pertama!</div>
        ) : (
          <div className="thin-scroll max-h-[480px] overflow-y-auto divide-y divide-fez-ink/5">
            {rows.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 px-4 py-3 transition ${r.id === data.profile.id ? "bg-gradient-to-r from-amber-50 to-rose-50" : "hover:bg-rose-50/40"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 font-display text-sm font-extrabold ${
                  r.rank <= 3 ? "border-fez-ink bg-amber-200 text-fez-ink" : "border-fez-ink/15 bg-white text-fez-ink/60"
                }`}>
                  {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                </span>
                <button onClick={() => setProfileId(r.id)} aria-label={`Profil ${r.name}`} className="shrink-0">
                  <UserAvatar photoUrl={r.profilePhotoUrl} avatar={r.avatar} size={40} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-fez-ink">
                    <button onClick={() => setProfileId(r.id)} className="truncate hover:underline">{r.name}</button>
                    {r.isDuta && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    {r.id === data.profile.id && <span className="rounded-full bg-fez-rose px-1.5 py-0.5 text-[9px] font-extrabold text-white">KAMU</span>}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">
                    {r.school} · {r.levelIcon} Lv{r.level} {r.levelName} · 🔥{r.streakWeeks}mgg
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-base font-extrabold text-fez-rose">{r.xp.toLocaleString("id-ID")}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    XP · ✅{r.missionsCompleted} misi · 🎖{r.badges.length}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Sekolah teraktif — diperluas */}
      <div>
        <SectionTitle icon="🏫" title="SEKOLAH TERAKTIF" sub={`Akumulasi XP, misi & konten edukasi seluruh peserta — kategori ${tab}`} />
        <div className="space-y-2">
          {schools.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-muted-foreground border-2 border-fez-ink/10">Belum ada data sekolah</p>
          ) : schools.map((s, i) => {
            const max = schools[0].xp || 1;
            return (
              <motion.div
                key={s.school} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border-2 border-fez-ink bg-white p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-fez-ink bg-gradient-to-br from-teal-100 to-emerald-50">
                    <School className="h-4 w-4 text-teal-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-fez-ink">
                      {["🥇", "🥈", "🥉"][i] ?? `${s.rank}.`} {s.school}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">{s.members} pejuang · {s.checkins} check-in TTD</p>
                  </div>
                  <p className="shrink-0 font-display text-sm font-extrabold text-fez-rose">{s.xp.toLocaleString("id-ID")} XP</p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px] font-extrabold">
                  <span className="rounded-lg bg-rose-50 px-1.5 py-1 text-fez-ink/70"><Target className="mr-0.5 inline h-3 w-3" />{s.missions} misi</span>
                  <span className="rounded-lg bg-cyan-50 px-1.5 py-1 text-cyan-700"><Film className="mr-0.5 inline h-3 w-3" />{s.contents} konten</span>
                  <span className="rounded-lg bg-amber-50 px-1.5 py-1 text-amber-700"><Heart className="mr-0.5 inline h-3 w-3" />{s.likes} like</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(s.xp / max) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-700">
        <Trophy className="h-4 w-4" /> Ranking dihitung dari total XP. XP didapat dari misi, quiz, check-in TTD, video Peer Educator & aktivitas program.
      </div>

      <PublicProfileModal participantId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
}
