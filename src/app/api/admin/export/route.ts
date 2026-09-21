import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getHbStandards, interpretHb } from "@/lib/puskesmas";
import { labelKategori } from "@/lib/puskesmas-rekap";
import { getLevel } from "@/lib/constants";

// ------------------------------------------------------------
// ADMIN — EXPORT SEMUA PESERTA (pembaruan 19 Tahap 5)
// POST { format: "xlsx" | "csv" | "pdf" }
// Admin = akses penuh: kolom LEBIH LENGKAP dari export petugas
// (termasuk NIK & telepon). Semua aksi export dicatat AuditLog.
// ------------------------------------------------------------

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));

    // Mode auditOnly: UI admin sudah merakit file sendiri dari data
    // yang sedang tampil (Excel/PDF/CSV) — endpoint ini HANYA mencatat
    // aksi export ke Log Audit. Tidak ada data yang dikirim balik.
    if (body?.auditOnly) {
      const fmt = ["xlsx", "csv", "pdf", "excel"].includes(body?.format) ? body.format : "tidak-diketahui";
      await db.auditLog
        .create({
          data: {
            actorUserId: admin.id,
            actorRole: "ADMIN",
            action: "EXPORT",
            targetType: "PARTICIPANT",
            meta: JSON.stringify({
              format: fmt,
              jumlah: Number(body.jumlah) || 0,
              // cakupan opsional (pembaruan 20 T3): export riwayat gizi
              // satu peserta memakai cakupan spesifik miliknya
              cakupan: typeof body?.cakupan === "string" && body.cakupan.trim() ? body.cakupan.trim() : "data-peserta (saringan aktif)",
            }),
          },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true });
    }

    const format = ["xlsx", "csv", "pdf"].includes(body?.format) ? body.format : null;
    if (!format) return NextResponse.json({ error: "Format export tidak valid" }, { status: 400 });

    const participants = await db.participant.findMany({
      include: {
        user: { select: { username: true, createdAt: true } },
        missionProgress: { select: { missionKey: true, status: true } },
        _count: { select: { ttdCheckIns: true } },
      },
      orderBy: [{ name: "asc" }],
    });

    const std = await getHbStandards();

    const tgl = (d: Date | string | null) =>
      d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

    // Kolom export ADMIN — lengkap (termasuk NIK & telepon)
    const kolom = [
      "No", "Nama", "Username", "NIK", "Telepon", "Usia (th)", "Jenjang", "Sekolah",
      "Kota Sekolah", "Kec. Sekolah", "Domisili Kelurahan", "Domisili Kecamatan",
      "Hb (g/dL)", "Kategori Hb", "Tgl Hb",
      "Check-in TTD", "Misi Selesai", "Pre-Test", "Post-Test", "Level", "XP",
      "Streak (mgg)", "Status Duta", "Bergabung",
    ];

    const baris = participants.map((p, i) => {
      const interp = p.hbValue !== null ? interpretHb(p.hbValue, std) : null;
      const core = p.missionProgress.filter((m) => m.status === "COMPLETED" && /^M[1-9]$/.test(m.missionKey)).length;
      return [
        i + 1,
        p.name,
        p.user.username,
        p.nik ?? "",
        p.phone ?? "",
        p.age,
        p.educationLevel,
        p.school,
        p.schoolCity ?? "",
        p.schoolDistrict ?? "",
        p.domisiliKelurahan ?? "",
        p.domisiliKecamatan ?? "",
        p.hbValue !== null ? Number(p.hbValue.toFixed(1)) : "",
        labelKategori(interp?.kategori ?? null),
        tgl(p.hbCheckDate),
        p._count.ttdCheckIns,
        `${core}/9`,
        p.preTestScore ?? "",
        p.postTestScore ?? "",
        getLevel(p.xp).level,
        p.xp,
        p.streakWeeks,
        p.isDuta ? "Duta" : p.isDutaCandidate ? "Kandidat Duta" : "-",
        tgl(p.user.createdAt),
      ];
    });

    // Audit: admin mengekspor seluruh data peserta
    await db.auditLog
      .create({
        data: {
          actorUserId: admin.id,
          actorRole: "ADMIN",
          action: "EXPORT",
          targetType: "PARTICIPANT",
          meta: JSON.stringify({ format, jumlah: participants.length, cakupan: "semua-peserta" }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      format,
      kolom,
      baris,
      meta: {
        judul: "Data Seluruh Peserta FE-ZONE",
        dicetak: new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }),
        oleh: `Admin (${admin.username})`,
        catatan: "Data lengkap seluruh peserta (termasuk NIK & telepon) — hanya untuk Admin.",
      },
    });
  } catch (e) {
    console.error("ADMIN_EXPORT_ERR", e);
    return NextResponse.json({ error: "Gagal mengekspor data" }, { status: 500 });
  }
}
