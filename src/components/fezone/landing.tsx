"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { EDUKASI } from "@/lib/content-edukasi";
import { BADGES, LEVELS, MISSIONS } from "@/lib/constants";
import { ArrowRight, BookOpen, Crown, Flame, Rocket, Trophy, Users, Zap } from "lucide-react";
import { CommunityFeed, PublicProfileModal } from "@/components/fezone/community";
import { DinkesFooter, SiteCredit, UserAvatar } from "@/components/fezone/ui-bits";

// ============================================================
// Ilustrasi: Remaja putri Indonesia aktif & percaya diri
// ============================================================
function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 400" className="h-auto w-full max-w-md drop-shadow-xl" role="img" aria-label="Ilustrasi remaja putri Indonesia yang aktif dan sehat">
      {/* blobs */}
      <ellipse cx="210" cy="355" rx="165" ry="26" fill="#f7d9c4" />
      <circle cx="60" cy="70" r="42" fill="#fde68a" opacity="0.7" />
      <circle cx="375" cy="120" r="30" fill="#99f6e4" opacity="0.8" />
      <circle cx="350" cy="45" r="14" fill="#f9a8d4" />
      <path d="M40 180 q10 -18 20 0 q10 18 20 0" stroke="#f9a8d4" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Gadis 1 — hijab, memegang HP, pose ceria */}
      <g transform="translate(120,60)">
        {/* tubuh */}
        <path d="M75 120 Q60 190 68 235 L152 235 Q160 190 145 120 Q110 100 75 120Z" fill="#0d9488" />
        <path d="M75 120 Q60 190 68 235 L90 235 Q84 180 95 128Z" fill="#0f766e" />
        {/* kepala + hijab */}
        <circle cx="110" cy="82" r="42" fill="#f8b4a0" />
        <path d="M68 88 Q64 30 110 28 Q156 30 152 88 Q150 120 138 122 Q146 96 140 70 Q112 58 82 72 Q74 96 82 122 Q70 120 68 88Z" fill="#e11d48" />
        <path d="M152 88 Q170 96 168 130 Q166 150 152 152 Q158 128 152 112Z" fill="#e11d48" />
        {/* wajah */}
        <circle cx="97" cy="84" r="4" fill="#4a1d33" />
        <circle cx="123" cy="84" r="4" fill="#4a1d33" />
        <path d="M100 100 Q110 110 120 100" stroke="#4a1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle cx="88" cy="96" r="5" fill="#fb7185" opacity="0.5" />
        <circle cx="132" cy="96" r="5" fill="#fb7185" opacity="0.5" />
        {/* lengan memegang HP */}
        <path d="M70 140 Q48 168 60 192 L74 186 Q66 168 84 150Z" fill="#0d9488" />
        <circle cx="64" cy="192" r="10" fill="#f8b4a0" />
        {/* HP */}
        <rect x="40" y="178" width="30" height="52" rx="8" fill="#4a1d33" transform="rotate(-8 55 204)" />
        <rect x="44" y="184" width="22" height="38" rx="4" fill="#f472b6" transform="rotate(-8 55 204)" />
        <circle cx="55" cy="203" r="6" fill="#fff" opacity="0.85" transform="rotate(-8 55 204)" />
      </g>

      {/* Gadis 2 — kuncir dua, lompat kecil, menunjuk ke atas */}
      <g transform="translate(255,84)">
        <path d="M52 130 Q40 185 46 225 L124 225 Q130 185 118 130 Q85 112 52 130Z" fill="#f472b6" />
        <path d="M52 130 Q40 185 46 225 L66 225 Q62 182 72 136Z" fill="#ec4899" />
        <circle cx="85" cy="92" r="36" fill="#f8b4a0" />
        {/* rambut kuncir */}
        <path d="M49 92 Q47 52 85 50 Q123 52 121 92 Q121 78 112 70 Q85 60 58 70 Q49 78 49 92Z" fill="#4a1d33" />
        <circle cx="47" cy="60" r="12" fill="#4a1d33" />
        <circle cx="123" cy="60" r="12" fill="#4a1d33" />
        <circle cx="45" cy="52" r="5" fill="#fbbf24" />
        <circle cx="125" cy="52" r="5" fill="#fbbf24" />
        <circle cx="73" cy="94" r="3.5" fill="#4a1d33" />
        <circle cx="97" cy="94" r="3.5" fill="#4a1d33" />
        <path d="M76 108 Q85 116 94 108" stroke="#4a1d33" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="66" cy="104" r="4.5" fill="#fb7185" opacity="0.5" />
        <circle cx="104" cy="104" r="4.5" fill="#fb7185" opacity="0.5" />
        {/* lengan menunjuk */}
        <path d="M118 140 Q140 118 148 96 L136 88 Q126 110 108 128Z" fill="#f472b6" />
        <circle cx="143" cy="91" r="9" fill="#f8b4a0" />
        {/* kaki */}
        <rect x="58" y="222" width="14" height="26" rx="7" fill="#f8b4a0" />
        <rect x="100" y="222" width="14" height="26" rx="7" fill="#f8b4a0" />
        <ellipse cx="62" cy="252" rx="13" ry="6" fill="#e11d48" />
        <ellipse cx="106" cy="252" rx="13" ry="6" fill="#e11d48" />
      </g>

      {/* elemen floating */}
      <g transform="translate(36,236)">
        <rect x="0" y="0" width="74" height="52" rx="14" fill="#fff" stroke="#4a1d33" strokeWidth="3" />
        <text x="37" y="24" textAnchor="middle" fontSize="15" fontWeight="800" fill="#e11d48">+100</text>
        <text x="37" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9d174d">XP</text>
      </g>
      <g transform="translate(330,250)">
        <rect x="0" y="0" width="76" height="54" rx="14" fill="#fff" stroke="#4a1d33" strokeWidth="3" />
        <text x="38" y="26" textAnchor="middle" fontSize="18">🔥</text>
        <text x="38" y="45" textAnchor="middle" fontSize="11" fontWeight="800" fill="#9d174d">4 MINGGU</text>
      </g>
      <g transform="translate(190,18)">
        <circle cx="0" cy="0" r="26" fill="#fff" stroke="#4a1d33" strokeWidth="3" />
        <text x="0" y="8" textAnchor="middle" fontSize="22">🩸</text>
      </g>
      <g transform="translate(318,196)">
        <circle cx="0" cy="0" r="22" fill="#fff" stroke="#4a1d33" strokeWidth="3" />
        <text x="0" y="7" textAnchor="middle" fontSize="18">💊</text>
      </g>
      <g transform="translate(96,40)">
        <text fontSize="20">✨</text>
      </g>
      <g transform="translate(240,320)">
        <text fontSize="18">🥗</text>
      </g>
    </svg>
  );
}

