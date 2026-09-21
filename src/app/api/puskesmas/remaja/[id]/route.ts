import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { CORE_MISSION_KEY_RE, MISSIONS, getLevel } from "@/lib/constants";
import { BADGES } from "@/lib/constants";
import { getWilayahScope, dalamWilayah } from "@/lib/puskesmas";

// ------------------------------------------------------------
// PETUGAS — DETAIL REMAJA (pembaruan 19 Tahap 3 & 4)
// Tahap 3: profil read-only + guard wilayah + AuditLog
//          (action VIEW_PARTICIPANT).
// Tahap 4: riwayat Hb dikirim lengkap (20 terbaru) dengan
//          catatan + info Puskesmas pemasuk, agar petugas
//          dapat mengelola (ubah/hapus) rekaman dari
//          Puskesmasnya sendiri di halaman detail.
// Pembaruan 20 T2: riwayat Cek Status Gizi (input mandiri
//          remaja) ikut dikirim — SATU sumber data yang sama
//          dengan milik admin & remaja (nutrition_assessments).
// Akses DITOLAK bila remaja di luar wilayah kerja
// Puskesmas petugas (kecamatan sekolah ≠ kecamatan wilayah).
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
        hemoglobinRecords: {
          orderBy: { checkDate: "desc" },
          take: 20,
          include: { staff: { select: { puskesmasId: true, nama: true } } },
        },
        nutritionAssessments: {
          orderBy: [{ tanggalPemeriksaan: "desc" }, { createdAt: "desc" }],
          take: 20,
        },
        _count: { select: { ttdCheckIns: true, hemoglobinRecords: true } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    });
    if (!p) return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });

    // ---- Guard wilayah (Tahap 5): kecamatan sekolah ATAU kelurahan
    //      domisili harus termasuk wilayah kerja Puskesmas ----
    const scope = await getWilayahScope(petugas.staff.puskesmasId);
    if (!dalamWilayah(scope, p)) {
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
        domisiliKecamatan: p.domisiliKecamatan,
        domisiliKelurahan: p.domisiliKelurahan,
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
          notes: h.notes,
          puskesmasId: h.staff?.puskesmasId ?? null,
          bisaKelola: h.staff?.puskesmasId === petugas.staff.puskesmasId,
        })),
        ttdCount: p._count.ttdCheckIns,
        ttdTerakhir: p.ttdCheckIns[0]?.date ?? null,
        ttdRiwayat: p.ttdCheckIns.map((t) => t.date),
      },
      statusGizi: {
        terakhir: p.nutritionAssessments[0]
          ? {
              tanggalPemeriksaan: p.nutritionAssessments[0].tanggalPemeriksaan,
              usiaLabel: `${p.nutritionAssessments[0].usiaTahun} tahun ${p.nutritionAssessments[0].usiaBulan} bulan ${p.nutritionAssessments[0].usiaHari} hari`,
              beratBadanKg: Number(p.nutritionAssessments[0].beratBadanKg),
              tinggiBadanCm: Number(p.nutritionAssessments[0].tinggiBadanCm),
              imt: Number(p.nutritionAssessments[0].imt),
              tbUZscore: Number(p.nutritionAssessments[0].tbUZscore),
              tbUStatus: p.nutritionAssessments[0].tbUStatus,
              imtUZscore: Number(p.nutritionAssessments[0].imtUZscore),
              imtUStatus: p.nutritionAssessments[0].imtUStatus,
            }
          : null,
        riwayat: p.nutritionAssessments.map((g) => ({
          id: g.id,
          tanggalPemeriksaan: g.tanggalPemeriksaan,
          usiaLabel: `${g.usiaTahun} tahun ${g.usiaBulan} bulan ${g.usiaHari} hari`,
          beratBadanKg: Number(g.beratBadanKg),
          tinggiBadanCm: Number(g.tinggiBadanCm),
          imt: Number(g.imt),
          tbUZscore: Number(g.tbUZscore),
          tbUStatus: g.tbUStatus,
          imtUZscore: Number(g.imtUZscore),
          imtUStatus: g.imtUStatus,
        })),
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
