// ============================================================
// FE-ZONE — Konstanta inti gamifikasi
// ============================================================

export type EducationLevel = "SMP" | "SMA";

export interface LevelDef {
  level: number;
  name: string;
  icon: string;
  minXp: number;
  color: string;
  desc: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: "Kenali Anemia", icon: "🌱", minXp: 0, color: "#34D399", desc: "Mulai perjalananmu mengenal anemia." },
  { level: 2, name: "Pejuang TTD", icon: "💊", minXp: 250, color: "#F472B6", desc: "Kamu kenal senjatanya dan siap bertempur!" },
  { level: 3, name: "Sahabat Zat Besi", icon: "🥗", minXp: 600, color: "#FBBF24", desc: "Pilihan makananmu makin cerdas." },
  { level: 4, name: "Agen Bebas Anemia", icon: "📢", minXp: 1000, color: "#FB7185", desc: "Kamu mulai menyebarkan misi ke teman-temanmu." },
  { level: 5, name: "Duta Fe-Zone", icon: "👑", minXp: 1500, color: "#E11D48", desc: "Puncak perjalanan! Kamu panutan bagi yang lain." },
];

export function getLevel(xp: number): LevelDef {
  let current = LEVELS[0];
  for (const lv of LEVELS) if (xp >= lv.minXp) current = lv;
  return current;
}

export function getNextLevel(xp: number): LevelDef | null {
  return LEVELS.find((lv) => lv.minXp > xp) ?? null;
}

export function levelProgress(xp: number): { pct: number; current: LevelDef; next: LevelDef | null } {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return { pct: 100, current, next: null };
  const span = next.minXp - current.minXp;
  const done = xp - current.minXp;
  return { pct: Math.min(100, Math.round((done / span) * 100)), current, next };
}

// ------------------------------------------------------------
// Badge
// ------------------------------------------------------------
export interface BadgeDef {
  key: string;
  name: string;
  icon: string;
  color: string;
  how: string;
}

export const BADGES: BadgeDef[] = [
  { key: "ANEMIA_FIGHTER", name: "Anemia Fighter", icon: "🩸", color: "#E11D48", how: "Lulus Mission 1 — Kenali Musuhmu (nilai ≥80)" },
  { key: "TTD_CHAMPION", name: "TTD Champion", icon: "💊", color: "#8B5CF6", how: "Lulus Mission 3 — Kenali Senjata Melawan Anemia (nilai ≥80)" },
  { key: "IRON_FOOD_HUNTER", name: "Iron Food Hunter", icon: "🥗", color: "#10B981", how: "Lulus Mission 4 — Iron Food Hunt" },
  { key: "PEER_EDUCATOR", name: "Peer Educator", icon: "📢", color: "#F59E0B", how: "Lulus Mission 7 — Spread the Fe-Zone (share WA ke 5 teman)" },
  { key: "CONSISTENCY_QUEEN", name: "Consistency Queen", icon: "🔥", color: "#F43F5E", how: "Raih streak 4 minggu konsisten minum TTD (bonus +20 XP)" },
  { key: "DUTA_BESI", name: "Duta Fe-Zone", icon: "👑", color: "#D97706", how: "Menang Final Duta Challenge & terpilih sebagai Duta" },
];

export const badgeByKey = (key: string) => BADGES.find((b) => b.key === key);

// ------------------------------------------------------------
// Mission
// ------------------------------------------------------------
export interface MissionDef {
  key: string;
  title: string;
  short: string;
  icon: string;
  xp: number;
  color: string;
  desc: string;
  type: "QUIZ" | "TRACKER" | "GAME" | "MENU" | "MYTH" | "SHARE" | "VIDEO" | "STREAK";
}

