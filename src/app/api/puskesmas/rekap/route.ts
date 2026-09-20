import { NextRequest, NextResponse } from "next/server";
import { requirePetugas } from "@/lib/auth";
import { getWilayahScope } from "@/lib/puskesmas";
import { buildRekapData, type RekapFilter } from "@/lib/puskesmas-rekap";

// ------------------------------------------------------------
// PETUGAS — REKAP DATA REMAJA (pembaruan 19 Tahap 5)
// Semua remaja dalam wilayah kerja (kecamatan sekolah ATAU
// kelurahan domisili terpetakan) untuk tab "Rekap & Export".
// Mendukung filter yang sama dengan tab Data Remaja, tanpa
// paginasi (maks 1000 baris). TIDAK menyertakan NIK & telepon.
// ------------------------------------------------------------

export async function GET(req: NextRequest) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const f: RekapFilter = {
      q: (searchParams.get("q") || "").trim() || undefined,
      jenjang: searchParams.get("jenjang") || undefined,
      sekolah: searchParams.get("sekolah") || undefined,
      kecamatan: searchParams.get("kecamatan") || undefined,
      hb: searchParams.get("hb") || undefined,
      ttd: searchParams.get("ttd") || undefined,
      lvl: searchParams.get("lvl") || undefined,
      duta: searchParams.get("duta") || undefined,
    };

    const scope = await getWilayahScope(petugas.staff.puskesmasId);
    if (scope.kecamatanNames.length === 0 && scope.kelurahanNames.length === 0) {
      return NextResponse.json({
        rows: [], ringkasan: { total: 0, cekHb: 0, anemia: 0, normal: 0, ttdSudah: 0, lulusMisi: 0 },
        wilayah: { kecamatan: [] }, opsiSekolah: [], dibatasi: false,
      });
    }

    const { rows, ringkasan, dibatasi } = await buildRekapData(scope, f);

    const opsiSekolah = Array.from(new Set(rows.map((r) => r.school).filter(Boolean))).sort();

    return NextResponse.json({
      rows, ringkasan,
      wilayah: { kecamatan: scope.kecamatanNames.sort(), puskesmas: petugas.staff.puskesmas.nama },
      opsiSekolah, dibatasi,
    });
  } catch (e) {
    console.error("PUSKESMAS_REKAP_ERR", e);
    return NextResponse.json({ error: "Gagal memuat rekap data" }, { status: 500 });
  }
}
