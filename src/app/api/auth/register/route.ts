import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getMissionProgress } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, school, schoolCity, schoolDistrict, schoolType, educationLevel, username, password, phone } = body ?? {};

    if (!name || !age || !school || !educationLevel || !username || !password) {
      return NextResponse.json({ error: "Semua field wajib diisi ya!" }, { status: 400 });
    }

    // ===== Validasi nomor telepon/WhatsApp (wajib utk pendaftar baru) =====
    // Terima 08xx / +628xx / 628xx, dengan atau tanpa spasi & strip.
    const phoneRaw = String(phone ?? "").replace(/[\s\-().]/g, "");
    if (!phoneRaw) {
      return NextResponse.json({ error: "Nomor telepon/WhatsApp wajib diisi ya!" }, { status: 400 });
    }
    let phoneNorm = phoneRaw;
    if (phoneNorm.startsWith("+62")) phoneNorm = "0" + phoneNorm.slice(3);
    else if (phoneNorm.startsWith("62")) phoneNorm = "0" + phoneNorm.slice(2);
    if (!/^08[0-9]{7,12}$/.test(phoneNorm)) {
      return NextResponse.json(
        { error: "Format nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx (9-13 digit setelah 08)" },
        { status: 400 }
      );
    }
    if (educationLevel !== "SMP" && educationLevel !== "SMA") {
      return NextResponse.json({ error: "Pilih tingkat pendidikan: SMP atau SMA" }, { status: 400 });
    }
    const ageNum = parseInt(String(age), 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 25) {
      return NextResponse.json({ error: "Masukkan usia yang valid (10-25 tahun)" }, { status: 400 });
    }
    const uname = String(username).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uname)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const exists = await db.user.findUnique({ where: { username: uname } });
    if (exists) {
      return NextResponse.json({ error: "Email/username sudah terdaftar. Coba login ya!" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        username: uname,
        passwordHash: hashPassword(String(password)),
        role: "PARTICIPANT",
        participant: {
          create: {
            name: String(name).trim(),
            age: ageNum,
            school: String(school).trim(),
            schoolCity: schoolCity ? String(schoolCity).trim() : null,
            schoolDistrict: schoolDistrict ? String(schoolDistrict).trim() : null,
            schoolType: schoolType ? String(schoolType).trim() : null,
            educationLevel,
            phone: phoneNorm,
          },
        },
      },
      include: { participant: true },
    });

    // Inisialisasi semua mission progress
    const missions = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"];
    for (const m of missions) {
      await getMissionProgress(user.participant!.id, m);
    }
    await db.activityLog.create({
      data: { participantId: user.participant!.id, type: "REGISTER", meta: educationLevel },
    });

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      message: `Selamat datang, ${user.participant!.name}! Kamu resmi menjadi Pejuang Fe-Zone!`,
      user: { id: user.id, username: user.username, role: "PARTICIPANT", name: user.participant!.name, educationLevel },
    });
  } catch (e) {
    console.error("REGISTER_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat registrasi" }, { status: 500 });
  }
}
