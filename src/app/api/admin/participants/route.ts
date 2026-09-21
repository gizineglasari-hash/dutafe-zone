import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CORE_MISSION_KEY_RE, getLevel } from "@/lib/constants";
import { getWilayahScope, dalamWilayah } from "@/lib/puskesmas";
import { parseISODate, todayWIB } from "@/lib/who2007";

// ------------------------------------------------------------
// ADMIN — DAFTAR PENGGUNA (pembaruan 20 Tahap 2)
// Kolom Status Gizi TERAKHIR kini terintegrasi langsung di
// sini (satu sumber data: tabel nutrition_assessments — sama
// dengan milik remaja & petugas; TIDAK ada tabel baru).
// Untuk tiap peserta diambil SATU baris pemeriksaan paling
// akhir (tanggal terbaru, lalu created_at terbaru).
// Filter baru: gizi | tbStatus | imtStatus | usiaMin |
// usiaMax | kecamatan | kelurahan | puskesmas.
// Pencarian q: nama / email(username) / sekolah.
// Semua data tetap asli — tanpa dummy.
// ------------------------------------------------------------

/** Kolom ringkas pemeriksaan terakhir per peserta. */
const GIZI_SELECT = {
  participantId: true,
  tanggalPemeriksaan: true,
  beratBadanKg: true,
  tinggiBadanCm: true,
  imt: true,
  tbUZscore: true,
  tbUStatus: true,
  imtUZscore: true,
  imtUStatus: true,
} as const;

type GiziBaris = {
  participantId: string;
  tanggalPemeriksaan: Date;
  beratBadanKg: { toString(): string } | number;
  tinggiBadanCm: { toString(): string } | number;
  imt: { toString(): string } | number;
  tbUZscore: { toString(): string } | number;
  tbUStatus: string;
  imtUZscore: { toString(): string } | number;
  imtUStatus: string;
};