export const MISSIONS: MissionDef[] = [
  {
    key: "M1", title: "Kenali Musuhmu", short: "Kenali Anemia", icon: "🩸", xp: 100, color: "#E11D48", type: "QUIZ",
    desc: "Baca materi edukasi tentang anemia, lalu buktikan pemahamanmu lewat quiz. Nilai ≥80 = LULUS — XP sesuai skormu!",
  },
  {
    key: "M2", title: "TTD Tracker", short: "TTD Tracker", icon: "📅", xp: 10, color: "#0D9488", type: "TRACKER",
    desc: "Terbuka sejak hari pertama! Check-in 1× per minggu setelah minum TTD: setiap check-in valid +10 XP. Konsisten ya!",
  },
  {
    key: "M3", title: "Kenali Senjata Melawan Anemia", short: "Kenali TTD", icon: "💊", xp: 100, color: "#8B5CF6", type: "QUIZ",
    desc: "Terbuka setelah Mission 1 LULUS. Pelajari segala hal tentang Tablet Tambah Darah (TTD), lalu taklukkan quiz-nya (nilai ≥80)!",
  },
  {
    key: "M4", title: "Iron Food Hunt", short: "Iron Food Hunt", icon: "🥗", xp: 100, color: "#10B981", type: "GAME",
    desc: "Terbuka setelah Mission 3 LULUS. Mini game berburu makanan sumber zat besi! Raih nilai ≥80 untuk membuka misi berikutnya.",
  },
  {
    key: "M5", title: "Menu Bebas Anemia", short: "Menu Sehatku", icon: "🍱", xp: 150, color: "#84CC16", type: "MENU",
    desc: "Terbuka setelah Mission 4 LULUS. Susun menu makan sehari pilihanmu! Nilai menu ≥80 = lulus & misi berikutnya terbuka.",
  },
  {
    key: "M6", title: "Mitos atau Fakta", short: "Mitos/Fakta", icon: "🧠", xp: 100, color: "#F59E0B", type: "MYTH",
    desc: "Terbuka setelah Mission 5 LULUS. Uji nalar logismu! Tebak 12 pernyataan seputar anemia dan TTD — nilai ≥80 untuk lulus.",
  },
  {
    key: "M7", title: "Spread the Fe-Zone", short: "Share ke 5 Teman", icon: "📢", xp: 200, color: "#F43F5E", type: "SHARE",
    desc: "Terbuka setelah Mission 6 LULUS. Bagikan materi edukasi ke 5 teman lewat WhatsApp. Progress 0/5 — setiap share tercatat otomatis!",
  },
  {
    key: "M8", title: "Peer Educator Fe-Zone", short: "Video Edukasi", icon: "🎬", xp: 300, color: "#06B6D4", type: "VIDEO",
    desc: "Terbuka setelah Mission 7 LULUS. Buat video edukasi 30–60 detik (YouTube/Instagram/TikTok/upload). Bisa berkali-kali — setiap video yang DISAPPROVE admin diberi XP oleh admin (maks +300 XP/video).",
  },
  {
    key: "M9", title: "Iron Streak", short: "Streak Konsisten", icon: "🔥", xp: 20, color: "#EF4444", type: "STREAK",
    desc: "Terbuka setelah Mission 8 LULUS. Capai 4 check-in TTD berturut-turut (1×/minggu) = BONUS +20 XP sekali per periode bulan + badge CONSISTENCY QUEEN.",
  },
];

export const missionByKey = (key: string) => MISSIONS.find((m) => m.key === key);

// Urutan unlock: misi berikutnya hanya terbuka jika misi sebelumnya di rantai LULUS.
// M1 & M2 terbuka sejak awal (M2 = TTD Tracker di luar rantai).
export const UNLOCK_CHAIN = ["M1", "M3", "M4", "M5", "M6", "M7", "M8", "M9"] as const;
export const ALWAYS_OPEN_MISSIONS = ["M1", "M2"];

export function prevMissionInChain(missionKey: string): string | null {
  const idx = UNLOCK_CHAIN.indexOf(missionKey as (typeof UNLOCK_CHAIN)[number]);
  if (idx <= 0) return null;
  return UNLOCK_CHAIN[idx - 1];
}

// Misi konten yang wajib selesai sebelum post-test dibuka
export const CORE_MISSIONS = ["M1", "M3", "M4", "M5", "M6", "M7"];

// ------------------------------------------------------------
// Duta scoring (bobot penilaian Duta)
// ------------------------------------------------------------
export const DUTA_WEIGHTS = {
  knowledge: { label: "Pengetahuan (Post-Test)", pct: 25 },
  missions: { label: "Konsistensi Misi", pct: 20 },
  ttd: { label: "Aktivitas TTD Tracker", pct: 20 },
  peer: { label: "Edukasi Sebaya", pct: 15 },
  creativity: { label: "Kreativitas (Video)", pct: 10 },
  activity: { label: "Keaktifan", pct: 10 },
} as const;

// ------------------------------------------------------------
// XP bonus events
// ------------------------------------------------------------
export const XP_RULES = {
  CHECKIN: 10,
  PRETEST: 50,
  POSTTEST: 150,
  REGISTER: 0,
  FINAL_QUIZ: 100,
  DUTA_COMPLETE: 200,
  STREAK_BONUS: 20, // M9 — 4 check-in berturut-turut dalam 1 bulan (sekali per periode)
};

export const SPREAD_TARGET = 5; // M7 — share edukasi via WhatsApp ke 5 teman
export const PEER_VIDEO_MAX_XP = 300; // M8 — maks XP per video yang ditetapkan admin
export const PASS_SCORE = 80; // nilai minimal kelulusan quiz/misi (>= 80 = LULUS)
