import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { getHbStandards, interpretHb, syncParticipantHb, getWilayahScope, dalamWilayah } from "@/lib/puskesmas";
import { sendPushToParticipant } from "@/lib/push";

// ------------------------------------------------------------
// PETUGAS — UBAH / HAPUS REKAMAN HEMOGLOBIN (pembaruan 19 Tahap 4)
// PATCH  /api/puskesmas/remaja/[id]/hemoglobin/[recordId]
// DELETE /api/puskesmas/remaja/[id]/hemoglobin/[recordId]
// Aturan:
// - Remaja harus dalam wilayah kerja petugas (guard wilayah).
// - Rekaman hanya bisa diubah/dihapus oleh petugas PUSKESMAS YANG
//   SAMA dengan yang menginputnya (pencocokan staff.puskesmasId).
//   Riwayat lama tanpa staffId (warisan data lama) hanya bisa
//   dilihat, bukan diubah.
// - Setelah ubah/hapus, "Hb terakhir" peserta disinkronkan ulang.
// - Setiap aksi tercatat di AuditLog (HB_UPDATE / HB_DELETE).
// - Peserta diberi notifikasi push ketika rekaman diubah.
// ------------------------------------------------------------

type Params = { params: Promise<{ id: string; recordId: string }> };

const METODE_MAX = 100;
const LOKASI_MAX = 150;
const CATATAN_MAX = 500;

async function guard(reqCtx: { params: Promise<{ id: string; recordId: string }> }) {
  const petugas = await requirePetugas();
  if (!petugas) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const { id, recordId } = await reqCtx.params;

  const p = await db.participant.findUnique({
    where: { id },
    select: { id: true, userId: true, name: true, schoolDistrict: true, domisiliKecamatan: true, domisiliKelurahan: true },
  });
  if (!p) {
    return { error: NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 }) } as const;
  }

  // Tahap 5: kecamatan sekolah ATAU kelurahan domisili terpetakan
  const scope = await getWilayahScope(petugas.staff.puskesmasId);
  if (!dalamWilayah(scope, p)) {
    return {
      error: NextResponse.json(
        { error: "Anda tidak memiliki akses untuk melihat data pengguna ini." },
        { status: 403 }
      ),
    } as const;
  }

  const record = await db.hemoglobinRecord.findUnique({
    where: { id: recordId },
    include: { staff: { select: { puskesmasId: true } } },
  });
  if (!record || record.participantId !== p.id) {
    return { error: NextResponse.json({ error: "Rekaman tidak ditemukan" }, { status: 404 }) } as const;
  }
  // Hanya Puskesmas yang menginput yang boleh mengubah/menghapus.
  if (!record.staff || record.staff.puskesmasId !== petugas.staff.puskesmasId) {
    return {
      error: NextResponse.json(
        { error: "Rekaman ini hanya dapat diubah oleh Puskesmas yang menginputnya." },
        { status: 403 }
      ),
    } as const;
  }

  return { petugas, p, record } as const;
}

export async function PATCH(req: NextRequest, ctx: Params) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const { petugas, p, record } = g;

  try {
    const body = await req.json().catch(() => ({}));
    const data: { checkDate?: Date; hbValue?: number; method?: string | null; location?: string | null; notes?: string | null } = {};

    if (body.hbValue !== undefined) {
      const hbValue = typeof body.hbValue === "number" ? body.hbValue : parseFloat(String(body.hbValue).replace(",", "."));
      if (!Number.isFinite(hbValue) || hbValue < 3 || hbValue > 25) {
        return NextResponse.json(
          { error: "VALIDASI", message: "Nilai Hb harus angka antara 3,0 sampai 25,0 g/dL." },
          { status: 400 }
        );
      }
      data.hbValue = Math.round(hbValue * 10) / 10;
    }

    if (body.checkDate !== undefined) {
      const raw = String(body.checkDate).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return NextResponse.json({ error: "VALIDASI", message: "Tanggal pemeriksaan tidak valid." }, { status: 400 });
      }
      const d = new Date(raw + "T00:00:00");
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (Number.isNaN(d.getTime()) || d > today) {
        return NextResponse.json({ error: "VALIDASI", message: "Tanggal pemeriksaan tidak valid / tidak boleh di masa depan." }, { status: 400 });
      }
      data.checkDate = d;
    }

    if (body.method !== undefined) data.method = body.method === null ? null : String(body.method).trim().slice(0, METODE_MAX) || null;
    if (body.location !== undefined) data.location = body.location === null ? null : String(body.location).trim().slice(0, LOKASI_MAX) || null;
    if (body.notes !== undefined) data.notes = body.notes === null ? null : String(body.notes).trim().slice(0, CATATAN_MAX) || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
    }

    const updated = await db.hemoglobinRecord.update({ where: { id: record.id }, data });
    await syncParticipantHb(p.id);

    const std = await getHbStandards();
    const interpretasi = interpretHb(updated.hbValue, std);

    await db.auditLog.create({
      data: {
        actorUserId: petugas.user.id,
        actorRole: "PETUGAS",
        action: "HB_UPDATE",
        targetType: "HEMOGLOBIN_RECORD",
        targetUserId: p.userId,
        meta: JSON.stringify({
          participantId: p.id,
          namaRemaja: p.name,
          recordId: record.id,
          sebelum: { hbValue: record.hbValue, checkDate: record.checkDate },
          sesudah: { hbValue: updated.hbValue, checkDate: updated.checkDate },
          puskesmas: petugas.staff.puskesmas.nama,
        }),
      },
    }).catch(() => {});

    await sendPushToParticipant(p.userId, {
      title: "🩸 Hasil Pemeriksaan Hb",
      body: "Hasil pemeriksaan kesehatan kamu telah diperbarui oleh petugas Puskesmas.",
      url: "/?tab=profil",
      tag: "hb-update",
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      record: {
        id: updated.id, checkDate: updated.checkDate, hbValue: updated.hbValue,
        method: updated.method, location: updated.location, examiner: updated.examiner, notes: updated.notes,
      },
      interpretasi,
    });
  } catch (e) {
    console.error("PUSKESMAS_HB_UPDATE_ERR", e);
    return NextResponse.json({ error: "Gagal mengubah rekaman pemeriksaan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Params) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const { petugas, p, record } = g;

  try {
    await db.hemoglobinRecord.delete({ where: { id: record.id } });
    await syncParticipantHb(p.id);

    await db.auditLog.create({
      data: {
        actorUserId: petugas.user.id,
        actorRole: "PETUGAS",
        action: "HB_DELETE",
        targetType: "HEMOGLOBIN_RECORD",
        targetUserId: p.userId,
        meta: JSON.stringify({
          participantId: p.id,
          namaRemaja: p.name,
          recordId: record.id,
          terhapus: { hbValue: record.hbValue, checkDate: record.checkDate, examiner: record.examiner },
          puskesmas: petugas.staff.puskesmas.nama,
        }),
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUSKESMAS_HB_DELETE_ERR", e);
    return NextResponse.json({ error: "Gagal menghapus rekaman pemeriksaan" }, { status: 500 });
  }
}
