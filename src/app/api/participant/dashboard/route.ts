import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { CORE_MISSIONS, CORE_MISSION_KEY_RE, customMissionKey } from "@/lib/constants";
import { checkTrackerMissions, computeWeeklyStreak, syncMissionUnlocks } from "@/lib/gamification";
import { getHbStandards, interpretHb, getPuskesmasRujukan } from "@/lib/puskesmas";

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
      hemoglobinRecords: {
        orderBy: [{ checkDate: "desc" }, { createdAt: "desc" }],
        take: 20,
      },
      nutritionAssessments: { orderBy: { tanggalPemeriksaan: "desc" }, take: 1, select: { tanggalPemeriksaan: true, imtUStatus: true, tbUStatus: true } },
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
  // Hanya misi inti M1-M9 yang dihitung (misi buatan admin dihitung terpisah)
  const completed = p.missionProgress.filter((m) => m.status === "COMPLETED" && CORE_MISSION_KEY_RE.test(m.missionKey)).length;

  // Misi buatan admin yang aktif + status penyelesaian peserta ini
  const customs = await db.customMission.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  const customMissions = customs.map((c) => {
    const st = p.missionProgress.find((m) => m.missionKey === customMissionKey(c.id));
    return {
      id: c.id,
      title: c.title,
      icon: c.icon,
      description: c.description,
      xp: c.xp,
      completed: st?.status === "COMPLETED",
      completedAt: st?.completedAt ?? null,
    };
  });

  // Ranking dalam tingkat pendidikannya
  const sameLevel = await db.participant.findMany({
    where: { educationLevel: p.educationLevel },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
    select: { id: true },
  });
  const rank = sameLevel.findIndex((x) => x.id === pid) + 1;

  const certPejuang = completed >= 9;

  // ---- Pembaruan 19 Tahap 4: interpretasi Hb + riwayat untuk Profil ----
  const std = await getHbStandards();
  const hbInterpretasi = p.hbValue !== null ? interpretHb(p.hbValue, std) : null;
  const hbRecords = p.hemoglobinRecords.map((h) => ({
    id: h.id,
    checkDate: h.checkDate,
    hbValue: h.hbValue,
    method: h.method,
    location: h.location,
    examiner: h.examiner,
  }));

  // ---- Pembaruan 19 Tahap 5: Puskesmas rujukan sesuai domisili ----
  const puskesmasRujukan =
    p.domisiliKelurahan ? await getPuskesmasRujukan(p.domisiliKelurahan, p.domisiliKecamatan) : null;

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
      hbValue: p.hbValue,
      hbCheckDate: p.hbCheckDate,
      hbKategori: hbInterpretasi?.kategori ?? null,
      hbLabel: hbInterpretasi?.label ?? null,
      hbPesan: hbInterpretasi?.pesan ?? null,
      hbRecords,
      domisiliKecamatan: p.domisiliKecamatan,
      domisiliKelurahan: p.domisiliKelurahan,
      puskesmasRujukan,
      giziTerakhir: p.nutritionAssessments[0]
        ? {
            tanggalPemeriksaan: p.nutritionAssessments[0].tanggalPemeriksaan,
            imtUStatus: p.nutritionAssessments[0].imtUStatus,
            tbUStatus: p.nutritionAssessments[0].tbUStatus,
          }
        : null,
      ttdTerakhir: checkins[0]?.date ?? null,
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
    customMissions,
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
