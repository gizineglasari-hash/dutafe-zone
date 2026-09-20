import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// ============================================================
// PEMBARUAN 19 — API Data Induk Puskesmas (khusus ADMIN)
// Mengelola: daftar Puskesmas resmi, kecamatan/kelurahan,
// dan wilayah kerja (Puskesmas -> kelurahan).
// Semua aksi penting dicatat di AuditLog.
// ============================================================

function slug(s: string) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function audit(actor: { id: string; role: string } | null, action: string, targetType: string, meta: Record<string, unknown>) {
  try {
    await db.auditLog.create({
      data: {
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action,
        targetType,
        meta: JSON.stringify(meta),
      },
    });
  } catch (e) {
    console.warn("[audit] gagal mencatat:", e);
  }
}

// GET — seluruh data induk untuk panel admin
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [kecamatan, puskesmas, kelurahan] = await Promise.all([
    db.masterKecamatan.findMany({ orderBy: { nama: "asc" } }),
    db.masterPuskesmas.findMany({
      include: {
        kecamatan: { select: { id: true, nama: true } },
        wilayah: { include: { kelurahan: { select: { nama: true } } } },
        _count: { select: { wilayah: true, staff: true } },
      },
      orderBy: { nama: "asc" },
    }),
    db.masterKelurahan.findMany({
      include: {
        kecamatan: { select: { id: true, nama: true } },
        wilayah: { select: { puskesmasId: true, puskesmas: { select: { nama: true } } } },
      },
      orderBy: [{ kecamatan: { nama: "asc" } }, { nama: "asc" }],
    }),
  ]);

  return NextResponse.json({
    kecamatan: kecamatan.map((k) => ({ id: k.id, nama: k.nama, isActive: k.isActive })),
    puskesmas: puskesmas.map((p) => ({
      id: p.id,
      nama: p.nama,
      alamat: p.alamat,
      telp: p.telp,
      isActive: p.isActive,
      kecamatan: p.kecamatan,
      kelurahanCount: p._count.wilayah,
      staffCount: p._count.staff,
      kelurahan: p.wilayah
        .map((w) => w.kelurahan.nama)
        .sort((a, b) => a.localeCompare(b, "id")),
    })),
    kelurahan: kelurahan.map((k) => ({
      id: k.id,
      nama: k.nama,
      kecamatanId: k.kecamatanId,
      kecamatanNama: k.kecamatan.nama,
      isActive: k.isActive,
      dipetakanKe: k.wilayah
        ? { puskesmasId: k.wilayah.puskesmasId, puskesmasNama: k.wilayah.puskesmas.nama }
        : null,
    })),
  });
}

// POST — tambah Puskesmas baru (jarang dipakai: data resmi sudah di-seed,
// tetapi tersedia jika Dinkes membuka UPT baru)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const nama = String(body?.nama ?? "").trim();
    const alamat = body?.alamat ? String(body.alamat).trim() : null;
    const telp = body?.telp ? String(body.telp).trim() : null;
    const kecamatanId = body?.kecamatanId ? String(body.kecamatanId) : null;

    if (!nama) return NextResponse.json({ error: "Nama Puskesmas wajib diisi" }, { status: 400 });

    const exists = await db.masterPuskesmas.findUnique({ where: { nama } });
    if (exists) {
      return NextResponse.json({ error: `Puskesmas "${nama}" sudah ada dalam daftar` }, { status: 409 });
    }

    if (kecamatanId) {
      const kec = await db.masterKecamatan.findUnique({ where: { id: kecamatanId } });
      if (!kec) return NextResponse.json({ error: "Kecamatan tidak ditemukan" }, { status: 400 });
    }

    const created = await db.masterPuskesmas.create({
      data: { id: `pus-${slug(nama)}`, nama, alamat, telp, kecamatanId },
    });

    await audit(admin, "PUSKESMAS_CREATE", "PUSKESMAS", { id: created.id, nama });
    return NextResponse.json({ ok: true, puskesmas: created }, { status: 201 });
  } catch (e) {
    console.error("POST_PUSKESMAS_ERR", e);
    return NextResponse.json({ error: "Gagal menambah Puskesmas" }, { status: 500 });
  }
}

// PATCH — ubah data Puskesmas / aktifkan-nonaktifkan.
// Nonaktif = disembunyikan dari pilihan baru; data historis tetap utuh.
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });

    const current = await db.masterPuskesmas.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Puskesmas tidak ditemukan" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body?.nama !== undefined) {
      const nama = String(body.nama).trim();
      if (!nama) return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
      const dup = await db.masterPuskesmas.findFirst({ where: { nama, id: { not: id } } });
      if (dup) return NextResponse.json({ error: `Nama "${nama}" sudah dipakai Puskesmas lain` }, { status: 409 });
      data.nama = nama;
    }
    if (body?.alamat !== undefined) data.alamat = body.alamat ? String(body.alamat).trim() : null;
    if (body?.telp !== undefined) data.telp = body.telp ? String(body.telp).trim() : null;
    if (body?.kecamatanId !== undefined) {
      if (body.kecamatanId) {
        const kec = await db.masterKecamatan.findUnique({ where: { id: String(body.kecamatanId) } });
        if (!kec) return NextResponse.json({ error: "Kecamatan tidak ditemukan" }, { status: 400 });
      }
      data.kecamatanId = body.kecamatanId || null;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const updated = await db.masterPuskesmas.update({ where: { id }, data });
    await audit(admin, "PUSKESMAS_UPDATE", "PUSKESMAS", { id, data });
    return NextResponse.json({ ok: true, puskesmas: updated });
  } catch (e) {
    console.error("PATCH_PUSKESMAS_ERR", e);
    return NextResponse.json({ error: "Gagal mengubah Puskesmas" }, { status: 500 });
  }
}
