import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PROFESI_DEFAULT, getDaftarProfesi } from "@/lib/puskesmas";

// ------------------------------------------------------------
// DAFTAR PUSKESMAS + PROFESI (publik, pembaruan 19 Tahap 2)
// Dipakai halaman /register-puskesmas: pencarian Puskesmas
// dari daftar RESMI (tidak boleh ketik bebas) + isi otomatis
// wilayah kerja (hanya-baca) + pilihan profesi.
// Tidak ada data sensitif — hanya nama/alamat/telp/wilayah.
// ------------------------------------------------------------

export async function GET() {
  try {
    const [rows, profesi] = await Promise.all([
      db.masterPuskesmas.findMany({
        where: { isActive: true },
        orderBy: { nama: "asc" },
        include: {
          kecamatan: true,
          wilayah: { include: { kelurahan: { include: { kecamatan: true } } } },
        },
      }),
      getDaftarProfesi().catch(() => PROFESI_DEFAULT),
    ]);

    return NextResponse.json({
      ok: true,
      profesi,
      puskesmas: rows.map((p) => ({
        id: p.id,
        nama: p.nama,
        alamat: p.alamat,
        telp: p.telp,
        kecamatan: p.kecamatan?.nama ?? null,
        wilayah: p.wilayah.map((w) => ({
          kelurahan: w.kelurahan.nama,
          kecamatan: w.kelurahan.kecamatan?.nama ?? null,
        })),
      })),
    });
  } catch (e) {
    console.error("PUSKESMAS_DIRECTORY_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat daftar Puskesmas" }, { status: 500 });
  }
}
