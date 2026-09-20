import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { getPuskesmasRujukan } from "@/lib/puskesmas";

const AVATARS = ["🌸", "🌟", "🦋", "🌺", "⚡", "🍀", "💖", "🌞", "🌙", "🐉", "🎀", "🦸‍♀️"];

export async function PATCH(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { avatar, domisiliKecamatan, domisiliKelurahan } = body ?? {};
  const data: { avatar?: string; domisiliKecamatan?: string | null; domisiliKelurahan?: string | null } = {};

  if (avatar !== undefined) {
    if (avatar && !AVATARS.includes(avatar)) {
      return NextResponse.json({ error: "Avatar tidak valid" }, { status: 400 });
    }
    data.avatar = avatar || auth.user.avatar || "🌸";
  }

  // ---- Wilayah Domisili (pembaruan 19 Tahap 5) ----
  // Remaja memilih kecamatan + kelurahan dari daftar RESMI (data induk
  // Dinkes Tahap 1) — tidak boleh ketik bebas. Sistem otomatis mencari
  // Puskesmas rujukan dari pemetaan wilayah kerja. Kosong = hapus domisili.
  let puskesmasRujukan: string | null | undefined;
  if (domisiliKecamatan !== undefined || domisiliKelurahan !== undefined) {
    const kecNama = domisiliKecamatan ? String(domisiliKecamatan).trim() : "";
    const kelNama = domisiliKelurahan ? String(domisiliKelurahan).trim() : "";
    if (!kecNama && kelNama) {
      return NextResponse.json({ error: "Pilih kecamatan dulu sebelum kelurahan" }, { status: 400 });
    }
    if (kecNama) {
      const kec = await db.masterKecamatan.findFirst({ where: { nama: kecNama } });
      if (!kec) return NextResponse.json({ error: "Kecamatan tidak valid" }, { status: 400 });
      if (kelNama) {
        const kel = await db.masterKelurahan.findFirst({
          where: { nama: kelNama, kecamatanId: kec.id },
        });
        if (!kel) {
          return NextResponse.json(
            { error: "Kelurahan tidak valid untuk kecamatan yang dipilih" },
            { status: 400 }
          );
        }
        puskesmasRujukan = await getPuskesmasRujukan(kelNama, kecNama);
      }
      data.domisiliKecamatan = kecNama;
      data.domisiliKelurahan = kelNama || null;
    } else {
      // keduanya kosong -> bersihkan domisili
      data.domisiliKecamatan = null;
      data.domisiliKelurahan = null;
      puskesmasRujukan = null;
    }
  }

  // ---- Pemeriksaan Hemoglobin (pembaruan 19 Tahap 4) ----
  // Hasil Hb TIDAK lagi diinput peserta sendiri. Hanya petugas
  // Puskesmas yang boleh mencatat lewat endpoint khusus
  // (/api/puskesmas/remaja/[id]/hemoglobin) — data lama dari
  // pembaruan 15 tetap ditampilkan sebagai "Hb terakhir".

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
  }

  const p = await db.participant.update({
    where: { id: auth.participantId },
    data,
  });
  return NextResponse.json({
    ok: true,
    avatar: p.avatar,
    hbValue: p.hbValue,
    hbCheckDate: p.hbCheckDate,
    domisiliKecamatan: p.domisiliKecamatan,
    domisiliKelurahan: p.domisiliKelurahan,
    puskesmasRujukan: puskesmasRujukan ?? null,
  });
}

export async function GET() {
  return NextResponse.json({ avatars: AVATARS });
}
