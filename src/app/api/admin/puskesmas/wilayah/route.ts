import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// ============================================================
// PEMBARUAN 19 — API Wilayah Kerja Puskesmas (khusus ADMIN)
// Memetakan kelurahan ke Puskesmas. Aturan: 1 kelurahan hanya
// boleh dipetakan ke 1 Puskesmas (satu peta rujukan utama),
// sedangkan 1 Puskesmas bisa melayani banyak kelurahan.
// ============================================================

async function audit(actor: { id: string; role: string } | null, action: string, meta: Record<string, unknown>) {
  try {
    await db.auditLog.create({
      data: {
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action,
        targetType: "PUSKESMAS_WILAYAH",
        meta: JSON.stringify(meta),
      },
    });
  } catch (e) {
    console.warn("[audit] gagal mencatat:", e);
  }
}

// POST — petakan kelurahan ke Puskesmas.
// Body: { puskesmasId, kelurahanId, pindahkan?: boolean }
// - Jika kelurahan sudah dipetakan ke Puskesmas lain dan
//   pindahkan=true → petalama dihapus lalu dipetakan ke target.
// - Jika pindahkan tidak diset → 409 dengan info pemilik lama.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const puskesmasId = String(body?.puskesmasId ?? "");
    const kelurahanId = String(body?.kelurahanId ?? "");
    const pindahkan = Boolean(body?.pindahkan);
    if (!puskesmasId || !kelurahanId) {
      return NextResponse.json({ error: "puskesmasId dan kelurahanId wajib diisi" }, { status: 400 });
    }

    const [pus, kel] = await Promise.all([
      db.masterPuskesmas.findUnique({ where: { id: puskesmasId } }),
      db.masterKelurahan.findUnique({ where: { id: kelurahanId } }),
    ]);
    if (!pus) return NextResponse.json({ error: "Puskesmas tidak ditemukan" }, { status: 404 });
    if (!kel) return NextResponse.json({ error: "Kelurahan tidak ditemukan" }, { status: 404 });

    const existing = await db.puskesmasWilayah.findUnique({
      where: { kelurahanId },
      include: { puskesmas: { select: { nama: true } } },
    });
    if (existing && existing.puskesmasId === puskesmasId) {
      return NextResponse.json({ error: `Kelurahan ${kel.nama} sudah dipetakan ke Puskesmas ini` }, { status: 409 });
    }
    if (existing && !pindahkan) {
      return NextResponse.json(
        {
          error: `Kelurahan ${kel.nama} saat ini dipetakan ke ${existing.puskesmas.nama}. Gunakan opsi "pindahkan" jika ingin memindahkannya.`,
          currentOwner: { puskesmasId: existing.puskesmasId, nama: existing.puskesmas.nama },
        },
        { status: 409 }
      );
    }

    const mapping = await db.$transaction(async (tx) => {
      if (existing) await tx.puskesmasWilayah.delete({ where: { id: existing.id } });
      return tx.puskesmasWilayah.create({
        data: { id: `wil-${puskesmasId}-${kelurahanId}`, puskesmasId, kelurahanId },
      });
    });

    await audit(admin, existing ? "WILAYAH_MOVE" : "WILAYAH_CREATE", {
      puskesmas: pus.nama,
      kelurahan: kel.nama,
      kecamatan: kel.kecamatanId,
    });
    return NextResponse.json({ ok: true, wilayah: mapping }, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error("POST_WILAYAH_ERR", e);
    return NextResponse.json({ error: "Gagal memetakan wilayah" }, { status: 500 });
  }
}

// DELETE — lepas pemetaan kelurahan dari Puskesmas.
// Query: ?id=<wilayahId>  atau  ?kelurahanId=<id>
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const kelurahanId = searchParams.get("kelurahanId");
    if (!id && !kelurahanId) {
      return NextResponse.json({ error: "id atau kelurahanId wajib diisi" }, { status: 400 });
    }

    const existing = await db.puskesmasWilayah.findFirst({
      where: id ? { id: id! } : { kelurahanId: kelurahanId! },
      include: {
        puskesmas: { select: { nama: true } },
        kelurahan: { select: { nama: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Pemetaan tidak ditemukan" }, { status: 404 });

    await db.puskesmasWilayah.delete({ where: { id: existing.id } });
    await audit(admin, "WILAYAH_DELETE", {
      puskesmas: existing.puskesmas.nama,
      kelurahan: existing.kelurahan.nama,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE_WILAYAH_ERR", e);
    return NextResponse.json({ error: "Gagal melepas pemetaan" }, { status: 500 });
  }
}
