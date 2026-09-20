import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// ------------------------------------------------------------
// ADMIN — LOG AUDIT (pembaruan 19 Tahap 5)
// Jejak semua aksi sensitif: login petugas/admin, membuka
// data remaja, tambah/ubah/hapus Hb, export, verifikasi akun.
// Filter: aksi | peran | pencarian | rentang tanggal + paginasi.
// Read-only: log audit tidak boleh diubah/dihapus dari UI.
// ------------------------------------------------------------

const LABEL_AKSI: Record<string, string> = {
  LOGIN_PETUGAS: "Login Petugas",
  LOGIN_ADMIN: "Login Admin",
  LOGIN_PETUGAS_DIBLOKIR: "Login Petugas Diblokir",
  VIEW_PARTICIPANT: "Buka Data Remaja",
  HB_CREATE: "Input Hb",
  HB_UPDATE: "Ubah Hb",
  HB_DELETE: "Hapus Hb",
  EXPORT: "Export Data",
  STAFF_CREATE: "Verifikasi Petugas",
  STAFF_UPDATE: "Ubah Akun Petugas",
  STAFF_DELETE: "Hapus Akun Petugas",
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const aksi = searchParams.get("aksi") || "";
    const peran = searchParams.get("peran") || "";
    const q = (searchParams.get("q") || "").trim();
    const dari = searchParams.get("dari"); // YYYY-MM-DD
    const sampai = searchParams.get("sampai"); // YYYY-MM-DD
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "25", 10) || 25));

    const where: Record<string, unknown> = {};
    if (aksi) where.action = aksi;
    if (peran) where.actorRole = peran;
    if (dari || sampai) {
      const createdAt: Record<string, Date> = {};
      if (dari) {
        const d = new Date(`${dari}T00:00:00`);
        if (!Number.isNaN(d.getTime())) createdAt.gte = d;
      }
      if (sampai) {
        const d = new Date(`${sampai}T23:59:59.999`);
        if (!Number.isNaN(d.getTime())) createdAt.lte = d;
      }
      if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
    }
    if (q) {
      where.OR = [
        { meta: { contains: q } },
        { actor: { is: { username: { contains: q } } } },
        { targetUser: { is: { username: { contains: q } } } },
      ];
    }

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { username: true } },
          targetUser: { select: { username: true } },
        },
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        waktu: l.createdAt,
        aksi: l.action,
        aksiLabel: LABEL_AKSI[l.action] ?? l.action,
        peran: l.actorRole,
        aktor: l.actor?.username ?? (l.actorUserId ? "(akun terhapus)" : "Sistem"),
        target: l.targetUser?.username ?? null,
        targetType: l.targetType,
        meta: l.meta,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      labelAksi: LABEL_AKSI,
    });
  } catch (e) {
    console.error("ADMIN_AUDIT_ERR", e);
    return NextResponse.json({ error: "Gagal memuat log audit" }, { status: 500 });
  }
}
