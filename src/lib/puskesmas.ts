import { db } from "@/lib/db";

// ------------------------------------------------------------
// Utilitas bersama fitur Puskesmas (pembaruan 19)
// ------------------------------------------------------------

// Daftar profesi bawaan. Admin bisa mengganti lewat AppSetting
// key "profesi_petugas" (JSON array) — kalau tidak ada/invalid,
// pakai daftar default ini.
export const PROFESI_DEFAULT = [
  "Ahli Gizi",
  "Bidan",
  "Perawat",
  "Nutritionis",
  "Teknisi Laboratorium Medik",
  "Sanitarian",
  "Petugas Kesehatan",
  "Tenaga Administrasi Kesehatan",
];

export async function getDaftarProfesi(): Promise<string[]> {
  const setting = await db.appSetting.findUnique({ where: { key: "profesi_petugas" } });
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === "string")) {
        return parsed;
      }
    } catch {
      // nilai tidak valid → pakai default
    }
  }
  return PROFESI_DEFAULT;
}

// ------------------------------------------------------------
// Standar interpretasi Hemoglobin (pembaruan 19 Tahap 4)
// ------------------------------------------------------------
// Batas bawaan mengikuti standar Kemenkes/WHO untuk remaja putri:
//   Normal          : Hb >= 12,0 g/dL
//   Anemia Ringan   : 11,0 - 11,9
//   Anemia Sedang   : 9,0 - 10,9
//   Anemia Berat    : < 9,0
// Admin dapat menyesuaikan ambang lewat AppSetting key
// "hb_standards" (JSON: anemiaBelow, beratBelow, sedangBelow).
// Kalau tidak ada/nilai tidak masuk akal, dipakai default di atas.
export interface HbStandards {
  anemiaBelow: number; // di bawah nilai ini = anemia (default 12)
  beratBelow: number; // di bawah nilai ini = anemia berat (default 9)
  sedangBelow: number; // di bawah nilai ini = anemia sedang (default 11)
}

export const HB_STANDARDS_DEFAULT: HbStandards = {
  anemiaBelow: 12,
  beratBelow: 9,
  sedangBelow: 11,
};

export async function getHbStandards(): Promise<HbStandards> {
  const setting = await db.appSetting.findUnique({ where: { key: "hb_standards" } });
  if (setting?.value) {
    try {
      const p = JSON.parse(setting.value) as Partial<HbStandards>;
      const anemiaBelow = Number(p.anemiaBelow);
      const beratBelow = Number(p.beratBelow);
      const sedangBelow = Number(p.sedangBelow);
      const ok =
        Number.isFinite(anemiaBelow) && Number.isFinite(beratBelow) && Number.isFinite(sedangBelow) &&
        beratBelow < sedangBelow && sedangBelow < anemiaBelow &&
        anemiaBelow >= 8 && anemiaBelow <= 20;
      if (ok) return { anemiaBelow, beratBelow, sedangBelow };
    } catch {
      // nilai tidak valid → pakai default
    }
  }
  return HB_STANDARDS_DEFAULT;
}

export type HbKategori = "BERAT" | "SEDANG" | "RINGAN" | "NORMAL";

export interface HbInterpretasi {
  kategori: HbKategori;
  label: string;
  pesan: string;
}

export function interpretHb(hb: number, std: HbStandards): HbInterpretasi {
  if (hb < std.beratBelow) {
    return {
      kategori: "BERAT",
      label: "Anemia Berat",
      pesan: "Segera periksakan diri ke Puskesmas untuk penanganan lebih lanjut ya.",
    };
  }
  if (hb < std.sedangBelow) {
    return {
      kategori: "SEDANG",
      label: "Anemia Sedang",
      pesan: "Konsultasikan ke petugas Puskesmas & rutin minum TTD 1 tablet sehari.",
    };
  }
  if (hb < std.anemiaBelow) {
    return {
      kategori: "RINGAN",
      label: "Anemia Ringan",
      pesan: "Rutin minum TTD & perbanyak makanan kaya zat besi ya!",
    };
  }
  return {
    kategori: "NORMAL",
    label: "Normal",
    pesan: "Pertahankan! Tetap rutin minum TTD & makan makanan bergizi seimbang.",
  };
}

