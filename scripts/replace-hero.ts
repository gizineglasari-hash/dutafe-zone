// Ganti gambar hero beranda FE-ZONE dengan versi transparan (latar putih dihapus)
// agar ilustrasi menyatu dengan background web — tanpa kotak/bingkai.
// Mekanisme sama dengan API admin /api/admin/hero (copy ke public/uploads/hero + upsert AppSetting + hapus file lama)
import { PrismaClient } from "@prisma/client";
import { copyFile, unlink } from "fs/promises";
import path from "path";

const db = new PrismaClient();

const SRC = "/home/z/my-project/scripts/hero-transparent.png"; // hasil scripts/hero-transparent.py
const FILE_NAME = `hero-${Date.now()}-transparent.png`;
const DEST = path.join(process.cwd(), "public", "uploads", "hero", FILE_NAME);
const url = `/uploads/hero/${FILE_NAME}`;

// 1. Copy gambar baru
await copyFile(SRC, DEST);
console.log("Copied:", DEST);

// 2. Hapus file hero lama (jika ada & berasal dari folder uploads/hero)
const prev = await db.appSetting.findUnique({ where: { key: "hero_image_url" } });
if (prev?.value?.startsWith("/uploads/hero/")) {
  await unlink(path.join(process.cwd(), "public", prev.value)).catch(() => {});
  console.log("Old hero removed:", prev.value);
}

// 3. Update setting di database
await db.appSetting.upsert({
  where: { key: "hero_image_url" },
  create: { key: "hero_image_url", value: url },
  update: { value: url },
});
console.log("hero_image_url =", url);

// 4. Verifikasi
const check = await db.appSetting.findUnique({ where: { key: "hero_image_url" } });
console.log("Verified:", check?.value);
await db.$disconnect();