// ============================================================
// Top 3 Duta Fe-Zone — leaderboard publik SMP & SMA (sebelum login).
// Hanya data aman: nama, sekolah, avatar, XP, level (tanpa data sensitif).
// ============================================================
interface PublicRow {
  rank: number; id: string; name: string; school: string;
  avatar: string; profilePhotoUrl: string | null;
  xp: number; level: number; levelIcon: string; levelName: string;
  isDuta: boolean;
}

function TopDutaPreview({ onOpenProfile }: { onOpenProfile: (id: string) => void }) {
  const [data, setData] = useState<{ SMP: PublicRow[]; SMA: PublicRow[] } | null>(null);

  useEffect(() => {
    fetch("/api/public/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData({ SMP: d.SMP ?? [], SMA: d.SMA ?? [] }))
      .catch(() => setData({ SMP: [], SMA: [] }));
  }, []);

  const medalFor = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["SMP", "SMA"] as const).map((lv, gi) => {
        const rows = data?.[lv] ?? [];
        return (
          <motion.div
            key={lv}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: gi * 0.08 }}
            className="card-pop overflow-hidden rounded-3xl border-2 border-fez-ink bg-white"
          >
            <div className="flex items-center justify-between border-b-2 border-fez-ink/10 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3">
              <p className="font-display text-lg font-extrabold text-fez-ink">
                {lv === "SMP" ? "🏫" : "🎓"} Leaderboard {lv}
              </p>
              <span className="rotate-2 rounded-full border-2 border-fez-ink bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink sticker-sm">
                Top 3
              </span>
            </div>

            {!data ? (
              <div className="p-8 text-center text-sm font-bold text-muted-foreground">Memuat ranking...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl">🌱</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  Belum ada peserta {lv}. Jadilah yang pertama!
                </p>
              </div>
            ) : (
              <div className="px-3 pb-5 pt-5">
                <div className="flex items-end justify-center gap-1.5 sm:gap-3">
                  {[rows[1], rows[0], rows[2]].filter(Boolean).map((r, i) => {
                    const first = r.rank === 1;
                    const h = first ? "h-24" : r.rank === 2 ? "h-16" : "h-12";
                    const podium = first
                      ? "bg-gradient-to-t from-amber-300 to-yellow-200"
                      : r.rank === 2
                        ? "bg-gradient-to-t from-slate-300 to-slate-100"
                        : "bg-gradient-to-t from-orange-300 to-amber-200";
                    return (
                      <motion.button
                        key={r.id}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15 + i * 0.1 }}
                        onClick={() => onOpenProfile(r.id)}
                        className="flex w-24 flex-col items-center sm:w-28"
                        aria-label={`Lihat profil publik ${r.name}`}
                      >
                        <div className="relative">
                          <UserAvatar
                            photoUrl={r.profilePhotoUrl}
                            avatar={r.avatar}
                            size={first ? 54 : 44}
                            className={first ? "sticker-sm" : ""}
                          />
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-fez-ink bg-white px-1.5 text-[11px] font-extrabold">
                            {medalFor(r.rank)}
                          </span>
                        </div>
                        <p className="mt-2.5 line-clamp-1 text-center text-xs font-extrabold text-fez-ink">
                          {r.name.split(" ")[0]} {r.isDuta ? "👑" : ""}
                        </p>
                        <p className="line-clamp-1 max-w-full text-center text-[10px] font-bold text-muted-foreground" title={r.school}>
                          {r.school}
                        </p>
                        <p className="mt-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-fez-rose">
                          {r.xp.toLocaleString("id-ID")} XP
                        </p>
                        <p className="text-[10px] font-bold text-fez-ink/60">
                          {r.levelIcon} Lv{r.level}
                        </p>
                        <div className={`mt-2 flex w-full ${h} items-start justify-center rounded-t-2xl border-2 border-fez-ink ${podium} pt-1 font-display text-2xl`}>
                          <span className="sr-only">{`Peringkat ${r.rank}`}</span>
                          <span aria-hidden>{r.rank}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// Landing
// ============================================================
export default function Landing() {
  const { setView, setAuthMode } = useFez();
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/hero")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setHeroImageUrl(d.heroImageUrl ?? null))
      .catch(() => {});
  }, []);

  const infoItems = [
    {
      icon: "🩸", color: "bg-rose-100", q: "Apa itu anemia?",
      a: "Anemia adalah kondisi tubuh kekurangan sel darah merah atau hemoglobin (Hb) — 'angkutan oksigen' di darah. Akibatnya tubuh kekurangan oksigen: lemas, pucat, pusing, dan cepat capek. Remaja putri disebut anemia jika Hb di bawah 12 g/dL.",
    },
    {
      icon: "👧", color: "bg-pink-100", q: "Mengapa remaja putri berisiko anemia?",
      a: "Dua alasan utama: (1) masa pertumbuhan pesat butuh zat besi lebih banyak; (2) setiap menstruasi, tubuh kehilangan darah yang membawa zat besi keluar. Ditambah kebiasaan jajan sembarangan atau diet tidak sehat, risikonya makin tinggi. Data menunjukkan sekitar 32% remaja putri Indonesia mengalami anemia!",
    },
    {
      icon: "💊", color: "bg-violet-100", q: "Mengapa TTD penting?",
      a: "TTD (Tablet Tambah Darah) berisi 60 mg zat besi + 400 mcg asam folat — bahan bakar pembentukan darah. Minum TTD 1 tablet seminggu sesuai anjuran mencegah anemia, meningkatkan konsentrasi belajar, stamina, dan menyiapkan tubuh untuk kehamilan sehat di masa depan.",
    },
    {
      icon: "🥗", color: "bg-emerald-100", q: "Bagaimana cara mencegah anemia?",
      a: "Lima langkah: (1) Makan makanan kaya zat besi — daging, ikan, telur, bayam, kacang-kacangan, tempe; (2) Dampingi dengan vitamin C (jeruk, jambu biji) agar serapan maksimal; (3) Rutin minum TTD sesuai anjuran; (4) Hindari teh/kopi bersamaan dengan makan & TTD; (5) Cek Hb secara berkala.",
    },
    {
      icon: "👑", color: "bg-amber-100", q: "Apa itu Duta Fe-Zone?",
      a: "Duta Fe-Zone adalah gelar bagi remaja putri terbaik di program FE-ZONE — yang mengenal anemia, rutin minum TTD, dan berhasil menginspirasi teman-temannya. Seorang Duta menyelesaikan semua misi, meraih XP & badge, dan lolos Final Duta Challenge. Dia jadi panutan generasi bebas anemia!",
    },
  ];

  const steps = [
    { icon: "📝", t: "Registrasi", d: "Daftar jadi Pejuang Fe-Zone" },
    { icon: "🏫", t: "Pilih Level", d: "Masuk jalur SMP atau SMA" },
    { icon: "🧪", t: "Pre-Test", d: "Ukur pengetahuan awalmu" },
    { icon: "📚", t: "Edukasi", d: "Belajar materi seru" },
    { icon: "🎯", t: "9 Misi", d: "Kumpulkan XP & badge" },
    { icon: "🏆", t: "Leaderboard", d: "Bersaing sehat selevel" },
    { icon: "🧪", t: "Post-Test", d: "Bukti pengetahuan naik" },
    { icon: "👑", t: "Duta Challenge", d: "Raih gelar Duta Fe-Zone!" },
  ];

  return (
    <div className="min-h-screen bg-fez-cream">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 border-b-2 border-fez-ink/10 bg-fez-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 rotate-[-6deg] items-center justify-center rounded-xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 font-display text-lg font-extrabold text-white sticker-sm">
              Fe
            </span>
            <div className="leading-none">
              <p className="font-display text-xl font-extrabold text-fez-ink">FE-ZONE</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fez-rose">Remaja Putri Bebas Anemia</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById("community")?.scrollIntoView({ behavior: "smooth" })}
              className="h-10 rounded-xl border-2 border-fez-ink bg-white px-2.5 font-bold text-fez-ink hover:bg-amber-50 sm:px-4"
              aria-label="Lihat Fe-Zone Community"
            >
              🌟 <span className="hidden sm:inline">Komunitas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => { setAuthMode("login"); setView("auth"); }}
              className="h-10 rounded-xl border-2 border-fez-ink bg-white px-3 font-bold text-fez-ink hover:bg-amber-50 sm:px-4"
            >
              Masuk
            </Button>
            <Button
              onClick={() => { setAuthMode("register"); setView("auth"); }}
              className="h-10 rounded-xl border-2 border-fez-ink bg-fez-rose px-4 font-bold text-white hover:bg-fez-berry"
            >
              Daftar
            </Button>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="bg-hero-blob relative overflow-hidden">
        <div className="dots-bg absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 inline-flex rotate-[-2deg] items-center gap-2 rounded-full border-2 border-fez-ink bg-amber-200 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-fez-ink sticker-sm"
            >
              🩸 Zona Remaja Putri Bebas Anemia
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="font-display text-5xl font-extrabold leading-[1.02] text-fez-ink sm:text-6xl md:text-7xl"
            >
              DUTA
              <span className="text-gradient-iron block">FE-ZONE</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-3 font-display text-xl font-bold text-fez-berry sm:text-2xl"
            >
              Duta Remaja Putri Bebas Anemia
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-2 text-sm font-semibold text-fez-ink/70 sm:text-base"
            >
              Kenali Anemia • Rutin Minum TTD • Ajak Teman • Jadi Duta!
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start"
            >
              <Button
                onClick={() => { setAuthMode("register"); setView("auth"); }}
                className="h-14 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-7 text-lg font-extrabold text-white shadow-[5px_5px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#4a1d33]"
              >
                <Rocket className="mr-2 h-5 w-5" /> MULAI PERJALANAN
              </Button>
              <Button
                onClick={() => document.getElementById("kenali")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 rounded-2xl border-2 border-fez-ink bg-white px-7 text-lg font-extrabold text-fez-ink shadow-[5px_5px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#4a1d33]"
              >
                <BookOpen className="mr-2 h-5 w-5" /> KENALI ANEMIA
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 text-sm italic text-fez-ink/60"
            >
              &ldquo;Jadilah bagian dari generasi remaja putri yang sehat, aktif, cerdas, dan bebas anemia.&rdquo;
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto w-full max-w-md"
          >
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt="Ilustrasi program FE-ZONE — Duta Remaja Putri Bebas Anemia"
                className="h-auto w-full max-w-md object-contain mix-blend-multiply"
              />
            ) : (
              <HeroIllustration />
            )}
          </motion.div>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <div className="overflow-hidden border-y-2 border-fez-ink bg-fez-ink py-2.5">
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap font-display text-sm font-bold uppercase tracking-widest text-amber-200">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex gap-8">
              {["🩸 Kenali Anemia", "💊 Rutin Minum TTD", "🥗 Sahabat Zat Besi", "📢 Ajak Temanmu", "🔥 Jaga Streak", "🏆 Kumpulkan XP", "👑 Jadi Duta Fe-Zone", "✨ Generasi Bebas Anemia"].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ================= STAT BAND ================= */}
      <section className="mx-auto -mt-0 max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: <Zap className="h-5 w-5" />, n: "9", l: "Misi Seru" },
            { icon: <Trophy className="h-5 w-5" />, n: "6", l: "Badge Spesial" },
            { icon: <Flame className="h-5 w-5" />, n: "5", l: "Level Duta" },
            { icon: <Users className="h-5 w-5" />, n: "∞", l: "Teman Terinspirasi" },
          ].map((s) => (
            <div key={s.l} className="card-pop rounded-3xl border-2 border-fez-ink bg-white p-4 text-center sticker-sm">
              <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-fez-rose/10 text-fez-rose">{s.icon}</div>
              <p className="font-display text-3xl font-extrabold text-fez-ink">{s.n}</p>
              <p className="text-xs font-bold text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= KENALI ANEMIA (FAQ) ================= */}
      <section id="kenali" className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fez-ink sm:text-4xl">
            Kenali Anemia, <span className="text-gradient-iron">Tangkal Dari Sekarang!</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Lima hal penting yang wajib kamu tahu sebelum memulai misi.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {infoItems.map((it, i) => (
            <motion.div
              key={it.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
              className={`card-pop rounded-3xl border-2 border-fez-ink bg-white p-5 ${i === 4 ? "md:col-span-2" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-12 w-12 shrink-0 rotate-[-4deg] items-center justify-center rounded-2xl border-2 border-fez-ink ${it.color} text-2xl sticker-sm`}>
                  {it.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-fez-ink">{it.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fez-ink/75">{it.a}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= PERJALANAN DUTA ================= */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fez-ink sm:text-4xl">Perjalananmu Menjadi Duta</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Bukan sekadar membaca — ini petualangan lengkap dengan misi, XP, badge, dan leaderboard!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="card-pop relative rounded-3xl border-2 border-fez-ink bg-white p-4 text-center"
            >
              <span className="absolute -left-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-fez-ink bg-fez-sun font-display text-xs font-extrabold text-fez-ink">
                {i + 1}
              </span>
              <p className="text-4xl">{s.icon}</p>
              <p className="mt-2 font-display text-base font-extrabold text-fez-ink">{s.t}</p>
              <p className="text-[11px] text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>

        {/* Level */}
        <div className="mt-10 rounded-[2rem] border-2 border-fez-ink bg-gradient-to-br from-violet-50 to-rose-50 p-6">
          <h3 className="mb-4 text-center font-display text-xl font-extrabold text-fez-ink">
            Naik 5 Level: dari 🌱 hingga 👑
          </h3>
          <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3">
            {LEVELS.map((lv, i) => (
              <div key={lv.level} className="flex items-center gap-2 sm:gap-3">
                <div className="w-32 rounded-2xl border-2 border-fez-ink bg-white p-3 text-center card-pop">
                  <p className="text-2xl">{lv.icon}</p>
                  <p className="text-[10px] font-bold uppercase text-fez-rose">Level {lv.level}</p>
                  <p className="font-display text-sm font-extrabold leading-tight text-fez-ink">{lv.name}</p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{lv.minXp}+ XP</p>
                </div>
                {i < LEVELS.length - 1 && <ArrowRight className="hidden h-4 w-4 text-fez-rose sm:block" />}
              </div>
            ))}
          </div>
        </div>

        {/* Badge preview */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {BADGES.map((b) => (
            <div key={b.key} className="card-pop flex items-center gap-2 rounded-full border-2 border-fez-ink bg-white py-1.5 pl-1.5 pr-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-xl" style={{ background: b.color + "25" }}>
                {b.icon}
              </span>
              <span className="text-sm font-extrabold text-fez-ink">{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= EDUKASI PREVIEW ================= */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fez-ink">Materi Edukasi Seru</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">7 kategori pengetahuan yang bikin kamu makin paham anemia & TTD.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {EDUKASI.map((cat) => (
            <div key={cat.key} className="card-pop rounded-3xl border-2 border-fez-ink bg-white p-4">
              <p className="text-3xl">{cat.icon}</p>
              <p className="mt-1.5 font-display text-sm font-extrabold text-fez-ink">{cat.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{cat.subtitle}</p>
            </div>
          ))}
          <div className="card-pop flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-fez-rose bg-rose-50 p-4 text-center">
            <p className="font-display text-sm font-extrabold text-fez-rose">+ 9 Misi</p>
            <p className="mt-0.5 text-[11px] text-fez-ink/60">Quiz, game, tracker & tantangan!</p>
          </div>
        </div>
      </section>

      {/* ================= TOP 3 LEADERBOARD (PUBLIK) ================= */}
      <section id="leaderboard" className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fez-ink sm:text-4xl">
            🏆 <span className="text-gradient-iron">Top 3 Duta Fe-Zone</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Peringkat teratas jalur SMP &amp; SMA — dihitung dari total XP misi, quiz, check-in TTD, dan konten
            edukasi. Ketuk untuk melihat profil publik mereka!
          </p>
        </div>
        <TopDutaPreview onOpenProfile={setProfileId} />
        <div className="mt-6 text-center">
          <Button
            onClick={() => { setAuthMode("register"); setView("auth"); }}
            className="h-12 rounded-2xl border-2 border-fez-ink bg-white px-6 font-extrabold text-fez-ink shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33]"
          >
            <Trophy className="mr-2 h-5 w-5 text-fez-rose" /> Daftar &amp; Rebut Podium!
          </Button>
        </div>
      </section>

      {/* ================= FE-ZONE COMMUNITY (PUBLIK) ================= */}
      <section id="community" className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fez-ink sm:text-4xl">
            🌟 <span className="text-gradient-iron">Fe-Zone Community</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Inspirasi Pejuang Fe-Zone — video Peer Educator &amp; konten edukasi buatan peserta yang sudah disetujui
            admin. Tonton, beri Like, dan tunjukkan dukunganmu! ❤️
          </p>
        </div>
        <CommunityFeed onOpenProfile={setProfileId} limit={8} />
        <div className="mt-5 text-center">
          <Button
            onClick={() => { setAuthMode("register"); setView("auth"); }}
            className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-6 font-extrabold text-white"
          >
            <Rocket className="mr-2 h-5 w-5" /> Gabung &amp; Buat Kontenmu Sendiri
          </Button>
        </div>
      </section>

      {/* ================= CTA PENUTUP ================= */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="bg-hero-blob relative overflow-hidden rounded-[2.5rem] border-2 border-fez-ink bg-white p-8 text-center shadow-[8px_8px_0_0_#4a1d33] sm:p-12">
          <p className="text-5xl">🩸✨</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-fez-ink sm:text-4xl">
            Sudah siap menjadi bagian dari <span className="text-gradient-iron">generasi bebas anemia?</span>
          </h2>
          <div className="mx-auto mt-4 max-w-md space-y-1 text-sm font-semibold text-fez-ink/75">
            <p>Mulai dari dirimu.</p>
            <p>Kenali anemia. Rutin konsumsi TTD sesuai anjuran.</p>
            <p>Ajak temanmu. Jadilah <span className="font-extrabold text-fez-rose">Duta Fe-Zone!</span></p>
          </div>
          <Button
            onClick={() => { setAuthMode("register"); setView("auth"); }}
            className="mt-6 h-14 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 px-8 text-lg font-extrabold text-white shadow-[5px_5px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#4a1d33]"
          >
            <Crown className="mr-2 h-5 w-5" /> MULAI MISSION
          </Button>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto border-t-2 border-fez-ink/10 bg-white/60 py-8 pb-6 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <DinkesFooter />
          <p className="mt-3 font-display text-lg font-extrabold text-fez-ink">FE-ZONE — Duta Remaja Putri Bebas Anemia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Program inovasi gizi masyarakat · &ldquo;Kenali Anemia, Rutin Minum TTD, Jadi Inspirasi!&rdquo;
          </p>
          <p className="mx-auto mt-3 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Konten edukasi bersifat informatif dan bukan pengganti konsultasi tenaga kesehatan. Konsumsi TTD tetap
            mengikuti anjuran petugas kesehatan/sekolah.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="ghost" onClick={() => setView("admin")} className="h-8 text-xs font-bold text-fez-ink/50 hover:text-fez-rose">
              Login Admin
            </Button>
          </div>
          <div className="mt-4 border-t border-fez-ink/5 pt-3">
            <SiteCredit />
          </div>
        </div>
      </footer>

      <PublicProfileModal participantId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
}
