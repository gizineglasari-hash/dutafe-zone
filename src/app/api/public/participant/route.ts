import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLevel } from "@/lib/constants";

// ------------------------------------------------------------------
// GET — Profil publik peserta (dipanggil dari Leaderboard / Community / Peer Educator)
// HANYA data publik — tanpa email, usia, atau data pribadi sensitif.
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const p = await db.participant.findUnique({
    where: { id },
    include: { badges: true, missionProgress: { where: { status: "COMPLETED" } } },
  });
  if (!p) return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });

  // Ranking dalam jenjangnya
  const sameLevel = await db.participant.findMany({
    where: { educationLevel: p.educationLevel },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
    select: { id: true },
  });
  const rank = sameLevel.findIndex((x) => x.id === p.id) + 1;

  const approvedContents = await db.communityContent.findMany({
    where: { participantId: p.id, status: "APPROVED" },
    select: { likesCount: true, contentType: true },
  });
  const totalLikes = approvedContents.reduce((a, c) => a + c.likesCount, 0);
  const videoCount = approvedContents.filter((c) => c.contentType === "peer_educator").length;

  const lvl = getLevel(p.xp);

  return NextResponse.json({
    profile: {
      id: p.id,
      name: p.name,
      school: p.school,
      educationLevel: p.educationLevel,
      avatar: p.avatar,
      profilePhotoUrl: p.profilePhotoUrl,
      isDuta: p.isDuta,
      isDutaCandidate: p.isDutaCandidate,
      xp: p.xp,
      level: { level: lvl.level, name: lvl.name, icon: lvl.icon },
      rank,
      badges: p.badges.map((b) => b.badgeKey),
      missionsCompleted: p.missionProgress.length,
      videoCount,
      totalLikes,
    },
  });
}
