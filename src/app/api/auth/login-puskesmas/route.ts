import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

// ------------------------------------------------------------
// LOGIN PETUGAS PUSKESMAS (publik, pembaruan 19 Tahap 2)
// Hanya akun role PETUGAS. Status akun memengaruhi hasil:
// - PENDING  -> ditolak sambil menunggu verifikasi Admin
// - REJECTED -> ditolak + alasan dari admin (jika ada)
// - DISABLED -> ditolak + alasan penonaktifan (jika ada)
// - ACTIVE   -> sesi dibuat + dicatat di AuditLog
// ------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};
    if (!username || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const uname = String(username).trim().toLowerCase();
    const STAFF_INCLUDE = { puskesmasStaff: { include: { puskesmas: true } } };
    let user = await db.user.findUnique({ where: { username: uname }, include: STAFF_INCLUDE });
    if (!user) {
      // Cadangan: akun lama mungkin tersimpan dengan huruf besar/kecil campuran.
      // mode "insensitive" tidak didukung SQLite (dev lokal) → bungkus try/catch
      // agar perilaku aman di semua database (Postgres produksi tetap jalan).
      try {
        user = await db.user.findFirst({
          where: { username: { equals: uname, mode: "insensitive" } },
          include: STAFF_INCLUDE,
        });
      } catch {
        user = null;
      }
    }
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    if (user.role !== "PETUGAS" || !user.puskesmasStaff) {
      return NextResponse.json(
        { error: "Akun ini bukan petugas Puskesmas. Gunakan halaman login yang sesuai." },
        { status: 403 }
      );
    }

    const staff = user.puskesmasStaff;

    // Cegah login sebelum akun disetujui / bila dinonaktifkan
    if (staff.status === "PENDING") {
      await catatDitolak(user.id, "LOGIN_PETUGAS_DIBLOKIR", { status: "PENDING" });
      return NextResponse.json(
        { error: "Akun Anda masih menunggu verifikasi Admin. Silakan coba lagi nanti.", code: "PENDING" },
        { status: 403 }
      );
    }
    if (staff.status === "REJECTED") {
      await catatDitolak(user.id, "LOGIN_PETUGAS_DIBLOKIR", { status: "REJECTED" });
      return NextResponse.json(
        {
          error: "Pendaftaran akun Anda ditolak Admin." + (staff.catatanAdmin ? ` Alasan: ${staff.catatanAdmin}` : ""),
          code: "REJECTED",
        },
        { status: 403 }
      );
    }
    if (staff.status === "DISABLED") {
      await catatDitolak(user.id, "LOGIN_PETUGAS_DIBLOKIR", { status: "DISABLED" });
      return NextResponse.json(
        {
          error: "Akun Anda dinonaktifkan." + (staff.catatanAdmin ? ` Alasan: ${staff.catatanAdmin}` : ""),
          code: "DISABLED",
        },
        { status: 403 }
      );
    }

    await createSession(user.id);
    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: "PETUGAS",
        action: "LOGIN_PETUGAS",
        targetType: "PUSKESMAS_STAFF",
        targetUserId: user.id,
        meta: JSON.stringify({ puskesmas: staff.puskesmas.nama }),
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama: staff.nama,
        puskesmas: staff.puskesmas.nama,
      },
    });
  } catch (e) {
    console.error("LOGIN_PUSKESMAS_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat login" }, { status: 500 });
  }
}

async function catatDitolak(userId: string, action: string, meta: Record<string, unknown>) {
  await db.auditLog
    .create({
      data: {
        actorUserId: userId,
        actorRole: "PETUGAS",
        action,
        targetType: "PUSKESMAS_STAFF",
        targetUserId: userId,
        meta: JSON.stringify(meta),
      },
    })
    .catch(() => {});
}
