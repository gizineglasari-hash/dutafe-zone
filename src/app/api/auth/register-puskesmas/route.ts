import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getDaftarProfesi } from "@/lib/puskesmas";

// ------------------------------------------------------------
// REGISTRASI PETUGAS PUSKESMAS (publik, pembaruan 19 Tahap 2)
// Alur: petugas memilih Puskesmas dari daftar resmi (tidak
// boleh ketik bebas), mengisi jabatan & profesi, lalu akun
// dibuat dengan status PENDING — "Menunggu Verifikasi Admin".
// Admin menyetujui/menolak lewat tab Manajemen Petugas.
// ------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nama, jabatan, profesi, puskesmasId, username, password, phone } = body ?? {};

    // ===== Validasi field wajib =====
    if (!nama || !profesi || !puskesmasId || !username || !password || !phone) {
      return NextResponse.json({ error: "Semua field bertanda * wajib diisi" }, { status: 400 });
    }

    const namaBersih = String(nama).trim();
    if (namaBersih.length < 3 || namaBersih.length > 100) {
      return NextResponse.json({ error: "Nama lengkap harus 3-100 karakter" }, { status: 400 });
    }

    const jabatanBersih = jabatan ? String(jabatan).trim() : "";
    if (jabatanBersih.length > 100) {
      return NextResponse.json({ error: "Jabatan maksimal 100 karakter" }, { status: 400 });
    }

    // ===== Puskesmas WAJIB dari daftar resmi (anti ketik bebas) =====
    const puskesmas = await db.masterPuskesmas.findUnique({ where: { id: String(puskesmasId) } });
    if (!puskesmas || !puskesmas.isActive) {
      return NextResponse.json(
        { error: "Puskesmas tidak ditemukan dalam daftar. Silakan hubungi Admin." },
        { status: 400 }
      );
    }

    // ===== Profesi harus dari daftar =====
    const daftarProfesi = await getDaftarProfesi();
    if (!daftarProfesi.includes(String(profesi))) {
      return NextResponse.json({ error: "Pilih profesi dari daftar yang tersedia" }, { status: 400 });
    }

    // ===== Nomor telepon/WhatsApp (aturan sama dgn registrasi peserta) =====
    const phoneRaw = String(phone ?? "").replace(/[\s\-().]/g, "");
    if (!phoneRaw) {
      return NextResponse.json({ error: "Nomor telepon/WhatsApp wajib diisi" }, { status: 400 });
    }
    let phoneNorm = phoneRaw;
    if (phoneNorm.startsWith("+62")) phoneNorm = "0" + phoneNorm.slice(3);
    else if (phoneNorm.startsWith("62")) phoneNorm = "0" + phoneNorm.slice(2);
    if (!/^08[0-9]{7,12}$/.test(phoneNorm)) {
      return NextResponse.json(
        { error: "Format nomor telepon tidak valid. Gunakan format 08xxxxxxxxxx" },
        { status: 400 }
      );
    }

    // ===== Email (dipakai sebagai akun login) =====
    const uname = String(username).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uname)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const exists = await db.user.findUnique({ where: { username: uname } });
    if (exists) {
      return NextResponse.json({ error: "Email sudah terdaftar. Gunakan email lain atau hubungi Admin." }, { status: 409 });
    }

    // ===== Simpan: User role PETUGAS + staf status PENDING =====
    const user = await db.user.create({
      data: {
        username: uname,
        passwordHash: hashPassword(String(password)),
        role: "PETUGAS",
        puskesmasStaff: {
          create: {
            nama: namaBersih,
            jabatan: jabatanBersih || null,
            profesi: String(profesi),
            puskesmasId: puskesmas.id,
            status: "PENDING",
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: "PETUGAS",
        action: "PETUGAS_REGISTER",
        targetType: "PUSKESMAS_STAFF",
        targetUserId: user.id,
        meta: JSON.stringify({ puskesmas: puskesmas.nama, profesi: String(profesi) }),
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Pendaftaran berhasil. Akun Anda menunggu verifikasi Admin.",
      status: "PENDING",
    });
  } catch (e) {
    console.error("REGISTER_PUSKESMAS_ERR", e);
    return NextResponse.json({ error: "Terjadi kesalahan saat pendaftaran" }, { status: 500 });
  }
}
