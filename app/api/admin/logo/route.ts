import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { randomBytes } from "crypto";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

// POST — admin upload logo resmi Dinas Kesehatan Kota Bandung (tampil di footer & sertifikat)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File logo wajib diunggah" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format harus JPG, PNG, WebP, atau SVG" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ukuran logo maksimal 4MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/svg+xml" ? "svg" : "jpg";
  const fileName = `dinkes-logo-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUpload({ folder: "branding", fileName, bytes, contentType: file.type });

  // Hapus logo lama
  const prev = await db.appSetting.findUnique({ where: { key: "dinkes_logo_url" } });
  await deleteUpload(prev?.value);

  await db.appSetting.upsert({
    where: { key: "dinkes_logo_url" },
    create: { key: "dinkes_logo_url", value: url },
    update: { value: url },
  });

  return NextResponse.json({ ok: true, dinkesLogoUrl: url });
}

// DELETE — hapus logo
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prev = await db.appSetting.findUnique({ where: { key: "dinkes_logo_url" } });
  await deleteUpload(prev?.value);
  await db.appSetting.deleteMany({ where: { key: "dinkes_logo_url" } });
  return NextResponse.json({ ok: true });
}
