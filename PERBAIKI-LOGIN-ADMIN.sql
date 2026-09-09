-- ============================================================
-- PERBAIKAN LOGIN ADMIN FE-ZONE  (RENCANA B)
-- Jalankan ini HANYA jika login admin masih gagal setelah
-- paket pembaruan 2 ter-deploy.
--
-- Fungsi:
--  1. Menyeragamkan username akun admin menjadi huruf kecil:
--     admin@fezone.id
--  2. Mengatur ulang password admin menjadi: Fezone#2026
--
-- Cara: Supabase -> SQL Editor -> New query -> tempel seluruh
-- isi file ini -> Run.
-- ============================================================

UPDATE "User"
SET username = 'admin@fezone.id',
    "passwordHash" = '0334d223451a2a8a4a6b91a43c21b39f:3127bbe9d5b7ed72b658b27b6a30adba8cb88f6c1ef1c2f46497719e96e9989b89c14870a1179b80499beeeb9f7c8a772bf60c4fa61aca20a459b2947017b390',
    role = 'ADMIN'
WHERE id = (
  SELECT id FROM "User"
  WHERE role = 'ADMIN'
  ORDER BY "createdAt" ASC
  LIMIT 1
);

-- Selesai. Kembali ke situs, login dengan:
--   Email Admin : admin@fezone.id
--   Password    : Fezone#2026
