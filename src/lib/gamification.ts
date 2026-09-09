import { db } from "@/lib/db";
import { ALWAYS_OPEN_MISSIONS, getLevel, missionByKey, prevMissionInChain, UNLOCK_CHAIN, XP_RULES } from "@/lib/constants";

// ------------------------------------------------------------
// Award XP + auto level (dipanggil di server)
// XP dihitung SERVER-SIDE — nilai dari frontend tidak dipercaya.
// ------------------------------------------------------------
export async function awardXp(participantId: string, amount: number, type: string, meta?: string) {
  if (amount === 0) return;
  const p = await db.participant.update({
    where: { id: participantId },
    data: { xp: { increment: amount } },
  });
  await db.activityLog.create({
    data: { participantId, type: "XP", meta: JSON.stringify({ amount, type, meta, total: p.xp }) },
  });
  return p.xp;
}

export async function awardBadge(participantId: string, badgeKey: string): Promise<boolean> {
  const existing = await db.participantBadge.findUnique({
    where: { participantId_badgeKey: { participantId, badgeKey } },
  });
  if (existing) return false;
  await db.participantBadge.create({ data: { participantId, badgeKey } });
  await db.activityLog.create({
    data: { participantId, type: "BADGE", meta: badgeKey },
  });
  return true;
}

export async function getMissionProgress(participantId: string, missionKey: string) {
  let mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId, missionKey } },
  });
  if (!mp) {
    mp = await db.missionProgress.create({
      data: { participantId, missionKey, status: defaultStatus(missionKey) },
    });
  }
  return mp;
}

// M1 & M2 (TTD Tracker) terbuka sejak awal; sisanya terkunci sampai misi sebelumnya di rantai LULUS.
function defaultStatus(missionKey: string): string {
  return ALWAYS_OPEN_MISSIONS.includes(missionKey) ? "STARTED" : "LOCKED";
}

// ------------------------------------------------------------
// Unlock berantai (server-side source of truth, dari database).
// Misi X terbuka ⇔ X ∈ {M1, M2} ATAU misi sebelumnya di UNLOCK_CHAIN berstatus COMPLETED.
// Bersifat monoton: status COMPLETED tidak pernah kembali — jadi aman dipanggil berkali-kali.
// ------------------------------------------------------------
export async function isMissionUnlocked(participantId: string, missionKey: string): Promise<boolean> {
  if (ALWAYS_OPEN_MISSIONS.includes(missionKey)) return true;
  const prev = prevMissionInChain(missionKey);
  if (!prev) return true;
  const mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId, missionKey: prev } },
    select: { status: true },
  });
  return mp?.status === "COMPLETED";
}

export async function assertMissionUnlocked(participantId: string, missionKey: string): Promise<boolean> {
  return isMissionUnlocked(participantId, missionKey);
}

// Sinkronkan status LOCKED → STARTED untuk misi yang sudah boleh dibuka.
export async function syncMissionUnlocks(participantId: string) {
  for (const key of UNLOCK_CHAIN) {
    if (ALWAYS_OPEN_MISSIONS.includes(key)) continue;
    const unlocked = await isMissionUnlocked(participantId, key);
    if (!unlocked) break; // rantai berurutan — kalau satu terkunci, sisanya pasti terkunci
    const mp = await getMissionProgress(participantId, key);
    if (mp.status === "LOCKED") {
      await db.missionProgress.update({ where: { id: mp.id }, data: { status: "STARTED" } });
    }
  }
}

