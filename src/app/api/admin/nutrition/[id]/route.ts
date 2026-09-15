// ============================================================
// API Cek Status Gizi — ADMIN: detail 1 pemeriksaan + seluruh
// riwayat peserta yang sama (untuk modal & grafik pertumbuhan).
// Keamanan: wajib role ADMIN (server-side, setara RLS).
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toISODate } from "@/lib/who2007";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });

  const { id } = await ctx.params;
  const record = await db.nutritionAssessment.findUnique({
    where: { id },
    include: {
      user: { select: { username: true } },
      participant: { select: { name: true, school: true, educationLevel: true, jenisKelamin: true, tanggalLahir: true } },
    },
  });
  if (!record) return NextResponse.json({ error: "Data pemeriksaan tidak ditemukan." }, { status: 404 });

  const history = await db.nutritionAssessment.findMany({
    where: { participantId: record.participantId },
    orderBy: [{ tanggalPemeriksaan: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    record: {
      id: record.id,
      namaPeserta: record.namaPeserta,
      email: record.user.username,
      school: record.participant.school,
      educationLevel: record.participant.educationLevel,
      jenisKelamin: record.jenisKelamin,
      tanggalLahir: toISODate(record.tanggalLahir),
      tanggalPemeriksaan: toISODate(record.tanggalPemeriksaan),
      usiaLabel: `${record.usiaTahun} tahun ${record.usiaBulan} bulan ${record.usiaHari} hari`,
      usiaDalamHari: record.usiaDalamHari,
      beratBadanKg: Number(record.beratBadanKg),
      tinggiBadanCm: Number(record.tinggiBadanCm),
      imt: Number(record.imt),
      tbUZscore: Number(record.tbUZscore),
      tbUPercentile: Number(record.tbUPercentile),
      tbUStatus: record.tbUStatus,
      imtUZscore: Number(record.imtUZscore),
      imtUPercentile: Number(record.imtUPercentile),
      imtUStatus: record.imtUStatus,
      bbMedianWho: record.bbMedianWho === null ? null : Number(record.bbMedianWho),
      bbMinWho: record.bbMinWho === null ? null : Number(record.bbMinWho),
      bbMaxWho: record.bbMaxWho === null ? null : Number(record.bbMaxWho),
      whoReference: record.whoReference,
      interpretation: record.interpretation,
      recommendation: record.recommendation,
      referenceStandard: record.referenceStandard,
      referenceVersion: record.referenceVersion,
      createdAt: record.createdAt,
    },
    history: history.map((h) => ({
      id: h.id,
      tanggalPemeriksaan: toISODate(h.tanggalPemeriksaan),
      usiaLabel: `${h.usiaTahun} thn ${h.usiaBulan} bln ${h.usiaHari} hr`,
      beratBadanKg: Number(h.beratBadanKg),
      tinggiBadanCm: Number(h.tinggiBadanCm),
      imt: Number(h.imt),
      tbUStatus: h.tbUStatus,
      imtUStatus: h.imtUStatus,
      bbMedianWho: h.bbMedianWho === null ? null : Number(h.bbMedianWho),
      bbMinWho: h.bbMinWho === null ? null : Number(h.bbMinWho),
      bbMaxWho: h.bbMaxWho === null ? null : Number(h.bbMaxWho),
    })),
  });
}
