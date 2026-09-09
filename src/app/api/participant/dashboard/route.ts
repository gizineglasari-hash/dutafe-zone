import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { CORE_MISSIONS } from "@/lib/constants";
import { checkTrackerMissions, computeWeeklyStreak, syncMissionUnlocks } from "@/lib/gamification";

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  await checkTrackerMissions(pid);
  await syncMissionUnlocks(pid);

  const p = await db.participant.findUnique({
    where: { id: pid },
    include: {
      badges: true,
      missionProgress: true,
      quizResults: true,
      videoSubmissions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Data komunitas: share edukasi, video peer educator, engagement like
  const [shares, myContents] = await Promise.all([
    db.missionShare.findMany({ where: { participantId: pid } }),
    db.communityContent.findMany({ where: { participantId: pid } }),
  ]);
  const spreadShares = shares.reduce((a, s) => a + s.shareCount, 0);
  const approvedContents = myContents.filter((c) => c.status === "APPROVED");
  const peerVideos = {
    total: myContents.filter((c) => c.contentType === "peer_educator").length,
    approved: approvedContents.filter((c) => c.contentType === "peer_educator").length,
    pending: myContents.filter((c) => c.contentType === "peer_educator" && c.status === "PENDING").length,
    education: myContents.filter((c) => c.contentType === "education").length,
  };
  const totalLikes = approvedContents.reduce((a, c) => a + c.likesCount, 0);

  const checkins = await db.tTDCheckIn.findMany({
    where: { participantId: pid },
    orderBy: { date: "desc" },
  });
  const streak = computeWeeklyStreak(checkins.map((c) => c.date));

  const coreDone = CORE_MISSIONS.every((k) => p.missionProgress.find((m) => m.missionKey === k)?.status === "COMPLETED");
  const completedRows = p.missionProgress.filter((m) => m.status === "COMPLETED");
  const completed = completedRows.length;

  // Ranking dalam tingkat pendidikannya
  const sameLevel = await db.participant.findMany({
    where: { educationLevel: p.educationLevel },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
    select: { id: true },
  });
  const rank = sameLevel.findIndex((x) => x.id === pid) + 1;

  const certPejuang = completed >= 9;

  return NextResponse.json({
    profile: {
      id: p.id,
      name: p.name,
      age: p.age,
      school: p.school,
      educationLevel: p.educationLevel,
      avatar: p.avatar,
      profilePhotoUrl: p.profilePhotoUrl,
      xp: p.xp,
      streakWeeks: streak,
      preTestScore: p.preTestScore,
      postTestScore: p.postTestScore,
      isDutaCandidate: p.isDutaCandidate,
      isDuta: p.isDuta,
    },
    badges: p.badges.map((b) => b.badgeKey),
    missions: p.missionProgress.map((m) => ({
      key: m.missionKey,
      status: m.status,
      progress: m.progress,
      score: m.score,
      xpAwarded: m.xpAwarded,
      dataJson: m.dataJson,
    })),
    missionsCompleted: completed,
    checkins: checkins.map((c) => c.date),
    totalCheckins: checkins.length,
    postTestUnlocked: coreDone,
    allCompleted: completed >= 9,
    rank,
    videos: p.videoSubmissions.map((v) => ({ id: v.id, fileUrl: v.fileUrl, status: v.status, grade: v.grade, missionKey: v.missionKey })),
    community: {
      spreadShares,
      spreadTarget: 5,
      spreadCompleted: p.missionProgress.find((m) => m.missionKey === "M7")?.status === "COMPLETED",
      peerVideos,
      totalLikes,
      approvedContents: approvedContents.length,
    },
    certificate: {
      pejuang: certPejuang,
      duta: p.isDuta,
    },
  });
}
