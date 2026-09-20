import { db } from "@/lib/db";
import { CORE_MISSION_KEY_RE, getLevel } from "@/lib/constants";
import { getHbStandards, interpretHb, wilayahWhere, type WilayahScope } from "@/lib/puskesmas";

// ------------------------------------------------------------
// REKAP DATA REMAJA (pembaruan 19 Tahap 5)
// Logika bersama untuk tab "Rekap & Export" petugas dan
// endpoint export. Satu baris = satu remaja dalam wilayah,
// berisi ringkasan Hb / TTD / misi / level / domisili.
// DIPAKAI BERSAMA oleh:
//   - GET  /api/puskesmas/rekap  (tampilkan di layar)
//   - POST /api/puskesmas/export (unduh Excel/CSV/PDF)
// ------------------------------------------------------------

export interface RekapFilter {
  q?: string;
  jenjang?: string;
  sekolah?: string;
  kecamatan?: string;
  hb?: string; // anemia | normal | belum
  ttd?: string; // sudah | belum
  lvl?: string; // 1-5
  duta?: string; // candidate | winner | none
}

export interface RekapRow {
  id: string;
  name: string;
  username: string;
  age: number;
  educationLevel: string;
  school: string;
  schoolDistrict: string | null;
  domisiliKecamatan: string | null;
  domisiliKelurahan: string | null;
  hbValue: number | null;
  hbCheckDate: Date | null;
  hbKategori: string | null; // BERAT | SEDANG | RINGAN | NORMAL
  hbPemeriksa: string | null;
  hbMetode: string | null;
  ttdCount: number;
  missionsCompleted: number;
  level: number;
  levelName: string;
  xp: number;
  isDuta: boolean;
  isDutaCandidate: boolean;
  joinedAt: Date;
}

export interface RekapRingkasan {
  total: number;
  cekHb: number;
  anemia: number;
  normal: number;
  ttdSudah: number;
  lulusMisi: number;
}

const BATAS_REKAP = 1000; // pengaman: rekap/export maks 1000 remaja

export async function buildRekapData(scope: WilayahScope, f: RekapFilter) {
  let participants = await db.participant.findMany({
    where: wilayahWhere(scope),
    include: {
      user: { select: { username: true, createdAt: true } },
      missionProgress: { select: { missionKey: true, status: true } },
      _count: { select: { ttdCheckIns: true } },
      hemoglobinRecords: {
        orderBy: [{ checkDate: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { checkDate: true, hbValue: true, examiner: true, method: true },
      },
    },
    orderBy: [{ name: "asc" }],
    take: BATAS_REKAP,
  });

  const std = await getHbStandards();

  let rows: RekapRow[] = participants.map((p) => {
    const hb = p.hemoglobinRecords[0] ?? null;
    const hbNilai = hb ? hb.hbValue : p.hbValue; // riwayat baru; fallback data lama
    const interp = hbNilai !== null ? interpretHb(hbNilai, std) : null;
    return {
      id: p.id,
      name: p.name,
      username: p.user.username,
      age: p.age,
      educationLevel: p.educationLevel,
      school: p.school,
      schoolDistrict: p.schoolDistrict,
      domisiliKecamatan: p.domisiliKecamatan,
      domisiliKelurahan: p.domisiliKelurahan,
      hbValue: hbNilai,
      hbCheckDate: hb ? hb.checkDate : p.hbCheckDate,
      hbKategori: interp?.kategori ?? null,
      hbPemeriksa: hb?.examiner ?? null,
      hbMetode: hb?.method ?? null,
      ttdCount: p._count.ttdCheckIns,
      missionsCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED" && CORE_MISSION_KEY_RE.test(m.missionKey)).length,
      level: getLevel(p.xp).level,
      levelName: getLevel(p.xp).name,
      xp: p.xp,
      isDuta: p.isDuta,
      isDutaCandidate: p.isDutaCandidate,
      joinedAt: p.user.createdAt,
    };
  });

  // ---- Filter (semantik identik dgn tab Data Remaja) ----
  if (f.jenjang === "SMP" || f.jenjang === "SMA") rows = rows.filter((r) => r.educationLevel === f.jenjang);
  if (f.sekolah) rows = rows.filter((r) => r.school === f.sekolah);
  if (f.kecamatan) rows = rows.filter((r) => (r.schoolDistrict || "") === f.kecamatan);
  if (f.hb === "anemia") rows = rows.filter((r) => r.hbValue !== null && r.hbValue < 12);
  if (f.hb === "normal") rows = rows.filter((r) => r.hbValue !== null && r.hbValue >= 12);
  if (f.hb === "belum") rows = rows.filter((r) => r.hbValue === null);
  if (f.hb === "berat") rows = rows.filter((r) => r.hbValue !== null && r.hbValue < 9);
  if (f.hb === "sedang") rows = rows.filter((r) => r.hbValue !== null && r.hbValue >= 9 && r.hbValue < 11);
  if (f.hb === "ringan") rows = rows.filter((r) => r.hbValue !== null && r.hbValue >= 11 && r.hbValue < 12);
  if (f.ttd === "sudah") rows = rows.filter((r) => r.ttdCount > 0);
  if (f.ttd === "belum") rows = rows.filter((r) => r.ttdCount === 0);
  if (f.lvl) {
    const n = parseInt(f.lvl, 10);
    if (n >= 1 && n <= 5) rows = rows.filter((r) => r.level === n);
  }
  if (f.duta === "candidate") rows = rows.filter((r) => r.isDutaCandidate);
  if (f.duta === "winner") rows = rows.filter((r) => r.isDuta);
  if (f.duta === "none") rows = rows.filter((r) => !r.isDutaCandidate && !r.isDuta);
  if (f.q) {
    const ql = f.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(ql) ||
        r.username.toLowerCase().includes(ql) ||
        r.school.toLowerCase().includes(ql)
    );
  }

  const ringkasan: RekapRingkasan = {
    total: rows.length,
    cekHb: rows.filter((r) => r.hbValue !== null).length,
    anemia: rows.filter((r) => r.hbValue !== null && r.hbValue < 12).length,
    normal: rows.filter((r) => r.hbValue !== null && r.hbValue >= 12).length,
    ttdSudah: rows.filter((r) => r.ttdCount > 0).length,
    lulusMisi: rows.filter((r) => r.missionsCompleted >= 9).length,
  };

  return { rows, ringkasan, dibatasi: participants.length >= BATAS_REKAP };
}

// Label kategori Hb yang ramah untuk file export
export function labelKategori(k: string | null): string {
  if (k === "BERAT") return "Anemia Berat";
  if (k === "SEDANG") return "Anemia Sedang";
  if (k === "RINGAN") return "Anemia Ringan";
  if (k === "NORMAL") return "Normal";
  return "Belum Cek";
}
