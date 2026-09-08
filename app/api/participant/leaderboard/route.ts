import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { getLevel } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") === "SMA" ? "SMA" : "SMP";

  const where = { educationLevel: tab };

  const participants = await db.participant.findMany({
    where,
    include: {
      badges: true,
      missionProgress: { where: { status: "COMPLETED" } },
    },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
    take: 50,
  });

  const ranked = participants.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    school: p.school,
    avatar: p.avatar,
    profilePhotoUrl: p.profilePhotoUrl,
    xp: p.xp,
    level: getLevel(p.xp).level,
    levelIcon: getLevel(p.xp).icon,
    levelName: getLevel(p.xp).name,
    badges: p.badges.map((b) => b.badgeKey),
    missionsCompleted: p.missionProgress.length,
    streakWeeks: p.streakWeeks,
    isDuta: p.isDuta,
    isDutaCandidate: p.isDutaCandidate,
  }));

  const myRank = ranked.find((r) => r.id === auth.participantId)?.rank ?? null;

  // ======== Sekolah teraktif (per tingkat, diperluas) ========
  const all = await db.participant.findMany({
    where,
    select: {
      id: true, school: true, xp: true,
      ttdCheckIns: { select: { id: true } },
      missionProgress: { where: { status: "COMPLETED" }, select: { id: true } },
      communityContent: { where: { status: "APPROVED" }, select: { id: true, likesCount: true, contentType: true } },
    },
  });

  interface SchoolAgg {
    school: string; xp: number; members: number; checkins: number;
    missions: number; contents: number; likes: number; videos: number;
  }
  const schoolMap = new Map<string, SchoolAgg>();
  for (const s of all) {
    const cur = schoolMap.get(s.school) || { school: s.school, xp: 0, members: 0, checkins: 0, missions: 0, contents: 0, likes: 0, videos: 0 };
    cur.xp += s.xp;
    cur.members += 1;
    cur.checkins += s.ttdCheckIns.length;
    cur.missions += s.missionProgress.length;
    cur.contents += s.communityContent.length;
    cur.likes += s.communityContent.reduce((a, c) => a + c.likesCount, 0);
    cur.videos += s.communityContent.filter((c) => c.contentType === "peer_educator").length;
    schoolMap.set(s.school, cur);
  }
  const schools = Array.from(schoolMap.values())
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((s, i) => ({ rank: i + 1, ...s }));

  return NextResponse.json({ tab, leaderboard: ranked, schools, myRank });
}
