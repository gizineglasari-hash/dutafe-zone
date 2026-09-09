import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — branding publik: gambar hero beranda + logo Dinas Kesehatan Kota Bandung (publik).
export async function GET() {
  const [hero, logo] = await Promise.all([
    db.appSetting.findUnique({ where: { key: "hero_image_url" } }),
    db.appSetting.findUnique({ where: { key: "dinkes_logo_url" } }),
  ]);
  return NextResponse.json({
    heroImageUrl: hero?.value ?? null,
    dinkesLogoUrl: logo?.value ?? null,
  });
}
