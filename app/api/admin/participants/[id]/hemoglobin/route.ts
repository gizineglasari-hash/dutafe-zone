// ============================================================
// PEMBARUAN 20 TAHAP 5 — API RIWAYAT HEMOGLOBIN SATU REMAJA
// (khusus ADMIN, untuk grafik Hb di modal Detail)
// ------------------------------------------------------------
// Sumber data = tabel HemoglobinRecord (hasil input petugas
// Puskesmas, riwayat tidak pernah ditimpa) + fallback titik
// "Diisi sendiri di Profil" untuk data lama sebelum Pembaruan 19.
// Klasifikasi memakai standar yang SAMA dengan seluruh aplikasi
// (getHbStandards — Kemenkes/WHO). Tanpa rumus baru.
// Keamanan: wajib role ADMIN (server-side, setara RLS).
// ============================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getHbStandards, interpretHb } from "@/lib/puskesmas";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });

  const { id } = await ctx.params;

  const participant = await db.participant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      school: true,
      educationLevel: true,
      hbValue: true,
      hbCheckDate: true,
      user: { select: { username: true } },
    },
  });
  if (!participant) return NextResponse.json({ error: "Remaja tidak ditemukan." }, { status: 404 });

  const std = await getHbStandards();

  const records = await db.hemoglobinRecord.findMany({
    where: { participantId: id },
    orderBy: { checkDate: "asc" },
    select: {
      id: true,
      checkDate: true,
      hbValue: true,
      method: true,
      location: true,
      examiner: true,
      notes: true,
      staff: { select: { nama: true } },
    },
  });

  const rows: {
    id: string;
    checkDate: string;
    hbValue: number;
    kategori: string;
    label: string;
    method: string | null;
    location: string | null;
    examiner: string | null;
    notes: string | null;
    sumber: "PUSKESMAS" | "PROFIL";
  }[] = records.map((r) => {
    const interp = interpretHb(r.hbValue, std);
    return {
      id: r.id,
      checkDate: r.checkDate.toISOString().slice(0, 10),
      hbValue: r.hbValue,
      kategori: interp.kategori, // BERAT | SEDANG | RINGAN | NORMAL
      label: interp.label,
      method: r.method,
      location: r.location,
      examiner: r.examiner ?? r.staff?.nama ?? null,
      notes: r.notes,
      sumber: "PUSKESMAS" as const,
    };
  });

  // Fallback data lama (sebelum Pembaruan 19): Hb yang diisi remaja
  // sendiri di Profil. Tetap digambar supaya grafik tidak kosong,
  // tapi ditandai sumbernya agar admin tahu asal-usulnya.
  if (records.length === 0 && participant.hbValue !== null) {
    const interp = interpretHb(participant.hbValue, std);
    rows.push({
      id: "profil",
      checkDate: participant.hbCheckDate ? participant.hbCheckDate.toISOString().slice(0, 10) : "-",
      hbValue: participant.hbValue,
      kategori: interp.kategori,
      label: interp.label,
      method: null,
      location: null,
      examiner: null,
      notes: null,
      sumber: "PROFIL" as const,
    });
  }

  return NextResponse.json({
    participant: {
      id: participant.id,
      name: participant.name,
      username: participant.user.username,
      school: participant.school,
      educationLevel: participant.educationLevel,
    },
    standards: std,
    rows,
  });
}
