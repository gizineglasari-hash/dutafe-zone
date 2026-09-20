import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { CORE_MISSION_KEY_RE, getLevel } from "@/lib/constants";
import { getWilayahScope, wilayahWhere } from "@/lib/puskesmas";

// ------------------------------------------------------------
// PETUGAS — DAFTAR REMAJA WILAYAH (pembaruan 19 Tahap 3 & 5)
// Tahap 3: kecamatan sekolah remaja = kecamatan wilayah kerja.
// Tahap 5: DITAMBAH kelurahan domisili yang terpetakan ke
//          Puskesmas petugas (remaja mengisi domisili di Profil).
// Pencarian + 7 filter + paginasi server-side. Read-only.
// Filter: jenjang | sekolah | kecamatan | hb | ttd | lvl | duta
// ------------------------------------------------------------

export async function GET(req: NextRequest) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const jenjang = searchParams.get("jenjang"); // SMP | SMA
    const sekolah = searchParams.get("sekolah");
    const kecamatan = searchParams.get("kecamatan");
    const hb = searchParams.get("hb"); // anemia | normal | belum
    const ttd = searchParams.get("ttd"); // sudah | belum
    const lvl = searchParams.get("lvl"); // 1-5
    const duta = searchParams.get("duta"); // candidate | winner | none
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get("pageSize") || "20", 10) || 20));

    // ---- Wilayah kerja (Tahap 5: kecamatan + kelurahan terpetakan) ----
    const scope = await getWilayahScope(petugas.staff.puskesmasId);
    if (scope.kecamatanNames.length === 0 && scope.kelurahanNames.length === 0) {
      return NextResponse.json({
        remaja: [], total: 0, page, pageSize, totalPages: 0,
        wilayah: { kecamatan: [] },
        opsiSekolah: [],
      });
    }

    // ---- Ambil remaja dalam wilayah (sekolah ATAU domisili) ----
    const participants = await db.participant.findMany({
      where: wilayahWhere(scope),
      include: {
        user: { select: { username: true, createdAt: true } },
        badges: { select: { badgeKey: true } },
        missionProgress: { select: { missionKey: true, status: true } },
        _count: { select: { ttdCheckIns: true } },
      },
      orderBy: [{ xp: "desc" }, { name: "asc" }],
    });

    let rows = participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      avatar: p.avatar,
      age: p.age,
      school: p.school,
      schoolCity: p.schoolCity,
      schoolDistrict: p.schoolDistrict,
      educationLevel: p.educationLevel,
      phone: p.phone,
      nik: p.nik,
      username: p.user.username,
      joinedAt: p.user.createdAt,
      xp: p.xp,
      level: getLevel(p.xp).level,
      levelName: getLevel(p.xp).name,
      levelIcon: getLevel(p.xp).icon,
      missionsCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED" && CORE_MISSION_KEY_RE.test(m.missionKey)).length,
      ttdCount: p._count.ttdCheckIns,
      hbValue: p.hbValue,
      hbCheckDate: p.hbCheckDate,
      streakWeeks: p.streakWeeks,
      isDutaCandidate: p.isDutaCandidate,
      isDuta: p.isDuta,
    }));

    // ---- Filter (server-side, setelah scoping wilayah) ----
    if (jenjang === "SMP" || jenjang === "SMA") rows = rows.filter((r) => r.educationLevel === jenjang);
    if (sekolah) rows = rows.filter((r) => r.school === sekolah);
    if (kecamatan) rows = rows.filter((r) => (r.schoolDistrict || "Lainnya") === kecamatan);
    if (hb === "anemia") rows = rows.filter((r) => r.hbValue !== null && r.hbValue < 12);
    if (hb === "normal") rows = rows.filter((r) => r.hbValue !== null && r.hbValue >= 12);
    if (hb === "belum") rows = rows.filter((r) => r.hbValue === null);
    if (ttd === "sudah") rows = rows.filter((r) => r.ttdCount > 0);
    if (ttd === "belum") rows = rows.filter((r) => r.ttdCount === 0);
    if (lvl) {
      const n = parseInt(lvl, 10);
      if (n >= 1 && n <= 5) rows = rows.filter((r) => r.level === n);
    }
    if (duta === "candidate") rows = rows.filter((r) => r.isDutaCandidate);
    if (duta === "winner") rows = rows.filter((r) => r.isDuta);
    if (duta === "none") rows = rows.filter((r) => !r.isDutaCandidate && !r.isDuta);

    // ---- Pencarian (nama / username / sekolah / NIK) ----
    if (q) {
      const ql = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(ql) ||
          r.username.toLowerCase().includes(ql) ||
          r.school.toLowerCase().includes(ql) ||
          (r.nik ?? "").includes(ql)
      );
    }

    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const remaja = rows.slice(start, start + pageSize);

    // ---- Opsi filter dropdown (dari data wilayah saja) ----
    const opsiSekolah = Array.from(new Set(
      participants.map((p) => p.school).filter(Boolean)
    )).sort();

    return NextResponse.json({
      remaja, total, page, pageSize, totalPages,
      wilayah: { kecamatan: scope.kecamatanNames.sort() },
      opsiSekolah,
    });
  } catch (e) {
    console.error("PUSKESMAS_REMAYA_LIST_ERR", e);
    return NextResponse.json({ error: "Gagal memuat data remaja" }, { status: 500 });
  }
}