// ------------------------------------------------------------
// completeMission — menandai misi COMPLETED sekali (idempotent).
// xpOverride:
//   - angka  → XP yang diberikan SEKALI saat pertama lulus (mis. reward × skor/100)
//   - null   → tanpa XP dari mekanisme ini (XP diberikan jalur lain, mis. check-in/bonus/admin)
//   - undefined → gunakan def.xp misi (perilaku lama)
// ------------------------------------------------------------
export async function completeMission(
  participantId: string,
  missionKey: string,
  opts?: { dataJson?: string; score?: number; xpOverride?: number | null }
) {
  const mp = await getMissionProgress(participantId, missionKey);
  if (mp.status === "COMPLETED") {
    // Sudah pernah lulus & sudah pernah di-reward — jangan berikan XP lagi (idempotent).
    return { already: true as const, xpAwarded: 0 };
  }

  let xp = 0;
  const def = missionByKey(missionKey);
  if (opts?.xpOverride !== undefined) {
    xp = opts.xpOverride === null ? 0 : Math.max(0, Math.round(opts.xpOverride));
  } else {
    xp = def?.xp ?? 0;
  }

  await db.missionProgress.update({
    where: { id: mp.id },
    data: {
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date(),
      score: opts?.score ?? mp.score ?? null,
      xpAwarded: xp,
      dataJson: opts?.dataJson ?? mp.dataJson,
    },
  });
  if (xp > 0) await awardXp(participantId, xp, "MISSION_DONE", missionKey);
  await db.activityLog.create({
    data: { participantId, type: "MISSION_DONE", meta: missionKey },
  });
  return { already: false as const, xpAwarded: xp };
}

export async function startMission(participantId: string, missionKey: string) {
  // Validasi server-side: misi terkunci tidak boleh dimulai (anti manipulasi API).
  const unlocked = await isMissionUnlocked(participantId, missionKey);
  if (!unlocked) return false;
  const mp = await getMissionProgress(participantId, missionKey);
  if (mp.status === "LOCKED") {
    await db.missionProgress.update({ where: { id: mp.id }, data: { status: "STARTED", progress: 5 } });
  }
  return true;
}

export function countCompleted(rows: { missionKey: string; status: string }[]): number {
  return rows.filter((r) => r.status === "COMPLETED").length;
}

// ------------------------------------------------------------
// Streak mingguan (minggu mulai Senin, ISO)
// ------------------------------------------------------------
export function isoWeekStart(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // Senin = 1 ... Minggu = 7
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

export function monthKeyJakarta(d = new Date()): string {
  // Periode bulan (zona WIB) untuk kunci bonus streak — format YYYY-MM
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
}

export function computeWeeklyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map((d) => isoWeekStart(new Date(d + "T12:00:00"))));
  const sorted = Array.from(weeks).sort().reverse(); // terbaru dulu
  const thisWeek = isoWeekStart(new Date());
  const lastWeek = isoWeekStart(new Date(Date.now() - 7 * 24 * 3600 * 1000));

  let streak = 0;
  if (sorted[0] === thisWeek || sorted[0] === lastWeek) {
    streak = 1;
    let cursor = new Date(sorted[0] + "T12:00:00Z");
    for (let i = 1; i < sorted.length; i++) {
      const expected = new Date(cursor.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      if (sorted[i] === expected) {
        streak++;
        cursor = new Date(expected + "T12:00:00Z");
      } else break;
    }
  }
  return streak;
}

export async function refreshStreak(participantId: string) {
  const checkins = await db.tTDCheckIn.findMany({
    where: { participantId },
    select: { date: true },
    orderBy: { date: "desc" },
  });
  const dates = checkins.map((c) => c.date);
  const streak = computeWeeklyStreak(dates);
  const last = dates.length > 0 ? dates[0] : null;
  await db.participant.update({
    where: { id: participantId },
    data: { streakWeeks: streak, lastCheckIn: last },
  });
  return streak;
}

