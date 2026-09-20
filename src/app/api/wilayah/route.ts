import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

// ------------------------------------------------------------
// WILAYAH — cascade kecamatan -> kelurahan -> Puskesmas rujukan
// (pembaruan 19 Tahap 5, untuk kartu "Wilayah Domisili" di
// Profil remaja).
//   GET /api/wilayah                 -> daftar kecamatan (aktif)
//   GET /api/wilayah?kecamatan=X     -> daftar kelurahan X + nama
//                                       Puskesmas rujukan tiap
//                                       kelurahan (bila terpetakan)
// Data induk resmi Dinkes (Tahap 1) — tidak ada input bebas.
// Hanya peserta yang sedang login yang boleh memanggil.
// ------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const kecamatan = (searchParams.get("kecamatan") || "").trim();

    if (!kecamatan) {
      const rows = await db.masterKecamatan.findMany({
        where: { isActive: true },
        orderBy: { nama: "asc" },
        select: { nama: true },
      });
      return NextResponse.json({ kecamatan: rows.map((k) => k.nama) });
    }

    const kec = await db.masterKecamatan.findFirst({ where: { nama: kecamatan } });
    if (!kec) return NextResponse.json({ error: "Kecamatan tidak ditemukan" }, { status: 404 });

    const kelurahan = await db.masterKelurahan.findMany({
      where: { kecamatanId: kec.id, isActive: true },
      orderBy: { nama: "asc" },
      include: { wilayah: { include: { puskesmas: { select: { nama: true } } } } },
    });

    return NextResponse.json({
      kecamatan: kec.nama,
      kelurahan: kelurahan.map((k) => ({
        nama: k.nama,
        puskesmas: k.wilayah?.puskesmas?.nama ?? null,
      })),
    });
  } catch (e) {
    console.error("WILAYAH_ERR", e);
    return NextResponse.json({ error: "Gagal memuat data wilayah" }, { status: 500 });
  }
}
