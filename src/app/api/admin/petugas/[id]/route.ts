import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getDaftarProfesi } from "@/lib/puskesmas";

// ------------------------------------------------------------
// ADMIN — DETAIL & AKSI PETUGAS (pembaruan 19 Tahap 2)
// 9 operasi manajemen petugas:
//   1. GET    detail petugas + jejak audit
//   2. PATCH  approve   — setujui pendaftaran
//   3. PATCH  reject    — tolak pendaftaran (+ alasan)
//   4. PATCH  disable   — nonaktifkan akun (+ alasan)
//   5. PATCH  enable    — aktifkan kembali
//   6. PATCH  move      — pindahkan ke Puskesmas lain
//   7. PATCH  update    — ubah nama/jabatan/profesi
//   8. PATCH  reset-password — ganti password akun petugas
//   9. DELETE — hapus akun beserta datanya
// Setiap aksi dicatat di AuditLog (actor = admin).
// ------------------------------------------------------------

type Params = { params: Promise<{ id: string }> };

async function loadStaff(id: string) {
  return db.puskesmasStaff.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, createdAt: true } },
      puskesmas: { include: { wilayah: { include: { kelurahan: { include: { kecamatan: true } } } } } },
    },
  });
}

async function audit(actorUserId: string, action: string, targetUserId: string, meta: Record<string, unknown>) {
  await db.auditLog
    .create({
      data: {
        actorUserId,
        actorRole: "ADMIN",
        action,
        targetType: "PUSKESMAS_STAFF",
        targetUserId,
        meta: JSON.stringify(meta),
      },
    })
    .catch(() => {});
}

// ===== 1) DETAIL =====
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });

  try {
    const { id } = await params;
    const staff = await loadStaff(id);
    if (!staff) return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 404 });

    const [auditLogs, hbCount] = await Promise.all([
      db.auditLog.findMany({
        where: { OR: [{ actorUserId: staff.userId }, { targetUserId: staff.userId }] },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.hemoglobinRecord.count({ where: { staffId: staff.id } }),
    ]);

    return NextResponse.json({
      ok: true,
      row: {
        id: staff.id,
        userId: staff.userId,
        email: staff.user.username,
        nama: staff.nama,
        jabatan: staff.jabatan,
        profesi: staff.profesi,
        status: staff.status,
        catatanAdmin: staff.catatanAdmin,
        createdAt: staff.createdAt,
        verifiedAt: staff.verifiedAt,
        puskesmas: { id: staff.puskesmas.id, nama: staff.puskesmas.nama },
        wilayah: staff.puskesmas.wilayah.map((w) => ({
          kelurahan: w.kelurahan.nama,
          kecamatan: w.kelurahan.kecamatan?.nama ?? null,
        })),
        hbCount,
      },
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorRole: a.actorRole,
        createdAt: a.createdAt,
        meta: a.meta,
      })),
    });
  } catch (e) {
    console.error("ADMIN_PETUGAS_DETAIL_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat detail" }, { status: 500 });
  }
}