// Sinkronkan "Hb terakhir" peserta (Participant.hbValue/hbCheckDate)
// dari tabel riwayat HemoglobinRecord: ambil rekaman dengan tanggal
// pemeriksaan TERBARU. Dipanggil setelah tambah/ubah/hapus rekaman.
export async function syncParticipantHb(participantId: string): Promise<void> {
  const terbaru = await db.hemoglobinRecord.findFirst({
    where: { participantId },
    orderBy: [{ checkDate: "desc" }, { createdAt: "desc" }],
  });
  await db.participant.update({
    where: { id: participantId },
    data: {
      hbValue: terbaru ? terbaru.hbValue : null,
      hbCheckDate: terbaru ? terbaru.checkDate : null,
    },
  });
}

// ------------------------------------------------------------
// Scoping wilayah kerja Puskesmas (pembaruan 19 Tahap 5)
// ------------------------------------------------------------
// Satu remaja dianggap "dalam wilayah" Puskesmas bila SALAH SATU:
//   1. Kecamatan SEKOLAHnya termasuk kecamatan wilayah kerja
//      (aturan Tahap 3 — tetap berlaku), ATAU
//   2. Kelurahan DOMISILInya terpetakan ke Puskesmas ini
//      (baru Tahap 5 — remaja mengisi domisili di Profil,
//      sistem otomatis memetakan kelurahan -> Puskesmas).
// Helper ini mengambil daftar nama kecamatan + kelurahan milik
// SATU Puskesmas agar semua route memakai aturan yang sama.
export interface WilayahScope {
  kecamatanNames: string[];
  kelurahanNames: string[];
}

export async function getWilayahScope(puskesmasId: string): Promise<WilayahScope> {
  const wilayah = await db.puskesmasWilayah.findMany({
    where: { puskesmasId },
    include: { kelurahan: { include: { kecamatan: true } } },
  });
  const kecamatanNames = new Set<string>();
  const kelurahanNames = new Set<string>();
  for (const w of wilayah) {
    kelurahanNames.add(w.kelurahan.nama);
    if (w.kelurahan.kecamatan?.nama) kecamatanNames.add(w.kelurahan.kecamatan.nama);
  }
  return { kecamatanNames: Array.from(kecamatanNames), kelurahanNames: Array.from(kelurahanNames) };
}

// Klausa Prisma "where" untuk mengambil SEMUA remaja dalam wilayah
// (kecamatan sekolah ATAU kelurahan domisili terpetakan).
export function wilayahWhere(scope: WilayahScope) {
  const or: Record<string, unknown>[] = [];
  if (scope.kecamatanNames.length > 0) or.push({ schoolDistrict: { in: scope.kecamatanNames } });
  if (scope.kelurahanNames.length > 0) or.push({ domisiliKelurahan: { in: scope.kelurahanNames } });
  return or.length > 0 ? { OR: or } : { id: { in: [] } }; // wilayah kosong -> hasil kosong
}

// Cek apakah SATU remaja berada dalam wilayah (untuk guard detail).
export function dalamWilayah(
  scope: WilayahScope,
  remaja: { schoolDistrict?: string | null; domisiliKelurahan?: string | null }
): boolean {
  if (remaja.schoolDistrict && scope.kecamatanNames.includes(remaja.schoolDistrict)) return true;
  if (remaja.domisiliKelurahan && scope.kelurahanNames.includes(remaja.domisiliKelurahan)) return true;
  return false;
}

// Nama Puskesmas rujukan untuk sebuah kelurahan (bila terpetakan).
// Dipakai UI profil remaja + validasi domisili.
export async function getPuskesmasRujukan(
  kelurahanNama: string,
  kecamatanNama: string | null
): Promise<string | null> {
  const kel = await db.masterKelurahan.findFirst({
    where: { nama: kelurahanNama, ...(kecamatanNama ? { kecamatan: { nama: kecamatanNama } } : {}) },
    include: { wilayah: { include: { puskesmas: { select: { nama: true } } } } },
  });
  return kel?.wilayah?.puskesmas?.nama ?? null;
}
