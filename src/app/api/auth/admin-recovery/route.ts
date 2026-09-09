import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import { createHash, timingSafeEqual } from "crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// ------------------------------------------------------------
// PEMULIHAN AKUN ADMIN (Cara A — mandiri, lewat /admin/pulihkan)
//
// Alur: pengelola memasukkan email admin + KODE PEMULIHAN + password baru.
// Kode pemulihan diset SEKALI oleh pengelola sendiri di Vercel sebagai
// Environment Variable: ADMIN_RECOVERY_CODE (tidak pernah dikirim ke
// siapa pun, termasuk pengembang). Perbandingan kode memakai
// timingSafeEqual agar tahan timing attack.
//
// Tanpa kode di env, endpoint ini selalu menolak (Cara B: hubungi
// pengembang untuk reset via database).
// ------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`ar:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi ya." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const username = String(body?.username ?? "").trim().toLowerCase();
    const recoveryCode = String(body?.recoveryCode ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!username || !recoveryCode || !newPassword) {
      return NextResponse.json(
        { error: "Semua kolom wajib diisi (email admin, kode pemulihan, password baru)" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const expected = process.env.ADMIN_RECOVERY_CODE;
    if (!expected) {
      return NextResponse.json(
        { error: "Kode pemulihan belum diatur di server. Gunakan Cara B (hubungi pengembang program)." },
        { status: 400 }
      );
    }

    // Bandingkan kode secara aman (panjang sama via sha256 digest)
    const a = createHash("sha256").update(recoveryCode).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Kode pemulihan salah" }, { status: 403 });
    }

    const user = await db.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, role: "ADMIN" },
    });
    if (!user) {
      return NextResponse.json({ error: "Akun admin tidak ditemukan" }, { status: 404 });
    }

    // Password baru + cabut semua sesi admin yang lama
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword) },
      }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Password admin berhasil diatur ulang. Silakan login dengan password baru.",
    });
  } catch (e) {
    console.error("ADMIN_RECOVERY_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan. Coba lagi ya." }, { status: 500 });
  }
}
