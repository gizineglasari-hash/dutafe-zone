import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";

// Reset password peserta oleh admin.
// Dipakai untuk alur "lupa password": peserta menghubungi pengelola,
// pengelola (admin) mengatur password sementara dari panel Data Peserta.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const participantId = String(body?.participantId ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!participantId || !newPassword) {
      return NextResponse.json({ error: "participantId dan newPassword wajib diisi" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const participant = await db.participant.findUnique({
      where: { id: participantId },
      include: { user: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }

    await db.user.update({
      where: { id: participant.userId },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true, username: participant.user.username });
  } catch (e) {
    console.error("RESET_PASSWORD_ERR", e);
    return NextResponse.json({ error: "Gagal mereset password" }, { status: 500 });
  }
}
