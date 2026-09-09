import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { XP_RULES } from "@/lib/constants";
import { awardXp, checkTrackerMissions, computeWeeklyStreak, isoWeekStart } from "@/lib/gamification";

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await checkTrackerMissions(auth.participantId);
  const [checkins, p] = await Promise.all([
    db.tTDCheckIn.findMany({
      where: { participantId: auth.participantId },
      orderBy: { date: "desc" },
    }),
    db.participant.findUnique({ where: { id: auth.participantId } }),
  ]);

  const streak = computeWeeklyStreak(checkins.map((c) => c.date));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD

  // Check-in hanya 1× dalam 1 minggu (minggu mulai Senin)
  const thisWeekStartStr = isoWeekStart(new Date());
  const thisWeekDone = checkins.some((c) => isoWeekStart(new Date(c.date + "T12:00:00")) === thisWeekStartStr);

  return NextResponse.json({
    checkins: checkins.map((c) => c.date),
    total: checkins.length,
    streak,
    lastCheckIn: p?.lastCheckIn,
    checkedToday: checkins.some((c) => c.date === today),
    thisWeekDone, // true → tombol check-in dinonaktifkan sampai minggu depan
    streakBonusAwarded: result.streakBonusAwarded,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  // ===== Validasi mingguan di DATABASE (bukan frontend): 1 check-in per minggu =====
  const thisWeekStartStr = isoWeekStart(new Date());
  const weekCheckins = await db.tTDCheckIn.findMany({ where: { participantId: pid }, orderBy: { date: "desc" } });
  const alreadyThisWeek = weekCheckins.find(
    (c) => isoWeekStart(new Date(c.date + "T12:00:00")) === thisWeekStartStr
  );
  if (alreadyThisWeek) {
    return NextResponse.json({
      ok: false,
      message: "Kamu sudah check-in TTD minggu ini. Check-in berikutnya tersedia minggu depan.",
      lastCheckIn: alreadyThisWeek.date,
      xpEarned: 0,
    });
  }

  const checkin = await db.tTDCheckIn.create({
    data: { participantId: pid, date: today, xp: XP_RULES.CHECKIN },
  });
  await awardXp(pid, XP_RULES.CHECKIN, "CHECKIN", today);
  await db.activityLog.create({ data: { participantId: pid, type: "CHECKIN", meta: today } });

  const result = await checkTrackerMissions(pid);

  return NextResponse.json({
    ok: true,
    message: "Hebat! Kamu sudah mengonsumsi TTD minggu ini. +10 XP",
    xpEarned: XP_RULES.CHECKIN,
    date: checkin.date,
    streak: result.streak,
    streakBonusAwarded: result.streakBonusAwarded,
  });
}
