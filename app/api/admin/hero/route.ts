import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { randomBytes } from "crypto";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB (batas body request serverless Vercel)
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// POST — admin upload gambar beranda (mengganti ilustrasi hero)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File gambar wajib diunggah" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format harus JPG, PNG, atau WebP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 4MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `hero-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUpload({ folder: "hero", fileName, bytes, contentType: file.type });

  // Hapus gambar hero lama
  const prev = await db.appSetting.findUnique({ where: { key: "hero_image_url" } });
  await deleteUpload(prev?.value);

  await db.appSetting.upsert({
    where: { key: "hero_image_url" },
    create: { key: "hero_image_url", value: url },
    update: { value: url },
  });

  return NextResponse.json({ ok: true, heroImageUrl: url });
}

// DELETE — hapus gambar beranda (kembali ke ilustrasi default)
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prev = await db.appSetting.findUnique({ where: { key: "hero_image_url" } });
  await deleteUpload(prev?.value);
  await db.appSetting.deleteMany({ where: { key: "hero_image_url" } });
  return NextResponse.json({ ok: true });
}
