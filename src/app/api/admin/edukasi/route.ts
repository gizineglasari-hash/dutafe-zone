import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EDUKASI, type EduCard, type EduCategory } from "@/lib/content-edukasi";

// ------------------------------------------------------------
// API ADMIN: Editor Konten Pojok Edukasi (PAKET C)
// GET    → daftar kategori (bawaan + hasil editan menyatu)
// PUT    → simpan hasil editan satu kategori ke database
// DELETE → hapus editan satu kategori (kembali ke bawaan)
//
// Semua input DIBERSIHKAN lewat sanitizeCategory(): panjang
// teks dibatasi, jumlah kartu & poin dibatasi, warna harus dari
// daftar, dan key harus salah satu dari 7 kategori resmi.
// ------------------------------------------------------------

const KEYS = EDUKASI.map((c) => c.key);
const TONES = ["rose", "teal", "amber", "green", "violet", "cyan"];

function cleanStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Rapikan & periksa data kategori dari admin. Return null = data tidak valid.
function sanitizeCategory(input: unknown): EduCategory | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;

  const key = cleanStr(o.key, 40);
  if (!KEYS.includes(key)) return null;

  const title = cleanStr(o.title, 80);
  if (!title) return null;

  const icon = cleanStr(o.icon, 8) || "📚";
  const subtitle = cleanStr(o.subtitle, 160);
  const tip = cleanStr(o.tip, 320);

  const rawCards = Array.isArray(o.cards) ? o.cards.slice(0, 12) : [];
  const cards: EduCard[] = [];
  for (const rc of rawCards) {
    if (!rc || typeof rc !== "object") continue;
    const c = rc as Record<string, unknown>;
    const cTitle = cleanStr(c.title, 80);
    const points = (Array.isArray(c.points) ? c.points : [])
      .map((p) => cleanStr(p, 240))
      .filter(Boolean)
      .slice(0, 12);
    if (!cTitle || points.length === 0) continue; // kartu kosong → buang
    const tone = typeof c.tone === "string" && TONES.includes(c.tone) ? (c.tone as EduCard["tone"]) : "rose";
    cards.push({ icon: cleanStr(c.icon, 8) || "✨", title: cTitle, tone, points });
  }
  if (cards.length === 0) return null; // kategori tanpa kartu → tidak valid

  return { key, icon, title, subtitle, tip, cards };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gabungkan: bawaan sebagai dasar, editan dari database menimpanya.
  const categories: EduCategory[] = EDUKASI.map((c) => ({ ...c }));
  const editedKeys: string[] = [];

  try {
    const rows = await db.eduContent.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r.dataJson]));
    for (let i = 0; i < categories.length; i++) {
      const raw = byKey.get(categories[i].key);
      if (!raw) continue;
      try {
        const parsed = sanitizeCategory({ ...JSON.parse(raw), key: categories[i].key });
        if (parsed) {
          categories[i] = parsed;
          editedKeys.push(parsed.key);
        }
      } catch {
        // editan lama rusak → biarkan bawaan yang tampil
      }
    }
  } catch {
    // database belum siap → tetap kirim konten bawaan (editor tetap bisa dibuka)
  }

  return NextResponse.json({ categories, editedKeys });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON", message: "Data yang dikirim tidak bisa dibaca." }, { status: 400 });
  }

  const { key, data } = (body ?? {}) as { key?: unknown; data?: unknown };
  if (typeof key !== "string") {
    return NextResponse.json({ error: "KEY_INVALID", message: "Kategori tidak dikenal." }, { status: 400 });
  }

  const clean = sanitizeCategory({ ...(typeof data === "object" && data ? data : {}), key });
  if (!clean) {
    return NextResponse.json(
      {
        error: "VALIDASI",
        message:
          "Data belum lengkap. Pastikan: judul kategori terisi, ada minimal 1 kartu, dan setiap kartu punya judul + minimal 1 poin.",
      },
      { status: 400 }
    );
  }

  const dataJson = JSON.stringify(clean);
  await db.eduContent.upsert({
    where: { key: clean.key },
    create: { key: clean.key, dataJson },
    update: { dataJson },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!KEYS.includes(key)) {
    return NextResponse.json({ error: "KEY_INVALID", message: "Kategori tidak dikenal." }, { status: 400 });
  }

  await db.eduContent.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
