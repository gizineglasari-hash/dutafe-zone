import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MYTHS, QUIZ_FINAL, QUIZ_M1, QUIZ_M2, QUIZ_POSTTEST, QUIZ_PRETEST } from "@/lib/content-quizzes";
import { QUIZ_BANK_KEYS, sanitizeBankData, type QuizBankData } from "@/lib/quiz-content";

// ------------------------------------------------------------
// API ADMIN: Editor Soal / Bank Kuis (PAKET C)
// GET    → semua bank (bawaan + editan menyatu) + daftar yang sudah diedit
// PUT    → simpan hasil editan satu bank ke database
// DELETE → hapus editan satu bank (kembali ke soal bawaan)
//
// Semua input dibersihkan lewat sanitizeBankData(): teks dibatasi,
// jumlah soal maks 30, pilihan 2-6 dan harus ada jawaban benar yang
// valid. Penilaian peserta tetap dilakukan server — aman.
// ------------------------------------------------------------

// Bank bawaan dari kode (dipakai kalau admin belum mengedit bank tsb)
const DEFAULTS: Record<string, QuizBankData> = {
  PRETEST: { v: 1, kind: "list", questions: QUIZ_PRETEST },
  POSTTEST: { v: 1, kind: "list", questions: QUIZ_POSTTEST },
  FINAL_QUIZ: { v: 1, kind: "list", questions: QUIZ_FINAL },
  M1: { v: 1, kind: "level", levels: QUIZ_M1 },
  M2: { v: 1, kind: "level", levels: QUIZ_M2 },
  MITOS: { v: 1, kind: "myths", myths: MYTHS },
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banks: Record<string, QuizBankData> = {};
  const editedKeys: string[] = [];
  for (const k of QUIZ_BANK_KEYS) banks[k] = DEFAULTS[k];

  try {
    const rows = await db.quizContent.findMany();
    for (const r of rows) {
      const parsed = parseBankData(r.dataJson);
      if (parsed) {
        banks[r.key] = parsed;
        editedKeys.push(r.key);
      }
    }
  } catch {
    // database belum siap → kirim bawaan (editor tetap terbuka)
  }

  return NextResponse.json({ banks, editedKeys });
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
  if (typeof key !== "string" || !QUIZ_BANK_KEYS.includes(key as (typeof QUIZ_BANK_KEYS)[number])) {
    return NextResponse.json({ error: "KEY_INVALID", message: "Bank soal tidak dikenal." }, { status: 400 });
  }

  const clean = sanitizeBankData(key, data);
  if (!clean) {
    return NextResponse.json(
      {
        error: "VALIDASI",
        message:
          "Data soal belum lengkap. Pastikan: minimal 1 soal, setiap soal punya pertanyaan + minimal 2 pilihan (pilihan tidak boleh kosong). Untuk Mitos/Fakta: minimal 1 pernyataan.",
      },
      { status: 400 }
    );
  }

  const dataJson = JSON.stringify(clean);
  await db.quizContent.upsert({
    where: { key },
    create: { key, dataJson },
    update: { dataJson },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!QUIZ_BANK_KEYS.includes(key as (typeof QUIZ_BANK_KEYS)[number])) {
    return NextResponse.json({ error: "KEY_INVALID", message: "Bank soal tidak dikenal." }, { status: 400 });
  }

  await db.quizContent.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