function dec(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number(v);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level"); // SMP | SMA | null (semua)
  const school = searchParams.get("school");
  const q = (searchParams.get("q") || "").trim();
  const lvl = searchParams.get("lvl"); // level XP 1-5
  const duta = searchParams.get("duta"); // candidate | winner | none
  // pembaruan 20 Tahap 2 — filter status gizi
  const gizi = (searchParams.get("gizi") || "").trim(); // "belum" | nama status IMT/U
  const tbStatus = (searchParams.get("tbStatus") || "").trim();
  const imtStatus = (searchParams.get("imtStatus") || "").trim();
  const usiaMin = parseInt(searchParams.get("usiaMin") || "", 10);
  const usiaMax = parseInt(searchParams.get("usiaMax") || "", 10);
  const kecamatan = (searchParams.get("kecamatan") || "").trim();
  const kelurahan = (searchParams.get("kelurahan") || "").trim();
  const puskesmasNama = (searchParams.get("puskesmas") || "").trim();

  const where: Record<string, unknown> = {};
  if (level === "SMP" || level === "SMA") where.educationLevel = level;
  if (school) where.school = school;
  if (duta === "candidate") where.isDutaCandidate = true;
  if (duta === "winner") where.isDuta = true;

  const participants = await db.participant.findMany({
    where,
    include: {
      badges: true,
      missionProgress: true,
      user: { select: { username: true, createdAt: true } },
      videoSubmissions: { where: { status: "PENDING" } },
      _count: { select: { ttdCheckIns: true } },
    },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
  });

  let rows = participants.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    school: p.school,
    schoolCity: p.schoolCity,
    schoolDistrict: p.schoolDistrict,
    schoolType: p.schoolType,
    educationLevel: p.educationLevel,
    phone: p.phone,
    nik: p.nik,
    username: p.user.username,
    joinedAt: p.user.createdAt,
    xp: p.xp,
    level: getLevel(p.xp).level,
    levelName: getLevel(p.xp).name,
    levelIcon: getLevel(p.xp).icon,
    badges: p.badges.map((b) => b.badgeKey),
    missionsCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED" && CORE_MISSION_KEY_RE.test(m.missionKey)).length,
    ttdTaken: p._count.ttdCheckIns,
    hbValue: p.hbValue,
    hbCheckDate: p.hbCheckDate,
    streakWeeks: p.streakWeeks,
    preTestScore: p.preTestScore,
    postTestScore: p.postTestScore,
    isDutaCandidate: p.isDutaCandidate,
    isDuta: p.isDuta,
    hasPendingVideo: p.videoSubmissions.length > 0,
    domisiliKecamatan: p.domisiliKecamatan,
    domisiliKelurahan: p.domisiliKelurahan,
    gizi: null as null | {
      tanggalPemeriksaan: string;
      bb: number;
      tb: number;
      imt: number;
      tbUZ: number;
      tbUStatus: string;
      imtUZ: number;
      imtUStatus: string;
    },
  }));

  if (lvl) {
    const n = parseInt(lvl, 10);
    rows = rows.filter((r) => r.level === n);
  }

  // ---- Pencarian (nama / email / sekolah) — pembaruan 20 ----
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(ql) ||
        r.username.toLowerCase().includes(ql) ||
        r.school.toLowerCase().includes(ql)
    );
  }

  // ---- Pemeriksaan terakhir per peserta (SATU query) ----
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const semua = await db.nutritionAssessment.findMany({
      where: { participantId: { in: ids } },
      orderBy: [{ tanggalPemeriksaan: "desc" }, { createdAt: "desc" }],
      select: GIZI_SELECT,
    });
    const terakhir = new Map<string, GiziBaris>();
    for (const g of semua as unknown as GiziBaris[]) {
      if (!terakhir.has(g.participantId)) terakhir.set(g.participantId, g);
    }
    for (const r of rows) {
      const g = terakhir.get(r.id);
      if (g) {
        r.gizi = {
          tanggalPemeriksaan: g.tanggalPemeriksaan.toISOString(),
          bb: dec(g.beratBadanKg),
          tb: dec(g.tinggiBadanCm),
          imt: dec(g.imt),
          tbUZ: dec(g.tbUZscore),
          tbUStatus: g.tbUStatus,
          imtUZ: dec(g.imtUZscore),
          imtUStatus: g.imtUStatus,
        };
      }
    }
  }

  // ---- Filter status gizi (terhadap hasil TERAKHIR) ----
  if (gizi === "belum") rows = rows.filter((r) => r.gizi === null);
  else if (gizi) rows = rows.filter((r) => r.gizi?.imtUStatus === gizi);
  if (tbStatus) rows = rows.filter((r) => r.gizi?.tbUStatus === tbStatus);
  if (imtStatus) rows = rows.filter((r) => r.gizi?.imtUStatus === imtStatus);
  if (Number.isFinite(usiaMin) && usiaMin > 0) rows = rows.filter((r) => r.age >= usiaMin);
  if (Number.isFinite(usiaMax) && usiaMax > 0) rows = rows.filter((r) => r.age <= usiaMax);
  if (kecamatan) rows = rows.filter((r) => (r.schoolDistrict || "") === kecamatan || (r.domisiliKecamatan || "") === kecamatan);
  if (kelurahan) rows = rows.filter((r) => (r.domisiliKelurahan || "") === kelurahan);
  if (puskesmasNama) {
    const psm = await db.masterPuskesmas.findFirst({ where: { nama: puskesmasNama } });
    if (!psm) {
      rows = [];
    } else {
      const scope = await getWilayahScope(psm.id);
      rows = rows.filter((r) =>
        dalamWilayah(scope, { schoolDistrict: r.schoolDistrict, domisiliKelurahan: r.domisiliKelurahan })
      );
    }
  }

  // ---- Opsi dropdown (dari seluruh data, tidak terpengaruh filter) ----
  const semuaPeserta = await db.participant.findMany({
    select: { schoolDistrict: true, domisiliKecamatan: true, domisiliKelurahan: true },
  });
  const opsiKecamatan = Array.from(
    new Set(semuaPeserta.map((p) => p.schoolDistrict).concat(semuaPeserta.map((p) => p.domisiliKecamatan)).filter((v): v is string => Boolean(v)))
  ).sort();
  const opsiKelurahan = Array.from(
    new Set(semuaPeserta.map((p) => p.domisiliKelurahan).filter((v): v is string => Boolean(v)))
  ).sort();
  const opsiPuskesmas = (await db.masterPuskesmas.findMany({ select: { nama: true }, orderBy: { nama: "asc" } })).map((p) => p.nama);

  // ---- Statistik pemeriksaan (dipindah dari tab Status Gizi lama) ----
  const today = todayWIB();
  const firstOfMonth = today.slice(0, 8) + "01";
  const [totalPemeriksaan, todayCount, monthCount, orangRows] = await Promise.all([
    db.nutritionAssessment.count(),
    db.nutritionAssessment.count({ where: { tanggalPemeriksaan: parseISODate(today)! } }),
    db.nutritionAssessment.count({ where: { tanggalPemeriksaan: { gte: parseISODate(firstOfMonth)! } } }),
    db.nutritionAssessment.findMany({ select: { participantId: true }, distinct: ["participantId"] }),
  ]);

  const schools = Array.from(new Set((await db.participant.findMany({ select: { school: true } })).map((s) => s.school))).sort();

  return NextResponse.json({
    participants: rows,
    schools,
    opsiKecamatan,
    opsiKelurahan,
    opsiPuskesmas,
    giziStats: {
      totalPemeriksaan,
      totalOrang: orangRows.length,
      hariIni: todayCount,
      bulanIni: monthCount,
    },
  });
}

// Hapus peserta beserta SELURUH datanya (misi, XP, badge, check-in,
// video, konten komunitas, sesi login, dst). Dilindungi dialog
// konfirmasi di sisi UI; di sini divalidasi ulang:
// - hanya akun PARTICIPANT yang boleh dihapus (admin tidak bisa)
// - ContentLike dihapus manual (tidak ter-relasi ke User di schema)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const participantId = String(body?.participantId ?? "");
    if (!participantId) {
      return NextResponse.json({ error: "participantId wajib diisi" }, { status: 400 });
    }

    const participant = await db.participant.findUnique({
      where: { id: participantId },
      include: { user: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }
    if (participant.user.role !== "PARTICIPANT") {
      return NextResponse.json({ error: "Akun admin tidak dapat dihapus lewat daftar peserta" }, { status: 403 });
    }

    await db.$transaction([
      db.contentLike.deleteMany({ where: { userId: participant.userId } }),
      db.user.delete({ where: { id: participant.userId } }),
    ]);

    return NextResponse.json({ ok: true, name: participant.name, username: participant.user.username });
  } catch (e) {
    console.error("DELETE_PARTICIPANT_ERR", e);
    return NextResponse.json({ error: "Gagal menghapus peserta" }, { status: 500 });
  }
}
