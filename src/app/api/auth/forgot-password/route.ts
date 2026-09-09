import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { randomBytes } from "crypto";
import { isMailConfigured, sendResetPasswordMail } from "@/lib/mail";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// ------------------------------------------------------------
// Langkah 1 alur "Lupa Password":
// Peserta memasukkan email -> jika akun terdaftar, kirim tautan
// reset (berlaku 1 jam, sekali pakai) ke email tersebut.
//
// Keamanan:
// - Respons selalu umum -> tidak membocorkan email mana yang terdaftar
// - Yang disimpan di database hanya HASH token (sha256)
// - Rate limit 5 permintaan / 15 menit / IP
// ------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`fp:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi ya." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Masukkan email yang valid ya" }, { status: 400 });
    }

    // Layanan email belum diatur di Vercel -> arahkan ke jalur manual
    if (!isMailConfigured()) {
      return NextResponse.json({
        ok: true,
        emailConfigured: false,
        message:
          "Layanan email untuk reset password belum aktif. Untuk sementara, hubungi pengelola program (guru/pembina/petugas Dinkes) atau gunakan halaman pemulihan admin.",
      });
    }

    // Cari akun berdasarkan username (di FE-ZONE, username = email pendaftaran).
    // Cari tanpa memedulikan huruf besar/kecil agar akun lama tetap ketemu.
    const user = await db.user.findFirst({
      where: { username: { equals: email, mode: "insensitive" } },
      include: { participant: true },
    });

    // Respons umum untuk semua kasus (akun ada/tidak) — anti enumerasi
    const genericMessage =
      "Jika email tersebut terdaftar di FE-ZONE, tautan reset password sudah dikirim. Cek Kotak Masuk atau folder Spam. Tautan berlaku 1 jam.";

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Satu token aktif per akun: hapus token lama yang belum dipakai
      await db.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      });

      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "dutafe-zone.vercel.app";
      const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

      try {
        await sendResetPasswordMail(user.username, user.participant?.name ?? "", resetUrl);
      } catch (err) {
        console.error("FORGOT_PASSWORD_MAIL_ERR", err);
        return NextResponse.json({
          ok: true,
          emailConfigured: true,
          emailSent: false,
          message:
            "Hampir berhasil! Namun email gagal terkirim. Coba lagi beberapa saat, atau hubungi pengelola program untuk reset manual.",
        });
      }
    }

    return NextResponse.json({ ok: true, emailConfigured: true, emailSent: true, message: genericMessage });
  } catch (e) {
    console.error("FORGOT_PASSWORD_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan. Coba lagi ya." }, { status: 500 });
  }
}
