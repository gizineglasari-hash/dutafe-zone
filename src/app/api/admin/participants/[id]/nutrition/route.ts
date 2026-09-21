// ============================================================
// ADMIN — RIWAYAT STATUS GIZI SATU PESERTA (pembaruan 20 T2)
// GET /api/admin/participants/<id>/nutrition
//
// Sumber data TUNGGAL: tabel nutrition_assessments (tabel yang
// sama dipakai remaja saat cek mandiri & petugas saat melihat
// profil) — tidak ada tabel baru, tidak ada data dummy.
// Urutan: pengukuran terbaru -> terlama.
// Hak akses: ADMIN saja (403 untuk selain admin).
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toISODate } from "@/lib/who2007";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });

  const { id } = await ctx.params;

  const peserta = await db.participant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      school: true,
      educationLevel: true,
      tanggalLahir: true,
      user: { select: { username: true } },
    },
  });
  if (!peserta) return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });

  const riwayat = await db.nutritionAssessment.findMany({
    where: { participantId: id },
    orderBy: [{ tanggalPemeriksaan: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    participant: {
      id: peserta.id,
      name: peserta.name,
      username: peserta.user.username,
      school: peserta.school,
      educationLevel: peserta.educationLevel,
      jenisKelamin: riwayat[0]?.jenisKelamin ?? null,
      tanggalLahir: peserta.tanggalLahir ? toISODate(peserta.tanggalLahir) : null,
    },
    rows: riwayat.map((r) => ({
      id: r.id,
      tanggalPemeriksaan: toISODate(r.tanggalPemeriksaan),
      usiaLabel: `${r.usiaTahun} tahun ${r.usiaBulan} bulan ${r.usiaHari} hari`,
      beratBadanKg: Number(r.beratBadanKg),
      tinggiBadanCm: Number(r.tinggiBadanCm),
      imt: Number(r.imt),
      tbUZscore: Number(r.tbUZscore),
      tbUPercentile: Number(r.tbUPercentile),
      tbUStatus: r.tbUStatus,
      imtUZscore: Number(r.imtUZscore),
      imtUPercentile: Number(r.imtUPercentile),
      imtUStatus: r.imtUStatus,
      interpretation: r.interpretation,
      recommendation: r.recommendation,
      calculationVersion: r.calculationVersion, // null = data lama (v1)
      createdAt: r.createdAt,
    })),
  });
}
