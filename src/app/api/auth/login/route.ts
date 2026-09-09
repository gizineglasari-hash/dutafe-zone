import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, mode } = body ?? {};
    if (!username || !password) {
      return NextResponse.json({ error: "Email/username dan password wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username: String(username).trim().toLowerCase() },
      include: { participant: true },
    });
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: "Email/username atau password salah" }, { status: 401 });
    }

    // Jika login dari halaman admin, cek role
    if (mode === "admin" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Akun ini bukan admin" }, { status: 403 });
    }
    if (mode !== "admin" && user.role !== "PARTICIPANT") {
      return NextResponse.json({ error: "Gunakan halaman login admin untuk masuk" }, { status: 403 });
    }

    await createSession(user.id);
    if (user.participant) {
      await db.activityLog.create({
        data: { participantId: user.participant.id, type: "LOGIN" },
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.participant?.name,
        educationLevel: user.participant?.educationLevel,
      },
    });
  } catch (e) {
    console.error("LOGIN_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat login" }, { status: 500 });
  }
}
