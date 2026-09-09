import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// ------------------------------------------------------------
// Langkah 2 alur "Lupa Password":
// Halaman /reset-password mengirim token dari link email + password baru.
// Server memverifikasi: token ada, belum pernah dipakai, belum kadaluarsa.
// Setelah berhasil -> semua sesi login lama dicabut (wajib login ulang).
// ------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`rp:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi ya." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");

    if (!token) {
      return NextResponse.json({ error: "Tautan reset tidak valid" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!record || record.usedAt) {
      return NextResponse.json(
        { error: "Tautan sudah pernah dipakai atau tidak valid. Minta tautan baru lewat halaman Lupa Password ya." },
        { status: 400 }
      );
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Tautan sudah kedaluwarsa (berlaku 1 jam). Minta tautan baru lewat halaman Lupa Password ya." },
        { status: 400 }
      );
    }

    // Simpan password baru (scrypt + salt) dan cabut semua sesi lama
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash: hashPassword(password) },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Password berhasil diubah! Silakan masuk dengan password barumu.",
    });
  } catch (e) {
    console.error("RESET_PASSWORD_SELF_ERR", e);
    return NextResponse.json({ error: "Gagal mengubah password. Coba lagi ya." }, { status: 500 });
  }
}
