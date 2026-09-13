import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { customMissionKey } from "@/lib/constants";

// ------------------------------------------------------------
// API ADMIN: Misi Buatan Admin (pembaruan 15)
// GET    → daftar semua misi buatan admin + jumlah penyelesaian
// POST   → buat misi baru
// PUT    → ubah misi (judul, ikon, deskripsi, XP, aktif/nonaktif)
// DELETE → hapus misi (?id=) — beserta catatan penyelesaiannya
//
// Pembersihan input: judul maks 80 huruf, deskripsi maks 600,
// ikon maks 8 karakter (emoji), XP 0-500.
// ------------------------------------------------------------

const MAX_XP = 500;

function cleanIcon(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? Array.from(s).slice(0, 2).join("").slice(0, 8) : "⭐";
}

function sanitizeBody(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 600) : "";
  const icon = cleanIcon(body.icon);
  const xpRaw = typeof body.xp === "number" ? Math.round(body.xp) : NaN;
  const xp = Number.isFinite(xpRaw) ? Math.min(MAX_XP, Math.max(0, xpRaw)) : 50;
  if (!title) return { error: "Judul misi wajib diisi (maks 80 huruf)." } as const;
  if (!description) return { error: "Deskripsi/instruksi misi wajib diisi (maks 600 huruf)." } as const;
  return { value: { title, description, icon, xp } } as const;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const missions = await db.customMission.findMany({ orderBy: { createdAt: "desc" } });
    const doneRows = await db.missionProgress.findMany({
      where: { status: "COMPLETED", missionKey: { startsWith: "CUST:" } },
      select: { missionKey: true },
    });
    const countBy = new Map<string, number>();
    for (const r of doneRows) countBy.set(r.missionKey, (countBy.get(r.missionKey) ?? 0) + 1);
    return NextResponse.json({
      missions: missions.map((m) => ({ ...m, completedCount: countBy.get(customMissionKey(m.id)) ?? 0 })),
    });
  } catch (e) {
    console.error("ADMIN_CUSTOM_MISSIONS_GET_ERR", e);
    return NextResponse.json({ missions: [] });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clean = sanitizeBody(body);
  if ("error" in clean) return NextResponse.json({ error: "VALIDASI", message: clean.error }, { status: 400 });

  try {
    const mission = await db.customMission.create({ data: clean.value });
    return NextResponse.json({ ok: true, mission });
  } catch (e) {
    console.error("ADMIN_CUSTOM_MISSIONS_POST_ERR", e);
    return NextResponse.json({ error: "SERVER", message: "Gagal membuat misi. Coba lagi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  // Toggle aktif saja (tanpa ubah teks)
  if (typeof body.active === "boolean" && body.title === undefined) {
    try {
      const mission = await db.customMission.update({ where: { id }, data: { active: body.active } });
      return NextResponse.json({ ok: true, mission });
    } catch {
      return NextResponse.json({ error: "NOT_FOUND", message: "Misi tidak ditemukan." }, { status: 404 });
    }
  }

  const clean = sanitizeBody(body);
  if ("error" in clean) return NextResponse.json({ error: "VALIDASI", message: clean.error }, { status: 400 });

  try {
    const mission = await db.customMission.update({ where: { id }, data: clean.value });
    return NextResponse.json({ ok: true, mission });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND", message: "Misi tidak ditemukan." }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  try {
    await db.$transaction([
      db.missionProgress.deleteMany({ where: { missionKey: customMissionKey(id) } }),
      db.customMission.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND", message: "Misi tidak ditemukan." }, { status: 404 });
  }
}
