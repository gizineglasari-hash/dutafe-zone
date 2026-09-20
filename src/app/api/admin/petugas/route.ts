import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// ------------------------------------------------------------
// ADMIN — DAFTAR PETUGAS PUSKESMAS (pembaruan 19 Tahap 2)
// GET ?stats=1 -> hanya jumlah per status (untuk badge tab)
// GET          -> daftar lengkap + filter status & pencarian
// Semua aksi sensitif dicatat di AuditLog.
// ------------------------------------------------------------

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statsOnly = searchParams.get("stats") === "1";

    const all = await db.puskesmasStaff.findMany({
      include: {
        user: { select: { id: true, username: true, createdAt: true } },
        puskesmas: { include: { wilayah: { select: { id: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: all.length,
      PENDING: all.filter((s) => s.status === "PENDING").length,
      ACTIVE: all.filter((s) => s.status === "ACTIVE").length,
      DISABLED: all.filter((s) => s.status === "DISABLED").length,
      REJECTED: all.filter((s) => s.status === "REJECTED").length,
    };
    if (statsOnly) {
      return NextResponse.json({ ok: true, stats });
    }

    const status = searchParams.get("status") ?? "";
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    let rows = all;
    if (status && ["PENDING", "ACTIVE", "DISABLED", "REJECTED"].includes(status)) {
      rows = rows.filter((s) => s.status === status);
    }
    if (q) {
      rows = rows.filter((s) =>
        [s.nama, s.user.username, s.jabatan, s.profesi, s.puskesmas.nama]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      ok: true,
      stats,
      rows: rows.map((s) => ({
        id: s.id,
        userId: s.userId,
        email: s.user.username,
        nama: s.nama,
        jabatan: s.jabatan,
        profesi: s.profesi,
        status: s.status,
        catatanAdmin: s.catatanAdmin,
        createdAt: s.createdAt,
        verifiedAt: s.verifiedAt,
        puskesmas: { id: s.puskesmas.id, nama: s.puskesmas.nama },
        wilayahCount: s.puskesmas.wilayah.length,
      })),
    });
  } catch (e) {
    console.error("ADMIN_PETUGAS_LIST_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat data petugas" }, { status: 500 });
  }
}
