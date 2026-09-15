// ============================================================
// API Cek Status Gizi — PESERTA (pembaruan 17)
// POST : simpan pemeriksaan BARU (riwayat tidak pernah ditimpa)
// GET  : riwayat pemeriksaan milik peserta ini SAJA + prefill
//
// Keamanan (setara RLS, dijalankan server-side):
// - Wajib session login sebagai PARTICIPANT (requireParticipant)
// - userId/participantId SELALU diambil dari session, bukan body
// - Semua query dibatasi participantId milik pemegang session
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import {
  assess,
  parseISODate,
  toISODate,
  todayWIB,
  estimateWeightForHeight,
  WHO_REFERENCE_LABEL,
  REFERENCE_STANDARD,
  REFERENCE_VERSION,
  type Sex,
} from "@/lib/who2007";

// Website Duta Fe-Zone khusus REMAJA PUTRI → seluruh kalkulasi WHO
// otomatis memakai sex = "P" (perempuan). Jenis kelamin TIDAK ditanyakan.
const SEX_FIXED: Sex = "P";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Kamu belum masuk sebagai peserta." }, { status: 401 });

  const participant = await db.participant.findUnique({
    where: { id: auth.participantId },
    select: { name: true, jenisKelamin: true, tanggalLahir: true },
  });
  const records = await db.nutritionAssessment.findMany({
    where: { participantId: auth.participantId },
    orderBy: [{ tanggalPemeriksaan: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    prefill: {
      nama: participant?.name ?? auth.user.name ?? "",
      jenisKelamin: participant?.jenisKelamin ?? "",
      tanggalLahir: participant?.tanggalLahir ? toISODate(participant.tanggalLahir) : "",
    },
    today: todayWIB(),
    records: records.map((r) => ({
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
      bbMedianWho: r.bbMedianWho === null ? null : Number(r.bbMedianWho),
      bbMinWho: r.bbMinWho === null ? null : Number(r.bbMinWho),
      bbMaxWho: r.bbMaxWho === null ? null : Number(r.bbMaxWho),
      whoReference: r.whoReference,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Kamu belum masuk sebagai peserta." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data yang dikirim tidak valid." }, { status: 400 });
  }

  // jenis kelamin TIDAK diambil dari body — otomatis perempuan (remaja putri)
  const jenisKelamin: Sex = SEX_FIXED;
  const dobISO = typeof body.tanggalLahir === "string" ? body.tanggalLahir : "";
  const checkISO = typeof body.tanggalPemeriksaan === "string" && body.tanggalPemeriksaan ? body.tanggalPemeriksaan : todayWIB();
  const berat = num(body.beratBadanKg);
  const tinggi = num(body.tinggiBadanCm);

  if (!parseISODate(dobISO) || berat === null || tinggi === null) {
    return NextResponse.json({ error: "Lengkapi tanggal lahir, berat badan, dan tinggi badan terlebih dahulu." }, { status: 400 });
  }
  if (!parseISODate(checkISO)) return NextResponse.json({ error: "Tanggal pemeriksaan belum benar." }, { status: 400 });

  // tanggal pemeriksaan tidak boleh masa depan
  if (checkISO > todayWIB()) {
    return NextResponse.json({ error: "Tanggal pemeriksaan tidak boleh di masa depan." }, { status: 400 });
  }

  const result = assess({ sex: jenisKelamin, dobISO, checkISO, weightKg: berat, heightCm: tinggi });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const participant = await db.participant.findUnique({
    where: { id: auth.participantId },
    select: { name: true },
  });
  const nama = participant?.name ?? auth.user.name ?? "Peserta";

  // ---- PERKIRAAN BB SESUAI TINGGI BADAN (WHO 2007 perempuan) ----
  // BB = IMT acuan (median / −2 SD / +1 SD) × TB(m)² — memakai tabel LMS
  // yang SAMA dengan z-score IMT/U. Null bila referensi tidak tersedia
  // (jangan pernah mengarang angka — spek bagian J).
  const bbEst = estimateWeightForHeight(tinggi, result.age.monthsLms);

  const created = await db.nutritionAssessment.create({
    data: {
      userId: auth.user.id, // dari session — bukan dari body
      participantId: auth.participantId,
      namaPeserta: nama,
      jenisKelamin,
      tanggalLahir: parseISODate(dobISO)!,
      tanggalPemeriksaan: parseISODate(checkISO)!,
      usiaTahun: result.age.years,
      usiaBulan: result.age.months,
      usiaHari: result.age.days,
      usiaDalamHari: result.age.totalDays,
      beratBadanKg: berat,
      tinggiBadanCm: tinggi,
      imt: result.imt,
      tbUZscore: result.tbU.z,
      tbUPercentile: result.tbU.percentile,
      tbUStatus: result.tbU.status,
      imtUZscore: result.imtU.z,
      imtUPercentile: result.imtU.percentile,
      imtUStatus: result.imtU.status,
      bbMedianWho: bbEst ? bbEst.bbMedian : null,
      bbMinWho: bbEst ? bbEst.bbMin : null,
      bbMaxWho: bbEst ? bbEst.bbMax : null,
      whoReference: bbEst ? WHO_REFERENCE_LABEL : null,
      referenceStandard: REFERENCE_STANDARD,
      referenceVersion: REFERENCE_VERSION,
      interpretation: result.interpretation,
      recommendation: result.recommendation,
    },
  });

  // ingat jenis kelamin & tanggal lahir agar pengecekan berikutnya terisi otomatis
  await db.participant
    .update({
      where: { id: auth.participantId },
      data: { jenisKelamin, tanggalLahir: parseISODate(dobISO)! },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    record: {
      id: created.id,
      tanggalPemeriksaan: toISODate(created.tanggalPemeriksaan),
      usiaLabel: result.age.label,
      beratBadanKg: Number(created.beratBadanKg),
      tinggiBadanCm: Number(created.tinggiBadanCm),
      imt: Number(created.imt),
      tbUZscore: Number(created.tbUZscore),
      tbUPercentile: Number(created.tbUPercentile),
      tbUStatus: created.tbUStatus,
      imtUZscore: Number(created.imtUZscore),
      imtUPercentile: Number(created.imtUPercentile),
      imtUStatus: created.imtUStatus,
      bbMedianWho: created.bbMedianWho === null ? null : Number(created.bbMedianWho),
      bbMinWho: created.bbMinWho === null ? null : Number(created.bbMinWho),
      bbMaxWho: created.bbMaxWho === null ? null : Number(created.bbMaxWho),
      whoReference: created.whoReference,
      createdAt: created.createdAt,
    },
    hasil: {
      usia: result.age.label,
      usiaDalamHari: result.age.totalDays,
      imt: result.imt,
      beratKg: berat,
      tinggiCm: tinggi,
      tbU: result.tbU,
      imtU: result.imtU,
      bbPerkiraan: bbEst
        ? {
            tersedia: true,
            bbMedian: bbEst.bbMedian,
            bbMin: bbEst.bbMin,
            bbMax: bbEst.bbMax,
            bmiMedian: bbEst.bmiMedian,
            bmiMinus2SD: bbEst.bmiMinus2SD,
            bmiPlus1SD: bbEst.bmiPlus1SD,
            referensi: WHO_REFERENCE_LABEL,
          }
        : { tersedia: false, pesan: "Perkiraan BB sesuai tinggi badan belum dapat dihitung karena referensi WHO belum tersedia." },
      interpretation: result.interpretation,
      recommendation: result.recommendation,
      referenceStandard: REFERENCE_STANDARD,
    },
  });
}
