import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { computeDutaScore } from "@/lib/gamification";
import { getLevel, LEVELS, BADGES, badgeByKey } from "@/lib/constants";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [participants, checkins, missionRows, quizRows, activityRows, videoRows, contentRows] = await Promise.all([
    db.participant.findMany({
      include: { badges: true, missionProgress: { where: { status: "COMPLETED" } }, user: { select: { username: true, createdAt: true } } },
    }),
    db.tTDCheckIn.findMany({ orderBy: { date: "desc" } }),
    db.missionProgress.findMany({ where: { status: "COMPLETED" } }),
    db.quizResult.findMany({ where: { quizKey: { in: ["PRETEST", "POSTTEST"] } } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" } }),
    db.videoSubmission.findMany({ select: { status: true } }),
    db.communityContent.findMany({ select: { status: true, likesCount: true } }),
  ]);

  const total = participants.length;
  const totalSmp = participants.filter((p) => p.educationLevel === "SMP").length;
  const totalSma = participants.filter((p) => p.educationLevel === "SMA").length;

  // Peserta aktif: ada aktivitas dalam 7 hari terakhir
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const activeIds = new Set(activityRows.filter((a) => a.createdAt >= weekAgo).map((a) => a.participantId));
  const active = participants.filter((p) => activeIds.has(p.id)).length;

  const candidates = participants.filter((p) => p.isDutaCandidate);
  const dutas = participants.filter((p) => p.isDuta);

  // XP
  const totalXp = participants.reduce((a, p) => a + p.xp, 0);
  const avgXp = total ? Math.round(totalXp / total) : 0;

  // Grafik: peserta per sekolah + peringkat sekolah (partisipasi & capaian)
  const schoolMap = new Map<string, { school: string; SMP: number; SMA: number }>();
  for (const p of participants) {
    const cur = schoolMap.get(p.school) || { school: p.school, SMP: 0, SMA: 0 };
    if (p.educationLevel === "SMP") cur.SMP++; else cur.SMA++;
    schoolMap.set(p.school, cur);
  }
  const perSchool = Array.from(schoolMap.values()).sort((a, b) => (b.SMP + b.SMA) - (a.SMP + a.SMA));

  // Grafik: penyelesaian per misi (jumlah + % dari total peserta)
  const perMission = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"].map((k) => {
    const completed = missionRows.filter((m) => m.missionKey === k).length;
    return { mission: k, completed, rate: total ? Math.round((completed / total) * 100) : 0 };
  });

  // Grafik: aktivitas TTD 14 hari terakhir
  const ttdDaily: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toLocaleDateString("en-CA");
    ttdDaily.push({ date: d.slice(5), count: checkins.filter((c) => c.date === d).length });
  }

  // TTD: bandingkan 7 hari terakhir vs 7 hari sebelumnya + peserta yang pernah check-in
  const dayMs = 24 * 3600 * 1000;
  const dateStr = (offset: number) => new Date(Date.now() - offset * dayMs).toLocaleDateString("en-CA");
  let ttdLast7 = 0;
  let ttdPrev7 = 0;
  for (let i = 0; i < 7; i++) ttdLast7 += checkins.filter((c) => c.date === dateStr(i)).length;
  for (let i = 7; i < 14; i++) ttdPrev7 += checkins.filter((c) => c.date === dateStr(i)).length;
  const ttdTrendPct = ttdPrev7 > 0 ? Math.round(((ttdLast7 - ttdPrev7) / ttdPrev7) * 100) : ttdLast7 > 0 ? 100 : 0;
  const ttdParticipants = new Set(checkins.map((c) => c.participantId)).size;

  // Rata-rata pre & post (per peserta terbaik) + tingkat peningkatan
  const preScores = new Map<string, number>();
  const postScores = new Map<string, number>();
  for (const q of quizRows) {
    if (q.quizKey === "PRETEST") {
      const cur = preScores.get(q.participantId);
      preScores.set(q.participantId, Math.max(cur ?? 0, q.score));
    } else {
      const cur = postScores.get(q.participantId);
      postScores.set(q.participantId, Math.max(cur ?? 0, q.score));
    }
  }
  const avgPre = preScores.size ? Math.round(Array.from(preScores.values()).reduce((a, b) => a + b, 0) / preScores.size) : 0;
  const postPids = Array.from(postScores.keys());
  const avgPost = postPids.length ? Math.round(Array.from(postScores.values()).reduce((a, b) => a + b, 0) / postPids.length) : 0;
  const gain = avgPost - avgPre;

  // Per peserta: gain & peringkat sekolah berdasar rata-rata XP/gain
  let improved = 0;
  let bothTests = 0;
  const gainByParticipant = new Map<string, number>();
  for (const pid of Array.from(new Set([...Array.from(preScores.keys()), ...postPids]))) {
    const pre = preScores.get(pid);
    const post = postScores.get(pid);
    if (pre !== undefined && post !== undefined) {
      bothTests++;
      const g = post - pre;
      gainByParticipant.set(pid, g);
      if (g > 0) improved++;
    }
  }
  const improvementRate = bothTests ? Math.round((improved / bothTests) * 100) : 0;

  const schoolRanking = Array.from(schoolMap.entries()).map(([school, cnt]) => {
    const ps = participants.filter((p) => p.school === school);
    const xpSum = ps.reduce((a, p) => a + p.xp, 0);
    const gains = ps.map((p) => gainByParticipant.get(p.id)).filter((g): g is number => g !== undefined);
    return {
      school,
      participants: cnt.SMP + cnt.SMA,
      totalXp: xpSum,
      avgXp: ps.length ? Math.round(xpSum / ps.length) : 0,
      avgGain: gains.length ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length) : null,
    };
  }).sort((a, b) => b.avgXp - a.avgXp).slice(0, 10);

  // Grafik: distribusi level
  const levelDistribution = LEVELS.map((lv) => ({
    level: `${lv.icon} ${lv.name}`,
    count: participants.filter((p) => getLevel(p.xp).level === lv.level).length,
  }));

  // Grafik: distribusi badge
  const badgeCounts = new Map<string, number>();
  for (const p of participants) for (const b of p.badges) badgeCounts.set(b.badgeKey, (badgeCounts.get(b.badgeKey) ?? 0) + 1);
  const badgeDistribution = BADGES.map((b) => ({
    badge: `${b.icon} ${b.name}`,
    count: badgeCounts.get(b.key) ?? 0,
  })).sort((a, b) => b.count - a.count);

  // Grafik: tren pendaftaran 8 pekan terakhir
  const registrationsTrend: { week: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(Date.now() - (w * 7 + 6) * dayMs);
    const end = new Date(Date.now() - w * 7 * dayMs);
    const count = participants.filter((p) => {
      const d = p.user.createdAt;
      return d >= start && d < end;
    }).length;
    registrationsTrend.push({ week: w === 0 ? "Minggu ini" : `-${w} pekan`, count });
  }

  // Video & komunitas
  const videosPending = videoRows.filter((v) => v.status === "PENDING").length;
  const videosApproved = videoRows.filter((v) => v.status === "APPROVED").length;
  const contentsPending = contentRows.filter((c) => c.status === "PENDING").length;
  const contentsApproved = contentRows.filter((c) => c.status === "APPROVED").length;
  const totalLikes = contentRows.reduce((a, c) => a + c.likesCount, 0);
  const totalBadges = participants.reduce((a, p) => a + p.badges.length, 0);

  // Kandidat Duta + skor
  const dutaCandidates = await Promise.all(
    candidates.map(async (p) => {
      const s = await computeDutaScore(p.id);
      return {
        id: p.id, name: p.name, school: p.school, educationLevel: p.educationLevel,
        xp: p.xp, level: getLevel(p.xp).name,
        score: s, isDuta: p.isDuta,
      };
    })
  );
  dutaCandidates.sort((a, b) => b.score.total - a.score.total);

  // ------------------------------------------------------------
  // ANALISA OTOMATIS — ringkasan temuan dalam bahasa Indonesia
  // ------------------------------------------------------------
  const insights: { icon: string; text: string }[] = [];
  if (total === 0) {
    insights.push({ icon: "🌱", text: "Belum ada peserta terdaftar. Bagikan tautan situs ke sekolah-sekolah untuk mulai merekrut peserta." });
  } else {
    if (bothTests > 0) {
      insights.push({
        icon: "📈",
        text: `Pengetahuan peserta naik dari rata-rata ${avgPre} menjadi ${avgPost} (+${gain} poin). ${improved} dari ${bothTests} peserta (${improvementRate}%) mengalami peningkatan nilai setelah program.`,
      });
    } else {
      insights.push({ icon: "⏳", text: "Belum ada peserta yang menyelesaikan pre-test dan post-test berdua, sehingga peningkatan pengetahuan belum bisa diukur." });
    }
    const topSchool = schoolRanking[0];
    if (topSchool) {
      insights.push({
        icon: "🏫",
        text: `Sekolah paling berprestasi: ${topSchool.school} — ${topSchool.participants} peserta dengan rata-rata ${topSchool.avgXp.toLocaleString("id-ID")} XP.`,
      });
    }
    if (total > 0) {
      const hardest = [...perMission].sort((a, b) => a.completed - b.completed)[0];
      const easiest = [...perMission].sort((a, b) => b.completed - a.completed)[0];
      if (hardest && hardest.completed < total) {
        insights.push({
          icon: "🎯",
          text: `Misi ${hardest.mission} paling sedikit diselesaikan (${hardest.completed} peserta, ${hardest.rate}%); misi ${easiest.mission} paling banyak (${easiest.completed} peserta). Pertimbangkan pengingat/dampingan untuk misi yang tersendat.`,
        });
      }
    }
    insights.push({
      icon: "💊",
      text: ttdPrev7 > 0
        ? `Check-in TTD 7 hari terakhir: ${ttdLast7} kali (${ttdTrendPct >= 0 ? "naik" : "turun"} ${Math.abs(ttdTrendPct)}% dibanding pekan sebelumnya). Total ${ttdParticipants} peserta pernah check-in.`
        : `Check-in TTD 7 hari terakhir: ${ttdLast7} kali. Total ${ttdParticipants} peserta pernah check-in.`,
    });
    insights.push({
      icon: "🔥",
      text: `${active} dari ${total} peserta (${Math.round((active / total) * 100)}%) aktif dalam 7 hari terakhir.`,
    });
    const thisWeek = registrationsTrend[registrationsTrend.length - 1]?.count ?? 0;
    const lastWeek = registrationsTrend[registrationsTrend.length - 2]?.count ?? 0;
    insights.push({
      icon: "🧑‍🎓",
      text: thisWeek >= lastWeek
        ? `Pendaftaran berjalan ${thisWeek === lastWeek ? "stabil" : "meningkat"}: ${thisWeek} pendaftar baru pekan ini (pekan lalu ${lastWeek}).`
        : `Pendaftaran melambat: ${thisWeek} pendaftar baru pekan ini, turun dari ${lastWeek} pekan lalu. Perlu promosi tambahan.`,
    });
    const topBadge = badgeDistribution[0];
    if (topBadge && topBadge.count > 0) {
      insights.push({ icon: "🏅", text: `Badge paling banyak diraih: ${topBadge.badge} (${topBadge.count} peserta). Total ${totalBadges} badge diterbitkan.` });
    }
    if (videosPending > 0 || contentsPending > 0) {
      insights.push({
        icon: "📋",
        text: `Menunggu tindakan admin: ${videosPending} video penilaian dan ${contentsPending} konten komunitas belum dimoderasi.`,
      });
    }
  }

  return NextResponse.json({
    stats: {
      total, totalSmp, totalSma, missionsCompleted: missionRows.length, totalCheckins: checkins.length, active,
      candidates: candidates.length, dutas: dutas.length, avgPre, avgPost, gain,
      avgXp, totalXp, improvementRate, bothTests, ttdParticipants, ttdLast7, ttdTrendPct,
      totalBadges, videosPending, videosApproved, contentsPending, contentsApproved, totalLikes,
    },
    charts: {
      smpVsSma: [
        { name: "SMP", value: totalSmp },
        { name: "SMA", value: totalSma },
      ],
      perSchool,
      perMission,
      ttdDaily,
      prePost: [
        { name: "Pre-Test", value: avgPre },
        { name: "Post-Test", value: avgPost },
      ],
      levelDistribution,
      badgeDistribution,
      registrationsTrend,
    },
    schoolRanking,
    insights,
    dutaCandidates,
  });
}
