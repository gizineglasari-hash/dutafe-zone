import { db } from "@/lib/db";

// ------------------------------------------------------------
// Utilitas bersama fitur Puskesmas (pembaruan 19)
// ------------------------------------------------------------

// Daftar profesi bawaan. Admin bisa mengganti lewat AppSetting
// key "profesi_petugas" (JSON array) — kalau tidak ada/invalid,
// pakai daftar default ini.
export const PROFESI_DEFAULT = [
  "Ahli Gizi",
  "Bidan",
  "Perawat",
  "Nutritionis",
  "Teknisi Laboratorium Medik",
  "Sanitarian",
  "Petugas Kesehatan",
  "Tenaga Administrasi Kesehatan",
];

export async function getDaftarProfesi(): Promise<string[]> {
  const setting = await db.appSetting.findUnique({ where: { key: "profesi_petugas" } });
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === "string")) {
        return parsed;
      }
    } catch {
      // nilai tidak valid → pakai default
    }
  }
  return PROFESI_DEFAULT;
}
