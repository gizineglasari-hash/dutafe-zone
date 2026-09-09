"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useRef } from "react";
import { LEVELS, badgeByKey, type BadgeDef } from "@/lib/constants";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// ------------------------------------------------------------
// Confetti
// ------------------------------------------------------------
export function Confetti({ n = 26 }: { n?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        left: `${(i * 100) / n + Math.random() * 6}%`,
        delay: Math.random() * 0.5,
        color: ["#e11d48", "#f472b6", "#fbbf24", "#34d399", "#0d9488", "#d946ef"][i % 6],
        rot: Math.random() * 360,
      })),
    [n]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Celebration modal — MISSION COMPLETED!
// ------------------------------------------------------------
export function CelebrationModal() {
  const { celebrating, closeCelebrate } = useFez();
  const badge: BadgeDef | null = celebrating?.badge ? badgeByKey(celebrating.badge) ?? null : null;

  return (
    <AnimatePresence>
      {celebrating?.show && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#4a1d33]/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCelebrate}
        >
          <motion.div
            className="relative w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl overflow-hidden"
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Confetti />
            <button
              onClick={closeCelebrate}
              className="absolute right-4 top-4 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-muted/70 z-10"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pulse-soft mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100 text-6xl">
              {badge ? badge.icon : "🎉"}
            </div>
            <h3 className="font-display text-3xl font-extrabold text-gradient-iron">MISSION COMPLETED!</h3>
            <p className="mt-2 text-lg font-semibold text-fez-ink">{celebrating.title}</p>
            {badge && (
              <div className="pop-in mx-auto mt-3 inline-flex items-center gap-2 rounded-full border-2 border-fez-ink bg-amber-100 px-4 py-1.5 text-sm font-bold text-fez-ink sticker-sm">
                <span className="text-lg">{badge.icon}</span> Badge: {badge.name}
              </div>
            )}
            {celebrating.xp > 0 && (
              <div className="mt-4 inline-block rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-2 font-display text-2xl font-extrabold text-white shadow-lg">
                +{celebrating.xp} XP
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">Makin dekat jadi Duta Fe-Zone! Terus semangat, Pejuang Fe-Zone 💪</p>
            <Button onClick={closeCelebrate} className="mt-5 h-12 w-full rounded-2xl bg-fez-rose text-base font-bold hover:bg-fez-berry">
              Lanjut Petualangan →
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------
// XP animated counter
// ------------------------------------------------------------
export function XpCounter({ xp, className = "" }: { xp: number; className?: string }) {
  const [display, setDisplay] = useState(xp);
  const prev = useRef(xp);
  useEffect(() => {
    const start = prev.current;
    const diff = xp - start;
    if (diff === 0) return;
    const dur = 700;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = xp;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [xp]);
  return <span className={className}>{display.toLocaleString("id-ID")}</span>;
}

// ------------------------------------------------------------
// Level chip & progress menuju level berikutnya
// ------------------------------------------------------------
export function LevelChip({ xp }: { xp: number }) {
  const current = LEVELS.slice().reverse().find((l) => xp >= l.minXp)!;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-fez-ink px-3 py-1 text-xs font-extrabold text-fez-ink sticker-sm"
      style={{ background: current.color + "33" }}
    >
      <span>{current.icon}</span> Level {current.level} · {current.name}
    </span>
  );
}

export function LevelProgressBar({ xp }: { xp: number }) {
  const next = LEVELS.find((l) => l.minXp > xp);
  const current = LEVELS.slice().reverse().find((l) => xp >= l.minXp)!;
  let pct = 100;
  if (next) {
    const span = next.minXp - current.minXp;
    pct = Math.min(100, Math.round(((xp - current.minXp) / span) * 100));
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-fez-ink/70">
        <span>
          {current.icon} {current.name}
        </span>
        <span>{next ? `${next.icon} ${next.name} · ${next.minXp - xp} XP lagi` : "MAX LEVEL 👑"}</span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-full bg-rose-100/80 border border-rose-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      {next && <p className="mt-1 text-[11px] text-muted-foreground">Progress menuju Level {next.level}</p>}
    </div>
  );
}

// ------------------------------------------------------------
// Progress bar generik
// ------------------------------------------------------------
export function ProgressBar({ pct, className = "", barClass = "bg-gradient-to-r from-rose-500 to-amber-400" }: { pct: number; className?: string; barClass?: string }) {
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-rose-100/80 border border-rose-200 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${barClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Avatar peserta: foto profil (lingkaran) atau emoji default
// ------------------------------------------------------------
export function UserAvatar({
  photoUrl, avatar, size = 40, className = "", ring = true,
}: { photoUrl?: string | null; avatar?: string; size?: number; className?: string; ring?: boolean }) {
  const style: React.CSSProperties = { width: size, height: size };
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="Foto profil"
        style={style}
        className={`shrink-0 rounded-full object-cover ${ring ? "border-2 border-fez-ink" : ""} ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.55 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100 ${ring ? "border-2 border-fez-ink" : ""} ${className}`}
    >
      {avatar || "🌸"}
    </span>
  );
}

// ------------------------------------------------------------
// Section heading dengan gaya scrapbook
// ------------------------------------------------------------
export function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 rotate-[-4deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-amber-200 text-2xl sticker-sm">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-2xl font-extrabold leading-tight text-fez-ink sm:text-3xl">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Badge visual (aktif vs terkunci)
// ------------------------------------------------------------
export function BadgeVisual({ def, earned }: { def: BadgeDef; earned: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-3xl border-2 p-5 text-center transition ${
        earned
          ? "border-fez-ink bg-white shadow-[0_8px_24px_-10px_rgba(157,23,77,0.35)] card-pop"
          : "border-gray-300 bg-gray-50 opacity-70"
      }`}
    >
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] text-4xl ${
          earned ? "pulse-soft" : "grayscale"
        }`}
        style={earned ? { background: def.color + "22", borderColor: def.color } : { background: "#eee", borderColor: "#bbb" }}
      >
        {earned ? def.icon : "🔒"}
      </div>
      <p className={`font-display text-base font-extrabold ${earned ? "text-fez-ink" : "text-gray-400"}`}>
        {earned ? def.name : "Belum Terbuka"}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">{def.how}</p>
      {earned && (
        <span className="absolute -right-2 -top-2 rounded-full border-2 border-fez-ink bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold text-fez-ink sticker-sm">
          SIAP!
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Identitas Dinas Kesehatan Kota Bandung — hanya logo resmi hasil
// unggahan admin (teks identitas sudah tertulis di dalam logo itu sendiri)
// + credit pembuat — dipakai di footer semua halaman
// ------------------------------------------------------------
export function DinkesFooter({ compact = false }: { compact?: boolean }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/public/hero")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive) setLogo(d.dinkesLogoUrl ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {logo ? (
        <img
          src={logo}
          alt="Logo Dinas Kesehatan Kota Bandung"
          className={compact ? "h-12 w-auto rounded-lg object-contain" : "h-20 w-auto rounded-xl border-2 border-fez-ink/15 bg-white object-contain p-1.5"}
        />
      ) : (
        <span className={`flex items-center justify-center rounded-lg border-2 border-dashed border-fez-ink/20 bg-white/60 ${compact ? "h-9 w-9 text-sm" : "h-14 w-14 text-2xl"}`} aria-hidden>
          🏥
        </span>
      )}
    </div>
  );
}

export function SiteCredit() {
  return (
    <p className="select-none text-center text-[10px] font-semibold tracking-wide text-fez-ink/35">
      created by: rahmadianiputri
    </p>
  );
}
