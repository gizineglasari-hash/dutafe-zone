// ============================================================
// API Hapus Riwayat Gizi — PESERTA (pembaruan 18)
// DELETE /api/participant/nutrition/<id>
//
// Keamanan (setara RLS, dijalankan server-side):
// - Wajib session login sebagai PARTICIPANT (requireParticipant)
// - Baris HANYA dihapus bila participantId-nya = pemegang session
//   → peserta tidak mungkin menghapus catatan milik orang lain
// - Respons selalu generic 404 untuk baris milik orang lain
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Kamu belum masuk sebagai peserta." }, { status: 401 });
  const { id } = await params;

  const record = await db.nutritionAssessment.findUnique({
    where: { id },
    select: { id: true, participantId: true },
  });
  if (!record || record.participantId !== auth.participantId) {
    return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
  }

  await db.nutritionAssessment.delete({ where: { id } });
  return NextResponse.json({ ok: true, deletedId: id });
}
