import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// ------------------------------------------------------------
// Storage abstraction untuk production (Vercel + Supabase) & dev lokal.
//
// - Jika env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY tersedia (server-side
//   saja), file diunggah ke Supabase Storage bucket "uploads" (public).
// - Jika tidak (development lokal), file ditulis ke public/uploads seperti
//   sebelumnya — perilaku lama 100% tetap terjaga.
//
// ⚠️ SUPABASE_SERVICE_ROLE_KEY hanya dipakai di server (API routes),
//    tidak pernah dikirim ke browser/client.
// ------------------------------------------------------------

const BUCKET = "uploads";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url: url.replace(/\/+$/, ""), serviceKey };
}

export function isSupabaseStorage(): boolean {
  const { url, serviceKey } = supabaseConfig();
  return Boolean(url && serviceKey);
}

function publicBaseUrl(): string {
  const { url } = supabaseConfig();
  return `${url}/storage/v1/object/public/${BUCKET}`;
}

/**
 * Simpan file. `folder` boleh kosong string (root) atau mis. "hero", "branding",
 * "profile", "videos". Mengembalikan URL yang dapat dipakai di <img src>/<video src>.
 */
export async function saveUpload(opts: {
  folder: string; // "" | "hero" | "branding" | "profile" | "videos"
  fileName: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ url: string; storage: "supabase" | "local" }> {
  const { fileName, bytes, contentType } = opts;
  const folder = opts.folder.replace(/^\/+|\/+$/g, "");

  if (isSupabaseStorage()) {
    const { url, serviceKey } = supabaseConfig();
    const objectPath = folder ? `${folder}/${fileName}` : fileName;
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase Storage upload gagal (${res.status}): ${detail.slice(0, 200)}`);
    }
    return { url: `${publicBaseUrl()}/${objectPath}`, storage: "supabase" };
  }

  // Fallback lokal (development): tulis ke public/uploads/<folder>/<file>
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);
  return { url: folder ? `/uploads/${folder}/${fileName}` : `/uploads/${fileName}`, storage: "local" };
}

/**
 * Hapus file berdasarkan URL yang tersimpan di database.
 * Mendukung URL lama lokal (/uploads/...) dan URL Supabase Storage.
 */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url) return;

  // Supabase Storage
  if (url.startsWith(`${publicBaseUrl()}/`)) {
    const objectPath = url.slice(`${publicBaseUrl()}/`.length);
    const { url: base, serviceKey } = supabaseConfig();
    await fetch(`${base}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}` },
    }).catch(() => {});
    return;
  }

  // Lokal lama (/uploads/...)
  if (url.startsWith("/uploads/")) {
    const rel = path.normalize(url).replace(/^([/\\])+/, "");
    const full = path.join(process.cwd(), "public", rel);
    // pengaman: hanya dalam folder public/uploads
    if (full.startsWith(path.join(process.cwd(), "public", "uploads"))) {
      await unlink(full).catch(() => {});
    }
  }
}
