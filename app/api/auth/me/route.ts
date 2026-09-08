import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevel } from "@/lib/constants";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  if (user.role === "PARTICIPANT" && user.participantId) {
    const [badges, missions, checkins] = await Promise.all([
      db.participantBadge.findMany({ where: { participantId: user.participantId } }),
      db.missionProgress.findMany({ where: { participantId: user.participantId } }),
      db.tTDCheckIn.count({ where: { participantId: user.participantId } }),
    ]);
    const completed = missions.filter((m) => m.status === "COMPLETED").length;
    return NextResponse.json({
      user,
      badges: badges.map((b) => b.badgeKey),
      missions,
      missionsCompleted: completed,
      checkins,
      level: getLevel(user.xp ?? 0),
    });
  }
  return NextResponse.json({ user });
}
