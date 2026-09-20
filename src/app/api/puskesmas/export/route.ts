import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { getWilayahScope } from "@/lib/puskesmas";
import { buildRekapData, labelKategori, type RekapFilter } from "@/lib/puskesmas-rekap";

// ------------------------------------------------------------
// PETUGAS — EXPORT REKAP (pembaruan 19 Tahap 5)
// POST { format: "xlsx" | "csv" | "pdf", ...filter }
// Mengirim data baris (JSON) yang akan dirakit menjadi file
// di browser (SheetJS / jsPDF — dependensi sudah ada).
// PENTING (keamanan/privasi):
//  - Hanya remaja wilayah kerja Puskesmas petugas.
//  - Kolom TIDAK menyertakan NIK & nomor telepon (hanya Admin).
//  - Setiap export dicatat di AuditLog (action EXPORT).
// ------------------------------------------------------------

export async function POST(req: NextRequest) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const format = ["xlsx", "csv", "pdf"].includes(body?.format) ? body.format : null;
    if (!format) return NextResponse.json({ error: "Format export tidak valid" }, { status: 400 });

    const f: RekapFilter = {
      q: body.q || undefined,
      jenjang: body.jenjang || undefined,
      sekolah: body.sekolah || undefined,
      kecamatan: body.kecamatan || undefined,
      hb: body.hb || undefined,
      ttd: body.ttd || undefined,
      lvl: body.lvl || undefined,
      duta: body.duta || undefined,
    };

    const scope = await getWilayahScope(petugas.staff.puskesmasId);
    const { rows, ringkasan } = await buildRekapData(scope, f);

    const tgl = (d: Date | string | null) =>
      d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

    // Kolom export PETUGAS — tanpa NIK & telepon
    const kolom = [
      "No", "Nama", "Username", "Usia (th)", "Jenjang", "Sekolah", "Kec. Sekolah",
      "Domisili Kelurahan", "Domisili Kecamatan",
      "Hb (g/dL)", "Kategori Hb", "Tgl Hb", "Pemeriksa", "Metode",
      "Check-in TTD", "Misi Selesai", "Level", "XP", "Status Duta", "Bergabung",
    ];

    const baris = rows.map((r, i) => [
      i + 1,
      r.name,
      r.username,
      r.age,
      r.educationLevel,
      r.school,
      r.schoolDistrict ?? "",
      r.domisiliKelurahan ?? "",
      r.domisiliKecamatan ?? "",
      r.hbValue !== null ? Number(r.hbValue.toFixed(1)) : "",
      labelKategori(r.hbKategori),
      tgl(r.hbCheckDate),
      r.hbPemeriksa ?? "",
      r.hbMetode ?? "",
      r.ttdCount,
      `${r.missionsCompleted}/9`,
      r.level,
      r.xp,
      r.isDuta ? "Duta" : r.isDutaCandidate ? "Kandidat Duta" : "-",
      tgl(r.joinedAt),
    ]);

    // Audit: petugas mengekspor data remaja (selalu dicatat)
    await db.auditLog
      .create({
        data: {
          actorUserId: petugas.user.id,
          actorRole: "PETUGAS",
          action: "EXPORT",
          targetType: "PARTICIPANT",
          meta: JSON.stringify({
            format,
            jumlah: rows.length,
            puskesmas: petugas.staff.puskesmas.nama,
            filter: Object.fromEntries(Object.entries(f).filter(([, v]) => v)),
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      format,
      kolom,
      baris,
      ringkasan,
      meta: {
        judul: `Rekap Remaja Wilayah — ${petugas.staff.puskesmas.nama}`,
        dicetak: new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }),
        oleh: `${petugas.staff.nama} (${petugas.staff.profesi})`,
        catatan: "Data hanya remaja wilayah kerja Puskesmas. Kolom NIK & telepon tidak disertakan.",
      },
    });
  } catch (e) {
    console.error("PUSKESMAS_EXPORT_ERR", e);
    return NextResponse.json({ error: "Gagal mengekspor data" }, { status: 500 });
  }
}
