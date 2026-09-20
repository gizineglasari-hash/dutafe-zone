import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { getHbStandards, interpretHb, syncParticipantHb } from "@/lib/puskesmas";
import { sendPushToParticipant } from "@/lib/push";

// ------------------------------------------------------------
// PETUGAS — INPUT HASIL PEMERIKSAAN HEMOGLOBIN (pembaruan 19 Tahap 4)
// POST /api/puskesmas/remaja/[id]/hemoglobin
// - Hanya remaja dalam wilayah kerja Puskesmas petugas (guard sama
//   dengan endpoint detail).
// - Nama pemeriksa OTOMATIS = nama petugas yang sedang login
//   (tidak bisa diketik bebas dari klien).
// - Setiap pemeriksaan = baris BARU di HemoglobinRecord (riwayat
//   tidak pernah ditimpa). "Hb terakhir" peserta disinkronkan.
// - Interpretasi otomatis memakai standar AppSetting "hb_standards".
// - Peserta menerima notifikasi push bahwa hasilnya diperbarui.
// - Setiap aksi tercatat di AuditLog (HB_CREATE).
// ------------------------------------------------------------

type Params = { params: Promise<{ id: string }> };

const METODE_MAX = 100;
const LOKASI_MAX = 150;
const CATATAN_MAX = 500;

export async function POST(req: NextRequest, { params }: Params) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const hbValue = typeof body.hbValue === "number" ? body.hbValue : parseFloat(String(body.hbValue ?? "").replace(",", "."));
    const checkDateRaw = String(body.checkDate ?? "").trim();
    const method = typeof body.method === "string" ? body.method.trim().slice(0, METODE_MAX) : null;
    const location = typeof body.location === "string" ? body.location.trim().slice(0, LOKASI_MAX) : null;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, CATATAN_MAX) : null;

    // ---- Validasi nilai Hb (sama seperti aturan lama: 3,0-25,0) ----
    if (!Number.isFinite(hbValue) || hbValue < 3 || hbValue > 25) {
      return NextResponse.json(
        { error: "VALIDASI", message: "Nilai Hb harus angka antara 3,0 sampai 25,0 g/dL." },
        { status: 400 }
      );
    }

    // ---- Validasi tanggal pemeriksaan ----
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDateRaw)) {
      return NextResponse.json(
        { error: "VALIDASI", message: "Tanggal pemeriksaan wajib diisi." },
        { status: 400 }
      );
    }
    const checkDate = new Date(checkDateRaw + "T00:00:00");
    if (Number.isNaN(checkDate.getTime())) {
      return NextResponse.json(
        { error: "VALIDASI", message: "Tanggal pemeriksaan tidak valid." },
        { status: 400 }
      );
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (checkDate > today) {
      return NextResponse.json(
        { error: "VALIDASI", message: "Tanggal pemeriksaan tidak boleh di masa depan." },
        { status: 400 }
      );
    }

    // ---- Remaja harus ada & dalam wilayah kerja petugas ----
    const p = await db.participant.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true, schoolDistrict: true },
    });
    if (!p) return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });

    const kecamatanSet = new Set<string>();
    for (const w of petugas.staff.puskesmas.wilayah) {
      const kec = w.kelurahan.kecamatan?.nama;
      if (kec) kecamatanSet.add(kec);
    }
    if (!p.schoolDistrict || !kecamatanSet.has(p.schoolDistrict)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melihat data pengguna ini." },
        { status: 403 }
      );
    }

    const hbBulat = Math.round(hbValue * 10) / 10; // 1 desimal
    const std = await getHbStandards();
    const interpretasi = interpretHb(hbBulat, std);

    // ---- Simpan sebagai riwayat BARU (riwayat lama tidak ditimpa) ----
    const record = await db.hemoglobinRecord.create({
      data: {
        participantId: p.id,
        checkDate,
        hbValue: hbBulat,
        method: method || null,
        location: location || null,
        examiner: petugas.staff.nama, // otomatis dari petugas yang login
        notes: notes || null,
        recordedByUserId: petugas.user.id,
        staffId: petugas.staff.id,
      },
    });

    // ---- Sinkronkan "Hb terakhir" peserta ----
    await syncParticipantHb(p.id);

    // ---- Audit: pencatatan Hb baru ----
    await db.auditLog.create({
      data: {
        actorUserId: petugas.user.id,
        actorRole: "PETUGAS",
        action: "HB_CREATE",
        targetType: "HEMOGLOBIN_RECORD",
        targetUserId: p.userId,
        meta: JSON.stringify({
          participantId: p.id,
          namaRemaja: p.name,
          recordId: record.id,
          hbValue: hbBulat,
          kategori: interpretasi.kategori,
          puskesmas: petugas.staff.puskesmas.nama,
        }),
      },
    }).catch(() => {}); // audit tidak boleh memblokir penyimpanan

    // ---- Notifikasi push ke peserta (aman jika belum disetel) ----
    await sendPushToParticipant(p.userId, {
      title: "🩸 Hasil Pemeriksaan Hb",
      body: "Hasil pemeriksaan kesehatan kamu telah diperbarui oleh petugas Puskesmas.",
      url: "/?tab=profil",
      tag: "hb-update",
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        checkDate: record.checkDate,
        hbValue: record.hbValue,
        method: record.method,
        location: record.location,
        examiner: record.examiner,
        notes: record.notes,
      },
      interpretasi,
    });
  } catch (e) {
    console.error("PUSKESMAS_HB_CREATE_ERR", e);
    return NextResponse.json({ error: "Gagal menyimpan hasil pemeriksaan" }, { status: 500 });
  }
}
