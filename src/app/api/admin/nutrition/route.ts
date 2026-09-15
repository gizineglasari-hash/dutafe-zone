// ============================================================
// API Cek Status Gizi — ADMIN (pembaruan 17)
// GET : daftar semua pemeriksaan + filter + pencarian + urutan
//       + 4 kartu statistik (total, orang, hari ini, bulan ini)
//
// Keamanan (setara RLS, server-side):
// - Wajib session dengan role ADMIN (requireAdmin)
// - Peserta biasa mendapat 403
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseISODate, toISODate, todayWIB } from "@/lib/who2007";

const MAX_ROWS = 2000;

function addDaysISO(iso: string, n: number): string {
  const d = parseISODate(iso)!;
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

function firstOfMonthISO(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function resolveRange(params: URLSearchParams): { from: string | null; to: string | null; error?: string } {
  const period = params.get("period") || "all";
  const today = todayWIB();
  if (period === "all") return { from: null, to: null };
  if (period === "today") return { from: today, to: today };
  if (period === "7d") return { from: addDaysISO(today, -6), to: today };
  if (period === "30d") return { from: addDaysISO(today, -29), to: today };
  if (period === "month") return { from: firstOfMonthISO(today), to: today };
  if (period === "custom") {
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    if (!parseISODate(from) || !parseISODate(to)) return { from: null, to: null, error: "Rentang tanggal kustom belum benar." };
    if (from > to) return { from: null, to: null, error: "Tanggal awal melebihi tanggal akhir." };
    return { from, to };
  }
  return { from: null, to: null };
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });

  const url = new URL(req.url);
  const sp = url.searchParams;
  const range = resolveRange(sp);
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 });

  const gender = sp.get("gender") === "L" || sp.get("gender") === "P" ? sp.get("gender") : "";
  const tbStatus = sp.get("tbStatus") || "";
  const imtStatus = sp.get("imtStatus") || "";
  const school = (sp.get("school") || "").trim();
  const usiaMin = Number(sp.get("usiaMin") || "");
  const usiaMax = Number(sp.get("usiaMax") || "");
  const q = (sp.get("q") || "").trim().toLowerCase();
  const sort = sp.get("sort") || "terbaru";

  // ---------- WHERE ----------
  const and: Record<string, unknown>[] = [];
  if (range.from && range.to) {
    and.push({ tanggalPemeriksaan: { gte: parseISODate(range.from)! } });
    and.push({ tanggalPemeriksaan: { lte: parseISODate(range.to)! } });
  }
  if (gender) and.push({ jenisKelamin: gender });
  if (tbStatus) and.push({ tbUStatus: tbStatus });
  if (imtStatus) and.push({ imtUStatus: imtStatus });
  if (school) and.push({ participant: { school } });
  if (Number.isFinite(usiaMin) && usiaMin > 0) and.push({ usiaTahun: { gte: usiaMin } });
  if (Number.isFinite(usiaMax) && usiaMax > 0) and.push({ usiaTahun: { lte: usiaMax } });

  const where = and.length ? { AND: and } : {};

  // ---------- SORT ----------
  const orderBy: Record<string, string>[] = [];
  switch (sort) {
    case "terlama": orderBy.push({ tanggalPemeriksaan: "asc" }, { createdAt: "asc" }); break;
    case "nama_az": orderBy.push({ namaPeserta: "asc" }); break;
    case "nama_za": orderBy.push({ namaPeserta: "desc" }); break;
    case "bb_desc": orderBy.push({ beratBadanKg: "desc" }, { tanggalPemeriksaan: "desc" }); break;
    case "tb_desc": orderBy.push({ tinggiBadanCm: "desc" }, { tanggalPemeriksaan: "desc" }); break;
    case "imt_desc": orderBy.push({ imt: "desc" }, { tanggalPemeriksaan: "desc" }); break;
    default: orderBy.push({ tanggalPemeriksaan: "desc" }, { createdAt: "desc" });
  }

  const rowsRaw = await db.nutritionAssessment.findMany({
    where,
    orderBy,
    take: MAX_ROWS,
    include: {
      user: { select: { username: true } },
      participant: { select: { school: true, educationLevel: true } },
    },
  });

  // pencarian (nama / email / sekolah) — dibuat di sisi server agar aman & konsisten
  const rows = q
    ? rowsRaw.filter(
        (r) =>
          r.namaPeserta.toLowerCase().includes(q) ||
          r.user.username.toLowerCase().includes(q) ||
          (r.participant.school || "").toLowerCase().includes(q)
      )
    : rowsRaw;

  // daftar sekolah (untuk dropdown filter sekolah)
  const schoolRows = await db.participant.findMany({
    select: { school: true },
    distinct: ["school"],
    orderBy: { school: "asc" },
  });

  // ---------- STATISTIK GLOBAL (tidak terpengaruh filter) ----------
  const today = todayWIB();
  const [totalPemeriksaan, todayCount, monthCount, orangRows] = await Promise.all([
    db.nutritionAssessment.count(),
    db.nutritionAssessment.count({ where: { tanggalPemeriksaan: parseISODate(today)! } }),
    db.nutritionAssessment.count({
      where: { tanggalPemeriksaan: { gte: parseISODate(firstOfMonthISO(today))! } },
    }),
    db.nutritionAssessment.findMany({ select: { participantId: true }, distinct: ["participantId"] }),
  ]);

  return NextResponse.json({
    stats: {
      totalPemeriksaan,
      totalOrang: orangRows.length,
      hariIni: todayCount,
      bulanIni: monthCount,
    },
    today,
    schools: schoolRows.map((s) => s.school).filter((s): s is string => Boolean(s)),
    rows: rows.map((r) => ({
      id: r.id,
      namaPeserta: r.namaPeserta,
      email: r.user.username,
      school: r.participant.school,
      educationLevel: r.participant.educationLevel,
      jenisKelamin: r.jenisKelamin,
      tanggalLahir: toISODate(r.tanggalLahir),
      tanggalPemeriksaan: toISODate(r.tanggalPemeriksaan),
      usiaLabel: `${r.usiaTahun} tahun ${r.usiaBulan} bulan ${r.usiaHari} hari`,
      usiaTahun: r.usiaTahun,
      usiaBulan: r.usiaBulan,
      usiaHari: r.usiaHari,
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
      interpretation: r.interpretation,
      recommendation: r.recommendation,
      referenceStandard: r.referenceStandard,
      createdAt: r.createdAt,
    })),
  });
}
