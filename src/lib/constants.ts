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
  { key: "ANEMIA_FIGHTER", name: "Anemia Fighter", icon: "🩸", color: "#E11D48", how: "Selesaikan Mission 1 — Kenali Musuhmu" },
  { key: "TTD_CHAMPION", name: "TTD Champion", icon: "💊", color: "#8B5CF6", how: "Selesaikan Mission 2 — Kenali Senjatamu" },
  { key: "IRON_FOOD_HUNTER", name: "Iron Food Hunter", icon: "🥗", color: "#10B981", how: "Selesaikan Mission 4 — Iron Food Hunt" },
  { key: "PEER_EDUCATOR", name: "Peer Educator", icon: "📢", color: "#F59E0B", how: "Selesaikan Mission 7 — Spread the Fe-Zone" },
  { key: "CONSISTENCY_QUEEN", name: "Consistency Queen", icon: "🔥", color: "#F43F5E", how: "Raih streak 4 minggu konsisten minum TTD" },
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
    desc: "Baca materi edukasi tentang anemia, lalu buktikan pemahamanmu lewat quiz. Lulus dan raih badge ANEMIA FIGHTER!",
  },
  {
    key: "M2", title: "Kenali Senjata Melawan Anemia", short: "TTD Check", icon: "💊", xp: 100, color: "#8B5CF6", type: "QUIZ",
    desc: "Pelajari segala hal tentang Tablet Tambah Darah (TTD): manfaat, cara konsumsi, sampai mitos & fakta. Lalu taklukkan quiz-nya!",
  },
  {
    key: "M3", title: "TTD Tracker", short: "TTD Tracker", icon: "📅", xp: 50, color: "#0D9488", type: "TRACKER",
    desc: "Catat konsumsi TTD-mu secara rutin di TTD Tracker. Setiap check-in memberi +10 XP. Selesaikan 2 check-in untuk menamatkan misi ini!",
  },
  {
    key: "M4", title: "Iron Food Hunt", short: "Iron Food Hunt", icon: "🥗", xp: 100, color: "#10B981", type: "GAME",
    desc: "Mini game berburu makanan sumber zat besi! Pilih semua makanan yang kaya zat besi dari lautan pilihan.",
  },
  {
    key: "M5", title: "Menu Bebas Anemia", short: "Menu Sehatku", icon: "🍱", xp: 150, color: "#84CC16", type: "MENU",
    desc: "Susun menu makan sehari pilihanmu! Dapatkan feedback edukatif tentang kombinasi menu bebas anemia.",
  },
  {
    key: "M6", title: "Mitos atau Fakta", short: "Mitos/Fakta", icon: "🧠", xp: 100, color: "#F59E0B", type: "MYTH",
    desc: "Uji nalar logismu! Tebak 10 pernyataan seputar anemia dan TTD: mitos atau fakta?",
  },
  {
    key: "M7", title: "Spread the Fe-Zone", short: "Edukasi 3 Teman", icon: "📢", xp: 200, color: "#F43F5E", type: "SHARE",
    desc: "Bagikan materi edukasi ke minimal 3 teman lewat tombol SHARE EDUKASI (Instagram, TikTok, YouTube, WhatsApp, Copy Link). Setiap share tercatat otomatis!",
  },
  {
    key: "M8", title: "Peer Educator Fe-Zone", short: "Video Edukasi", icon: "🎬", xp: 100, color: "#06B6D4", type: "VIDEO",
    desc: "Buat video edukasi 30–60 detik dari YouTube, Instagram, atau TikTok — atau upload langsung. Setiap video yang disetujui admin = +100 XP. Bisa dikirim berkali-kali!",
  },
  {
    key: "M9", title: "Iron Streak", short: "Streak Konsisten", icon: "🔥", xp: 150, color: "#EF4444", type: "STREAK",
    desc: "Jaga konsistensi! Capai streak check-in TTD 4 minggu berturut-turut dan raih badge CONSISTENCY QUEEN.",
  },
];

export const missionByKey = (key: string) => MISSIONS.find((m) => m.key === key);

// Misi yang wajib selesai sebelum post-test dibuka (misi selain tracker/streak/video-admin)
export const CORE_MISSIONS = ["M1", "M2", "M4", "M5", "M6", "M7"];

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
  M3_COMPLETE_BONUS: 50,
  PRETEST: 50,
  POSTTEST: 150,
  REGISTER: 0,
  FINAL_QUIZ: 100,
  DUTA_COMPLETE: 200,
};

export const PASS_SCORE = 70; // nilai minimal kelulusan quiz misi
