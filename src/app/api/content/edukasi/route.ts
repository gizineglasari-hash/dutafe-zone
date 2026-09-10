import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { EduCategory } from "@/lib/content-edukasi";

// ------------------------------------------------------------
// API PUBLIK: daftar kategori edukasi hasil editan admin.
// Tidak butuh login (dipakai halaman landing publik + app peserta).
//
// Respon selalu { categories: [...] }:
// - categories berisi HANYA kategori yang pernah diedit admin
//   (sisanya dirakit di browser dari konten bawaan).
// - Kalau database belum siap / terjadi error → categories: []
//   → browser otomatis memakai konten bawaan. Anti-gagal.
// ------------------------------------------------------------

export async function GET() {
  try {
    const rows = await db.eduContent.findMany({ orderBy: { key: "asc" } });
    const categories: EduCategory[] = [];
    for (const r of rows) {
      try {
        const parsed = JSON.parse(r.dataJson) as EduCategory;
        if (parsed && typeof parsed.key === "string" && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          categories.push(parsed);
        }
      } catch {
        // satu baris rusak → lewati baris itu saja
      }
    }
    return NextResponse.json({ categories });
  } catch {
    // Tabel belum dibuat / DB sedang tidak bisa dihubungi →
    // jangan pernah 500: kirim kosong supaya aplikasi pakai bawaan.
    return NextResponse.json({ categories: [] });
  }
}
