import { NextResponse } from "next/server";
import { requirePetugas } from "@/lib/auth";

// ------------------------------------------------------------
// PROFIL PETUGAS YANG LOGIN (pembaruan 19 Tahap 2)
// Dipakai /dashboard-puskesmas. Selalu cek sesi + status
// ACTIVE di server (pola otorisasi route-per-route).
// ------------------------------------------------------------

export async function GET() {
  const auth = await requirePetugas();
  if (!auth) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });
  }

  const { user, staff } = auth;
  const wilayah = [...staff.puskesmas.wilayah].sort((a, b) =>
    (a.kelurahan.kecamatan?.nama ?? "").localeCompare(b.kelurahan.kecamatan?.nama ?? "") ||
    a.kelurahan.nama.localeCompare(b.kelurahan.nama)
  );

  return NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role },
    staff: {
      id: staff.id,
      nama: staff.nama,
      jabatan: staff.jabatan,
      profesi: staff.profesi,
      puskesmas: {
        id: staff.puskesmas.id,
        nama: staff.puskesmas.nama,
        alamat: staff.puskesmas.alamat,
        telp: staff.puskesmas.telp,
      },
      wilayah,
    },
  });
}