// ------------------------------------------------------------
// Misi berbasis tracker/streak (M2 TTD Tracker & M9 Iron Streak)
// Dipanggil setelah check-in & saat dashboard/missions dibuka — sepenuhnya idempotent.
// M2: selesai pada 2 check-in (tanpa XP tambahan — XP hanya +10/check-in).
// M9: streak 4 minggu → bonus +20 XP SEKALI per periode bulan (kunci: activityLog STREAK_BONUS:YYYY-MM).
// ------------------------------------------------------------
export async function checkTrackerMissions(participantId: string) {
  const checkins = await db.tTDCheckIn.findMany({ where: { participantId }, select: { date: true } });
  const streak = computeWeeklyStreak(checkins.map((c) => c.date));

  // M2 — TTD Tracker: 2 check-in pertama menamatkan misi (XP check-in sudah diberikan terpisah)
  const m2 = await getMissionProgress(participantId, "M2");
  if (m2.status !== "COMPLETED" && checkins.length >= 2) {
    await completeMission(participantId, "M2", { xpOverride: null, dataJson: JSON.stringify({ checkins: checkins.length }) });
  } else if (m2.status === "LOCKED" && checkins.length > 0) {
    await db.missionProgress.update({ where: { id: m2.id }, data: { status: "STARTED", progress: Math.min(90, checkins.length * 40) } });
  } else if (m2.status === "STARTED") {
    const pct = Math.min(90, checkins.length * 40);
    if (pct > m2.progress) {
      await db.missionProgress.update({ where: { id: m2.id }, data: { progress: pct } });
    }
  }

  // M9 — Iron Streak: bonus +20 XP sekali per bulan yang memenuhi syarat (streak ≥ 4 minggu)
  const m9 = await getMissionProgress(participantId, "M9");
  const streakBonusMonth = monthKeyJakarta();
  let streakBonusAwarded = false;

  if (streak >= 4) {
    // Cek apakah bonus bulan ini sudah pernah diberikan (idempotent, tahan refresh)
    const existingBonus = await db.activityLog.findFirst({
      where: { participantId, type: "STREAK_BONUS", meta: streakBonusMonth },
    });
    if (!existingBonus) {
      await awardXp(participantId, XP_RULES.STREAK_BONUS, "STREAK_BONUS", streakBonusMonth);
      await db.activityLog.create({
        data: { participantId, type: "STREAK_BONUS", meta: streakBonusMonth },
      });
      streakBonusAwarded = true;
    }
    if (m9.status !== "COMPLETED") {
      await completeMission(participantId, "M9", { xpOverride: null });
      await awardBadge(participantId, "CONSISTENCY_QUEEN");
    }
  } else if (m9.status !== "COMPLETED" && streak > 0) {
    await db.missionProgress.update({ where: { id: m9.id }, data: { status: "STARTED", progress: Math.min(90, streak * 25) } });
  }

  return { streak, checkins: checkins.length, streakBonusAwarded };
}

// ------------------------------------------------------------
// Skor Duta (bobot sesuai spesifikasi)
// ------------------------------------------------------------
export interface DutaScore {
  knowledge: number; missions: number; ttd: number; peer: number; creativity: number; activity: number;
  total: number;
}

export async function computeDutaScore(participantId: string): Promise<DutaScore> {
  const p = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      missionProgress: true,
      ttdCheckIns: true,
      activityLogs: true,
      videoSubmissions: { where: { status: "GRADED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!p) return { knowledge: 0, missions: 0, ttd: 0, peer: 0, creativity: 0, activity: 0, total: 0 };

  const knowledge = Math.round((p.postTestScore ?? 0)); // 0-100

  const doneCount = p.missionProgress.filter((m) => m.status === "COMPLETED").length;
  const missions = Math.round((doneCount / 9) * 100);

  const checkins = p.ttdCheckIns.length;
  const ttd = Math.min(100, Math.round((checkins / 12) * 100)); // 12 check-in = penuh

  // Peer education: dari data mission M7 (jumlah share) atau activity SHARE
  const m7 = p.missionProgress.find((m) => m.missionKey === "M7");
  let friends = 0;
  if (m7?.dataJson) {
    try { friends = (JSON.parse(m7.dataJson).shares as number | undefined) ?? 0; } catch {}
  }
  if (m7?.status === "COMPLETED" && friends < 5) friends = 5;
  const peer = Math.min(100, Math.round((friends / 5) * 100)); // 5 share = penuh

  const creativity = p.videoSubmissions[0]?.grade ?? 0;

  const activities = p.activityLogs.length;
  const activity = Math.min(100, Math.round((activities / 40) * 100));

  const total = Math.round(
    knowledge * 0.25 + missions * 0.20 + ttd * 0.20 + peer * 0.15 + creativity * 0.10 + activity * 0.10
  );
  return { knowledge, missions, ttd, peer, creativity, activity, total };
}

export function levelOf(xp: number) {
  return getLevel(xp);
}
