# 🚀 PANDUAN DEPLOY — FE-ZONE ke Vercel + Supabase

Website: ZONA Remaja Putri Bebas Anemia mencari DUTA (Next.js 16 + Prisma + PostgreSQL Supabase)

---

## YANG SUDAH DIPERSIAPKAN (tidak perlu diubah lagi)

- ✅ Database: Prisma siap PostgreSQL (Supabase) — `prisma/schema.prisma`
- ✅ Storage: semua upload (hero, logo, foto profil, video, komunitas) otomatis
  tersimpan ke **Supabase Storage** bucket `uploads` saat env Supabase terpasang
- ✅ Cookie session aman untuk HTTPS production
- ✅ Build Vercel otomatis: generate client → buat tabel (`db push`) → seed admin → build
- ✅ `scripts/seed.production.js` hanya membuat akun admin, tidak pernah menghapus data

---

## LANGKAH A — UPLOAD KODE KE GITHUB (GitHub Desktop, paling mudah)

1. Install **GitHub Desktop**: https://desktop.github.com → login akun GitHub
2. Ekstrak file `fezone-deploy.zip` ke folder, misal `C:\fezone`
3. GitHub Desktop → **File → Add local repository** → pilih folder tersebut
   (jika ditanya "not a repository", klik **Create a Repository**;
    nama: `fezone`, jangan centang "Initialize with README" jika opsi muncul)
4. Klik **Publish repository** → pastikan **Keep this code private** (disarankan)
5. Selesai — kode sudah ada di akun GitHub Anda

> Alternatif tanpa install: buka github.com → New repository → "uploading an
> existing file" → drag folder isi proyek (maks 100 file per unggahan).

---

## LANGKAH B — SIAPKAN SUPABASE STORAGE (sekali klik)

1. Buka project Supabase Anda → menu **Storage** (sidebar kiri)
2. **New bucket** → Name: `uploads` → centang/aktifkan **Public bucket** → Create

---

## LANGKAH C — AMBIL KREDENSIAL SUPABASE (jangan dikirim ke siapa pun)

1. Supabase → **Project Settings (⚙️) → API**:
   - `Project URL` → dipakai untuk `SUPABASE_URL`
   - `service_role` secret (klik Reveal) → dipakai untuk `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ RAHASIA — hanya masuk ke Vercel, JANGAN pernah dibagikan/commit
2. Supabase → tombol **Connect** (atas tengah) → tab **Transaction pooler**:
   - Salin *connection string*, bentuknya kira-kira:
     `postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres`
   - Ganti `[YOUR-PASSWORD]` dengan **Database Password** yang Anda simpan saat
     membuat project
   - Tambahkan di ujungnya: `?pgbouncer=true&connection_limit=1`
   - Hasil akhir → dipakai untuk `DATABASE_URL` di Vercel

---

## LANGKAH D — IMPORT KE VERCEL + ENVIRONMENT VARIABLES

1. Buka **vercel.com** → login (pakai akun GitHub)
2. **Add New → Project** → pilih repository `fezone` → **Import**
3. Framework: otomatis terdeteksi **Next.js** — biarkan default
4. Sebelum klik Deploy, buka **Environment Variables** (di halaman yang sama,
   atau nanti via Project → Settings → Environment Variables).
   Isi untuk environment **Production, Preview, Development** (semua):

| NAME | VALUE | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | dari Langkah C.2 |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | dari Langkah C.1 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role) | dari Langkah C.1 — rahasia |
| `ADMIN_INITIAL_PASSWORD` | (password pilihan Anda untuk admin) | supaya akun admin tidak memakai default |
| `ADMIN_USERNAME` | `admin@fezone.id` | opsional (default ini) |

5. Klik **Deploy** dan tunggu build selesai (±2–4 menit)

> Build otomatis membuat semua tabel di Supabase + akun admin.
> Admin login: domain-anda.vercel.app → "Login Admin" di footer.

---

## LANGKAH E — SETELAH DEPLOY SUKSES (5 menit)

1. Buka website production → daftar akun percobaan → cek login/dashboard/mission
2. Login **Admin** → tab Beranda:
   - Upload ulang **hero** → pilih `deploy-assets/hero-fezone-transparent.png`
   - Upload ulang **Logo Dinkes** → pilih `deploy-assets/logo-dinkes-bandung.png`
   (file lama tersimpan di penyimpanan lokal, jadi perlu diunggah sekali lagi
    agar tersimpan di Supabase Storage)
3. Ganti password admin dari panel bila perlu
4. Coba upload foto profil → harusnya tersimpan ke Supabase Storage

---

## CATATAN TEKNIS

- Batas unggah file: **4MB** (batas body request serverless Vercel).
  Video besar → gunakan opsi link YouTube/Instagram/TikTok (tidak ada batas).
- `DATABASE_URL` memakai **Transaction Pooler (port 6543)** + `pgbouncer=true`
  karena Vercel serverless membuat banyak koneksi singkat.
- Skema DB lokal (preview development) tetap SQLite via
  `prisma/schema.sqlite.prisma` — tidak mengganggu produksi.
- Service role key HANYA dipakai di server (API routes) untuk menulis ke
  Storage — tidak pernah dikirim ke browser.
