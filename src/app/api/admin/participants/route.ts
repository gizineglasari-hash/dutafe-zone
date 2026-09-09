import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getLevel } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level"); // SMP | SMA | null (semua)
  const school = searchParams.get("school");
  const q = searchParams.get("q");
  const lvl = searchParams.get("lvl"); // level XP 1-5
  const duta = searchParams.get("duta"); // candidate | winner | none

  const where: Record<string, unknown> = {};
  if (level === "SMP" || level === "SMA") where.educationLevel = level;
  if (school) where.school = school;
  if (q) where.name = { contains: q };
  if (duta === "candidate") where.isDutaCandidate = true;
  if (duta === "winner") where.isDuta = true;

  const participants = await db.participant.findMany({
    where,
    include: {
      badges: true,
      missionProgress: true,
      user: { select: { username: true, createdAt: true } },
      videoSubmissions: { where: { status: "PENDING" } },
    },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
  });

  let rows = participants.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    school: p.school,
    educationLevel: p.educationLevel,
    username: p.user.username,
    joinedAt: p.user.createdAt,
    xp: p.xp,
    level: getLevel(p.xp).level,
    levelName: getLevel(p.xp).name,
    levelIcon: getLevel(p.xp).icon,
    badges: p.badges.map((b) => b.badgeKey),
    missionsCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED").length,
    streakWeeks: p.streakWeeks,
    preTestScore: p.preTestScore,
    postTestScore: p.postTestScore,
    isDutaCandidate: p.isDutaCandidate,
    isDuta: p.isDuta,
    hasPendingVideo: p.videoSubmissions.length > 0,
  }));

  if (lvl) {
    const n = parseInt(lvl, 10);
    rows = rows.filter((r) => r.level === n);
  }

  const schools = Array.from(new Set((await db.participant.findMany({ select: { school: true } })).map((s) => s.school))).sort();

  return NextResponse.json({ participants: rows, schools });
}
