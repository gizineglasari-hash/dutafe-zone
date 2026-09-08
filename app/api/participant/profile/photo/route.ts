import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { randomBytes } from "crypto";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB (batas body request serverless Vercel)
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// POST — upload / ganti foto profil
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File foto wajib diunggah" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format harus JPG, PNG, atau WebP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran foto maksimal 4MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${auth.participantId}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUpload({ folder: "profile", fileName, bytes, contentType: file.type });

  // Hapus foto lama agar storage tidak menumpuk
  const prev = await db.participant.findUnique({
    where: { id: auth.participantId },
    select: { profilePhotoUrl: true },
  });
  await deleteUpload(prev?.profilePhotoUrl);

  const p = await db.participant.update({
    where: { id: auth.participantId },
    data: { profilePhotoUrl: url },
  });

  return NextResponse.json({ ok: true, profilePhotoUrl: p.profilePhotoUrl });
}

// DELETE — hapus foto profil (kembali ke avatar default)
export async function DELETE() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prev = await db.participant.findUnique({
    where: { id: auth.participantId },
    select: { profilePhotoUrl: true },
  });
  await deleteUpload(prev?.profilePhotoUrl);

  const p = await db.participant.update({
    where: { id: auth.participantId },
    data: { profilePhotoUrl: null },
  });
  return NextResponse.json({ ok: true, profilePhotoUrl: p.profilePhotoUrl });
}