// ===== 2-8) AKSI =====
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body ?? {};
    const staff = await loadStaff(id);
    if (!staff) return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 404 });

    switch (action) {
      // 2) Setujui pendaftaran
      case "approve": {
        if (staff.status === "ACTIVE") {
          return NextResponse.json({ error: "Akun sudah aktif" }, { status: 409 });
        }
        await db.puskesmasStaff.update({
          where: { id: staff.id },
          data: { status: "ACTIVE", verifiedAt: new Date(), verifiedBy: admin.id, catatanAdmin: null },
        });
        await audit(admin.id, "PETUGAS_APPROVE", staff.userId, { nama: staff.nama, statusSebelum: staff.status });
        return NextResponse.json({ ok: true, message: `${staff.nama} disetujui dan kini dapat login.` });
      }

      // 3) Tolak pendaftaran (+ alasan)
      case "reject": {
        if (staff.status !== "PENDING") {
          return NextResponse.json({ error: "Hanya pendaftaran berstatus Menunggu Verifikasi yang bisa ditolak" }, { status: 409 });
        }
        const reason = String(body?.reason ?? "").trim() || null;
        await db.puskesmasStaff.update({
          where: { id: staff.id },
          data: { status: "REJECTED", verifiedAt: new Date(), verifiedBy: admin.id, catatanAdmin: reason },
        });
        await audit(admin.id, "PETUGAS_REJECT", staff.userId, { nama: staff.nama, alasan: reason });
        return NextResponse.json({ ok: true, message: `Pendaftaran ${staff.nama} ditolak.` });
      }

      // 4) Nonaktifkan akun (+ alasan)
      case "disable": {
        if (staff.status !== "ACTIVE") {
          return NextResponse.json({ error: "Hanya akun aktif yang bisa dinonaktifkan" }, { status: 409 });
        }
        const reason = String(body?.reason ?? "").trim() || null;
        await db.puskesmasStaff.update({
          where: { id: staff.id },
          data: { status: "DISABLED", catatanAdmin: reason },
        });
        await db.session.deleteMany({ where: { userId: staff.userId } });
        await audit(admin.id, "PETUGAS_DISABLE", staff.userId, { nama: staff.nama, alasan: reason });
        return NextResponse.json({ ok: true, message: `Akun ${staff.nama} dinonaktifkan.` });
      }

      // 5) Aktifkan kembali
      case "enable": {
        if (staff.status !== "DISABLED" && staff.status !== "REJECTED") {
          return NextResponse.json({ error: "Hanya akun nonaktif/ditolak yang bisa diaktifkan kembali" }, { status: 409 });
        }
        await db.puskesmasStaff.update({
          where: { id: staff.id },
          data: {
            status: "ACTIVE",
            verifiedAt: staff.verifiedAt ?? new Date(),
            verifiedBy: admin.id,
            catatanAdmin: null,
          },
        });
        await audit(admin.id, "PETUGAS_ENABLE", staff.userId, { nama: staff.nama, statusSebelum: staff.status });
        return NextResponse.json({ ok: true, message: `Akun ${staff.nama} kembali aktif.` });
      }

      // 6) Pindahkan ke Puskesmas lain
      case "move": {
        const puskesmasId = String(body?.puskesmasId ?? "");
        const target = await db.masterPuskesmas.findUnique({ where: { id: puskesmasId } });
        if (!target || !target.isActive) {
          return NextResponse.json({ error: "Puskesmas tujuan tidak ditemukan / tidak aktif" }, { status: 404 });
        }
        if (target.id === staff.puskesmasId) {
          return NextResponse.json({ error: "Petugas sudah terdaftar di Puskesmas tersebut" }, { status: 409 });
        }
        await db.puskesmasStaff.update({
          where: { id: staff.id },
          data: { puskesmasId: target.id },
        });
        await audit(admin.id, "PETUGAS_MOVE", staff.userId, {
          nama: staff.nama,
          dari: staff.puskesmas.nama,
          ke: target.nama,
        });
        return NextResponse.json({ ok: true, message: `${staff.nama} dipindahkan ke ${target.nama}.` });
      }

      // 7) Ubah nama/jabatan/profesi
      case "update": {
        const data: { nama?: string; jabatan?: string | null; profesi?: string } = {};
        if (body?.nama !== undefined) {
          const nama = String(body.nama).trim();
          if (nama.length < 3 || nama.length > 100) {
            return NextResponse.json({ error: "Nama harus 3-100 karakter" }, { status: 400 });
          }
          data.nama = nama;
        }
        if (body?.jabatan !== undefined) {
          const jabatan = String(body.jabatan ?? "").trim();
          if (jabatan.length > 100) {
            return NextResponse.json({ error: "Jabatan maksimal 100 karakter" }, { status: 400 });
          }
          data.jabatan = jabatan || null;
        }
        if (body?.profesi !== undefined) {
          const daftar = await getDaftarProfesi();
          if (!daftar.includes(String(body.profesi))) {
            return NextResponse.json({ error: "Profesi tidak ada dalam daftar" }, { status: 400 });
          }
          data.profesi = String(body.profesi);
        }
        if (Object.keys(data).length === 0) {
          return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
        }
        await db.puskesmasStaff.update({ where: { id: staff.id }, data });
        await audit(admin.id, "PETUGAS_UPDATE", staff.userId, { nama: staff.nama, perubahan: data });
        return NextResponse.json({ ok: true, message: `Data ${staff.nama} diperbarui.` });
      }

      // 8) Reset password akun petugas
      case "reset-password": {
        const newPassword = String(body?.newPassword ?? "");
        if (newPassword.length < 6) {
          return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
        }
        await db.user.update({
          where: { id: staff.userId },
          data: { passwordHash: hashPassword(newPassword) },
        });
        await db.session.deleteMany({ where: { userId: staff.userId } });
        await audit(admin.id, "PETUGAS_RESET_PASSWORD", staff.userId, { nama: staff.nama });
        return NextResponse.json({ ok: true, message: `Password ${staff.nama} berhasil direset.` });
      }

      default:
        return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    }
  } catch (e) {
    console.error("ADMIN_PETUGAS_PATCH_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat memproses aksi" }, { status: 500 });
  }
}

// ===== 9) HAPUS =====
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });

  try {
    const { id } = await params;
    const staff = await loadStaff(id);
    if (!staff) return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 404 });

    const jumlahHb = await db.hemoglobinRecord.count({ where: { staffId: staff.id } });
    await audit(admin.id, "PETUGAS_DELETE", staff.userId, {
      nama: staff.nama,
      email: staff.user.username,
      puskesmas: staff.puskesmas.nama,
      jumlahHb,
    });
    // AuditLog.actor/target memakai SetNull — jejak audit tetap ada
    await db.user.delete({ where: { id: staff.userId } });
    return NextResponse.json({ ok: true, message: `Akun ${staff.nama} dihapus.` });
  } catch (e) {
    console.error("ADMIN_PETUGAS_DELETE_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat menghapus petugas" }, { status: 500 });
  }
}
