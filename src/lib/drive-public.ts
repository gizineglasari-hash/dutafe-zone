// ============================================================
// FE-ZONE — URL Apps Script Google Drive (aman dipakai di browser)
// ============================================================
// Dipakai oleh client component (foto profil & video Peer Educator)
// untuk mengunggah file LANGSUNG ke Google Drive — tidak melewati
// server Vercel, jadi tidak terkena batas body 4,5MB.
//
// Catatan pemeliharaan: bila kelak deployment Apps Script dibuat ulang
// (URL berubah), ganti URL di bawah ini. Server-side juga memakai
// env DRIVE_WEBAPP_URL (lihat src/lib/drive.ts).
// ============================================================
export const DRIVE_WEBAPP_URL_PUBLIC =
  "https://script.google.com/macros/s/AKfycbxfqVV3dzdLM5qJsNm_F73V0RiUtHKmhGQbEzqSJf3Woo9kNGoKEJRAaWroy_yWxoBw/exec";
