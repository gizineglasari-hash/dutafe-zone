// ============================================================
// FE-ZONE — Integrasi Google Drive via Apps Script (pembaruan 18)
// ============================================================
// Semua file berat (foto profil, video Peer Educator) diunggah ke
// Google Drive milik admin memakai Apps Script Web App yang sudah
// dipasang user. Manfaat:
//  - TIDAK memakan kuota Supabase Storage
//  - TIDAK terkena batas body 4,5MB serverless Vercel (browser
//    mengirim LANGSUNG ke script.google.com — tidak lewat Vercel)
//  - File otomatis "anyone with link can view" → bisa di-embed
//
// Kontrak Apps Script (lihat scripts/apps-script-fezone-drive.js):
//  - POST (JSON, Content-Type text/plain agar bebas preflight CORS):
//      { uploadId, fileName, contentType, dataBase64 }
//    → { ok, fileId, name, embed, thumb }
//  - GET ?ping=1                    → { ok }
//  - GET ?action=delete&fileId=<id> → hapus file (trash)
//
// URL tersimpan di env Vercel DRIVE_WEBAPP_URL; kalau env belum
// diisi, dipakai URL bawaan di bawah (sudah teruji berfungsi).
// ============================================================

export const DRIVE_WEBAPP_URL_DEFAULT =
  "https://script.google.com/macros/s/AKfycbxfqVV3dzdLM5qJsNm_F73V0RiUtHKmhGQbEzqSJf3Woo9kNGoKEJRAaWroy_yWxoBw/exec";

/** URL Apps Script yang dipakai (env menang, fallback URL bawaan). */
export function driveWebappUrl(): string {
  return (process.env.DRIVE_WEBAPP_URL || "").trim() || DRIVE_WEBAPP_URL_DEFAULT;
}

/** URL untuk dipakai di BROWSER (client component). */
export function driveWebappUrlPublic(): string {
  return driveWebappUrl();
}

export interface DriveUploadResult {
  ok: boolean;
  fileId?: string;
  name?: string;
  embed?: string; // https://drive.google.com/file/d/<id>/preview (iframe)
  thumb?: string; // https://drive.google.com/thumbnail?id=<id>&sz=w1000
  error?: string;
}

/**
 * Unggah buffer ke Drive (dipakai SERVER, mis. fallback API).
 * Dari browser, component memanggil endpoint ini juga boleh —
 * tetap satu hop ke script.google.com (tidak lewat Vercel).
 */
export async function driveUpload(opts: {
  uploadId: string;
  fileName: string;
  contentType: string;
  bytes: Buffer;
}): Promise<DriveUploadResult> {
  try {
    const res = await fetch(driveWebappUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        uploadId: opts.uploadId,
        fileName: opts.fileName,
        contentType: opts.contentType || "application/octet-stream",
        dataBase64: opts.bytes.toString("base64"),
      }),
      // Apps Script me-redirect ke script.googleusercontent.com
      redirect: "follow",
    });
    const data = (await res.json()) as DriveUploadResult;
    return data;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Hapus file Drive berdasarkan fileId (server-side). */
export async function driveDelete(fileId: string): Promise<boolean> {
  try {
    const res = await fetch(`${driveWebappUrl()}?action=delete&fileId=${encodeURIComponent(fileId)}`, {
      redirect: "follow",
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

/** Kenali URL Google Drive milik website (thumbnail / preview / view / uc). */
export function isDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(^https:\/\/drive\.google\.com\/)|(id=)/.test(url) && url.includes("drive.google.com");
}

/**
 * Ambil fileId dari bentuk URL Drive apa pun yang kita simpan:
 *  - thumbnail?id=<id>&sz=...
 *  - file/d/<id>/preview · file/d/<id>/view · uc?id=<id>
 *  - open?id=<id>
 */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]id=([\w-]{10,})/) ||
    url.match(/\/file\/d\/([\w-]{10,})/) ||
    url.match(/\/d\/([\w-]{10,})\//);
  return m?.[1] ?? null;
}
