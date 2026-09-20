import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { CORE_MISSION_KEY_RE, MISSIONS, getLevel } from "@/lib/constants";
import { BADGES } from "@/lib/constants";

// ------------------------------------------------------------
// PETUGAS — DETAIL REMAJA (pembaruan 19 Tahap 3)
// Read-only. Akses DITOLAK bila remaja di luar wilayah kerja
// Puskesmas petugas (kecamatan sekolah ≠ kecamatan wilayah).
// Setiap pembukaan detail tercatat di AuditLog (action
// VIEW_PARTICIPANT) — jejak untuk laporan audit Tahap 5.
// ------------------------------------------------------------

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const p = await db.participant.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, createdAt: true } },
        badges: { select: { badgeKey: true, earnedAt: true } },
        missionProgress: { select: { missionKey: true, status: true, score: true, updatedAt: true } },
        ttdCheckIns: { orderBy: { date: "desc" }, take: 10, select: { date: true } },
        hemoglobinRecords: { orderBy: { checkDate: "desc" }, take: 5 },
        _count: { select: { ttdCheckIns: true, hemoglobinRecords: true } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    });
    if (!p) return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });

    // ---- Guard wilayah: kecamatan sekolah harus termasuk wilayah kerja ----
    const kecamatanSet = new Set<string>();
    for (const w of petugas.staff.puskesmas.wilayah) {
      const kec = w.kelurahan.kecamatan?.nama;
      if (kec) kecamatanSet.add(kec);
    }
    if (!p.schoolDistrict || !kecamatanSet.has(p.schoolDistrict)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melihat data pengguna ini." },
        { status: 403 }
      );
    }

    const level = getLevel(p.xp);
    const coreMissions = MISSIONS.map((m) => {
      const prog = p.missionProgress.find((mp) => mp.missionKey === m.key);
      return {
        key: m.key,
        title: m.title,
        short: m.short,
        icon: m.icon,
        status: prog?.status ?? "LOCKED",
        score: prog?.score ?? null,
      };
    });

    // Audit: pembukaan profil remaja oleh petugas
    await db.auditLog.create({
      data: {
        actorUserId: petugas.user.id,
        actorRole: "PETUGAS",
        action: "VIEW_PARTICIPANT",
        targetType: "PARTICIPANT",
        targetUserId: p.userId,
        meta: JSON.stringify({ participantId: p.id, nama: p.name, puskesmas: petugas.staff.puskesmas.nama }),
      },
    }).catch(() => {}); // audit tidak boleh memblokir tampilan

    return NextResponse.json({
      remaja: {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        profilePhotoUrl: p.profilePhotoUrl,
        age: p.age,
        educationLevel: p.educationLevel,
        school: p.school,
        schoolCity: p.schoolCity,
        schoolDistrict: p.schoolDistrict,
        schoolType: p.schoolType,
        phone: p.phone,
        nik: p.nik,
        username: p.user.username,
        joinedAt: p.user.createdAt,
        xp: p.xp,
        level: level.level,
        levelName: level.name,
        levelIcon: level.icon,
        streakWeeks: p.streakWeeks,
        lastCheckIn: p.lastCheckIn,
        preTestScore: p.preTestScore,
        postTestScore: p.postTestScore,
        hbValue: p.hbValue,
        hbCheckDate: p.hbCheckDate,
        isDutaCandidate: p.isDutaCandidate,
        isDuta: p.isDuta,
      },
      kesehatan: {
        hbRecords: p.hemoglobinRecords.map((h) => ({
          id: h.id,
          checkDate: h.checkDate,
          hbValue: h.hbValue,
          method: h.method,
          location: h.location,
          examiner: h.examiner,
        })),
        ttdCount: p._count.ttdCheckIns,
        ttdTerakhir: p.ttdCheckIns[0]?.date ?? null,
        ttdRiwayat: p.ttdCheckIns.map((t) => t.date),
      },
      gamifikasi: {
        badges: p.badges.map((b) => ({ key: b.badgeKey, earnedAt: b.earnedAt })),
        misi: coreMissions,
      },
      aktivitas: {
        terakhir: p.activityLogs[0]?.createdAt ?? null,
      },
    });
  } catch (e) {
    console.error("PUSKESMAS_REMAYA_DETAIL_ERR", e);
    return NextResponse.json({ error: "Gagal memuat detail remaja" }, { status: 500 });
  }
}
