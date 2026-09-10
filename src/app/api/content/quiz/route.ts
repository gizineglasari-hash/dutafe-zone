import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBankData } from "@/lib/quiz-content";
import type { QuizBanks } from "@/lib/quiz-client";

// ------------------------------------------------------------
// API PUBLIK: bank soal hasil editan admin (PAKET C — Editor Soal).
// Tanpa login (dipakai app peserta). Respon selalu 200:
//   { banks: { PRETEST?: [...], POSTTEST?: [...], M1?: {SMP,SMA},
//              M2?: {SMP,SMA}, MITOS?: [...], FINAL_QUIZ?: [...] } }
// Berisi HANYA bank yang pernah diedit admin. Kalau database
// bermasalah → banks: {} → aplikasi memakai soal bawaan.
// ------------------------------------------------------------

export async function GET() {
  try {
    const rows = await db.quizContent.findMany({ orderBy: { key: "asc" } });
    const banks: Record<string, unknown> = {};
    for (const r of rows) {
      const parsed = parseBankData(r.dataJson);
      if (parsed) banks[r.key] = parsed;
    }
    return NextResponse.json({ banks: banks as QuizBanks });
  } catch {
    // Tabel belum dibuat / DB tidak bisa dihubungi → kirim kosong
    // supaya aplikasi otomatis memakai soal bawaan (anti-gagal).
    return NextResponse.json({ banks: {} });
  }
}
