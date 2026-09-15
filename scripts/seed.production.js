/* eslint-disable @typescript-eslint/no-require-imports */
// ------------------------------------------------------------
// Seed PRODUCTION (Vercel + Supabase Postgres) — idempoten.
// Dijalankan otomatis oleh `vercel-build` SEBELUM `next build`.
//
// - Hanya memastikan 1 akun ADMIN tersedia (buat jika belum ada).
// - TIDAK mengubah/menghapus data user apa pun yang sudah ada
//   (update dilakukan kosong → password existing tidak pernah di-reset).
// - Password admin diambil dari env ADMIN_INITIAL_PASSWORD (disarankan),
//   jika tidak ada memakai default "admin123" (segera ganti via panel).
// ------------------------------------------------------------

const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const db = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // ------------------------------------------------------------
  // PEMULIHAN SKEMA OTOMATIS: pastikan tabel PasswordResetToken ada.
  // Dipakai fitur "Lupa Password" (reset via email). Dibuat dengan
  // IF NOT EXISTS sehingga aman dijalankan berulang setiap build.
  // ------------------------------------------------------------
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((e) => console.warn("[seed] buat tabel PasswordResetToken:", e?.message || e));

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");`
  ).catch((e) => console.warn("[seed] index PasswordResetToken:", e?.message || e));

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
        ALTER TABLE "PasswordResetToken"
          ADD CONSTRAINT "PasswordResetToken_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `).catch((e) => console.warn("[seed] relasi PasswordResetToken:", e?.message || e));

  // ------------------------------------------------------------
  // PEMULIHAN SKEMA OTOMATIS: kolom phone pada Participant
  // (nomor telepon/WhatsApp untuk pendaftar baru). Aman diulang.
  // ------------------------------------------------------------
  await db.$executeRawUnsafe(
    `ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "phone" TEXT;`
  ).catch((e) => console.warn("[seed] kolom Participant.phone:", e?.message || e));

  // ------------------------------------------------------------
  // PEMULIHAN SKEMA OTOMATIS: tabel PageView untuk analisa
  // kunjungan web admin (ala Vercel Analytics). Aman diulang.
  // ------------------------------------------------------------
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PageView" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "visitorId" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "referrer" TEXT,
      "device" TEXT NOT NULL DEFAULT 'Desktop',
      "browser" TEXT NOT NULL DEFAULT 'Lainnya',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((e) => console.warn("[seed] buat tabel PageView:", e?.message || e));

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");`
  ).catch((e) => console.warn("[seed] index PageView(createdAt):", e?.message || e));
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView"("path");`
  ).catch((e) => console.warn("[seed] index PageView(path):", e?.message || e));
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");`
  ).catch((e) => console.warn("[seed] index PageView(visitorId):", e?.message || e));

  // ------------------------------------------------------------
  // PEMULIHAN SKEMA OTOMATIS: tabel PushSubscription untuk
  // pengingat TTD (Web Push) — satu baris per perangkat yang
  // mengizinkan notifikasi. Aman diulang.
  // ------------------------------------------------------------
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "participantId" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL UNIQUE,
      "p256dh" TEXT NOT NULL,
      "auth" TEXT NOT NULL,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((e) => console.warn("[seed] buat tabel PushSubscription:", e?.message || e));

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PushSubscription_participantId_idx" ON "PushSubscription"("participantId");`
  ).catch((e) => console.warn("[seed] index PushSubscription(participantId):", e?.message || e));

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_participantId_fkey') THEN
        ALTER TABLE "PushSubscription"
          ADD CONSTRAINT "PushSubscription_participantId_fkey"
          FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `).catch((e) => console.warn("[seed] relasi PushSubscription:", e?.message || e));

  // ------------------------------------------------------------
  // PEMULIHAN SKEMA OTOMATIS: tabel TtdReminderLog — log pengiriman
  // pengingat agar tidak pernah dobel (maks 1x per 7 hari). Aman diulang.
  // ------------------------------------------------------------
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TtdReminderLog" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "participantId" TEXT NOT NULL,
      "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "success" BOOLEAN NOT NULL DEFAULT true,
      "error" TEXT,
      "kind" TEXT NOT NULL DEFAULT 'weekly'
    );
  `).catch((e) => console.warn("[seed] buat tabel TtdReminderLog:", e?.message || e));

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TtdReminderLog_participantId_sentAt_idx" ON "TtdReminderLog"("participantId", "sentAt");`
  ).catch((e) => console.warn("[seed] index TtdReminderLog(participantId):", e?.message || e));
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TtdReminderLog_sentAt_idx" ON "TtdReminderLog"("sentAt");`
  ).catch((e) => console.warn("[seed] index TtdReminderLog(sentAt):", e?.message || e));

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TtdReminderLog_participantId_fkey') THEN
        ALTER TABLE "TtdReminderLog"
          ADD CONSTRAINT "TtdReminderLog_participantId_fkey"
          FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `).catch((e) => console.warn("[seed] relasi TtdReminderLog:", e?.message || e));

  // --- EduContent (Editor Konten Edukasi — PAKET C) ---
  // Tabel ini BOLEH kosong: kalau kosong, aplikasi memakai konten
  // bawaan. Baris baru hanya muncul saat admin menyimpan hasil editan.
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EduContent" (
      "key" TEXT NOT NULL,
      "dataJson" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EduContent_pkey" PRIMARY KEY ("key")
    );
  `).catch((e) => console.warn("[seed] buat tabel EduContent:", e?.message || e));

  // --- QuizContent (Editor Soal / Bank Kuis — PAKET C lanjutan) ---
  // Tabel ini BOLEH kosong: kalau kosong, kuis memakai soal bawaan.
  // Baris baru hanya muncul saat admin menyimpan hasil editan soal.
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QuizContent" (
      "key" TEXT NOT NULL,
      "dataJson" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "QuizContent_pkey" PRIMARY KEY ("key")
    );
  `).catch((e) => console.warn("[seed] buat tabel QuizContent:", e?.message || e));

  // --- Kolom Hb peserta (pembaruan 15) ---
  // Hasil pemeriksaan hemoglobin yang diisi peserta di halaman Profil,
  // tampil juga di panel admin (Data Peserta). Aman diulang.
  await db.$executeRawUnsafe(
    `ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "hbValue" DOUBLE PRECISION;`
  ).catch((e) => console.warn("[seed] kolom Participant.hbValue:", e?.message || e));
  await db.$executeRawUnsafe(
    `ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "hbCheckDate" TIMESTAMP(3);`
  ).catch((e) => console.warn("[seed] kolom Participant.hbCheckDate:", e?.message || e));

  // --- CustomMission (Misi Buatan Admin — pembaruan 15) ---
  // Tabel BOLEH kosong: kalau kosong, peserta hanya melihat 9 misi inti.
  // Baris baru muncul saat admin membuat misi tambahan di panel admin.
  // Penyelesaian peserta dicatat di "MissionProgress"."missionKey" = 'CUST:<id>'.
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomMission" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL,
      "icon" TEXT NOT NULL DEFAULT '⭐',
      "description" TEXT NOT NULL,
      "xp" INTEGER NOT NULL DEFAULT 50,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((e) => console.warn("[seed] buat tabel CustomMission:", e?.message || e));

  // ============================================================
  // CEK STATUS GIZI (pembaruan 17)
  // Tabel nutrition_assessments — satu baris = satu pemeriksaan.
  // Dibuat dengan IF NOT EXISTS sehingga aman dijalankan berulang
  // dan TIDAK PERNAH mengubah/menghapus tabel lain.
  // ============================================================
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "nutrition_assessments" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" TEXT NOT NULL,
      "participant_id" TEXT NOT NULL,
      "nama_peserta" TEXT NOT NULL,
      "jenis_kelamin" TEXT NOT NULL,
      "tanggal_lahir" DATE NOT NULL,
      "tanggal_pemeriksaan" DATE NOT NULL,
      "usia_tahun" INTEGER NOT NULL,
      "usia_bulan" INTEGER NOT NULL,
      "usia_hari" INTEGER NOT NULL,
      "usia_dalam_hari" INTEGER NOT NULL,
      "berat_badan_kg" NUMERIC(5,2) NOT NULL,
      "tinggi_badan_cm" NUMERIC(5,1) NOT NULL,
      "imt" NUMERIC(6,4) NOT NULL,
      "tb_u_zscore" NUMERIC(5,2) NOT NULL,
      "tb_u_percentile" NUMERIC(5,2) NOT NULL,
      "tb_u_status" TEXT NOT NULL,
      "imt_u_zscore" NUMERIC(5,2) NOT NULL,
      "imt_u_percentile" NUMERIC(5,2) NOT NULL,
      "imt_u_status" TEXT NOT NULL,
      "reference_standard" TEXT NOT NULL DEFAULT 'WHO Growth Reference 2007',
      "reference_version" TEXT NOT NULL DEFAULT 'Tabel expanded LMS WHO, metode WHO AnthroPlus',
      "interpretation" TEXT NOT NULL,
      "recommendation" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((e) => console.warn("[seed] buat tabel nutrition_assessments:", e?.message || e));

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "nutrition_assessments_user_id_idx" ON "nutrition_assessments"("user_id");`
  ).catch((e) => console.warn("[seed] index nutrition(user_id):", e?.message || e));
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "nutrition_assessments_participant_id_tanggal_pemeriksaan_idx" ON "nutrition_assessments"("participant_id", "tanggal_pemeriksaan");`
  ).catch((e) => console.warn("[seed] index nutrition(participant,tanggal):", e?.message || e));
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "nutrition_assessments_tanggal_pemeriksaan_idx" ON "nutrition_assessments"("tanggal_pemeriksaan");`
  ).catch((e) => console.warn("[seed] index nutrition(tanggal):", e?.message || e));

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nutrition_assessments_user_id_fkey') THEN
        ALTER TABLE "nutrition_assessments"
          ADD CONSTRAINT "nutrition_assessments_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nutrition_assessments_participant_id_fkey') THEN
        ALTER TABLE "nutrition_assessments"
          ADD CONSTRAINT "nutrition_assessments_participant_id_fkey"
          FOREIGN KEY ("participant_id") REFERENCES "Participant"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `).catch((e) => console.warn("[seed] relasi nutrition_assessments:", e?.message || e));

  // ============================================================
  // PERKIRAAN BB SESUAI TINGGI BADAN (tambahan fitur Cek Status Gizi)
  // 4 kolom BARU pada tabel yang sama (BUKAN tabel duplikat).
  // Additive + IF NOT EXISTS → aman diulang, data lama TIDAK disentuh.
  // ============================================================
  await db.$executeRawUnsafe(
    `ALTER TABLE "nutrition_assessments" ADD COLUMN IF NOT EXISTS "bb_median_who" NUMERIC(5,2);`
  ).catch((e) => console.warn("[seed] kolom bb_median_who:", e?.message || e));
  await db.$executeRawUnsafe(
    `ALTER TABLE "nutrition_assessments" ADD COLUMN IF NOT EXISTS "bb_min_who" NUMERIC(5,2);`
  ).catch((e) => console.warn("[seed] kolom bb_min_who:", e?.message || e));
  await db.$executeRawUnsafe(
    `ALTER TABLE "nutrition_assessments" ADD COLUMN IF NOT EXISTS "bb_max_who" NUMERIC(5,2);`
  ).catch((e) => console.warn("[seed] kolom bb_max_who:", e?.message || e));
  await db.$executeRawUnsafe(
    `ALTER TABLE "nutrition_assessments" ADD COLUMN IF NOT EXISTS "who_reference" TEXT;`
  ).catch((e) => console.warn("[seed] kolom who_reference:", e?.message || e));

  // Kolom pengingat formulir Cek Status Gizi (jenis kelamin & tanggal lahir
  // disimpan agar pengecekan berikutnya terisi otomatis). Aman diulang.
  await db.$executeRawUnsafe(
    `ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT;`
  ).catch((e) => console.warn("[seed] kolom Participant.jenisKelamin:", e?.message || e));
  await db.$executeRawUnsafe(
    `ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "tanggalLahir" TIMESTAMP(3);`
  ).catch((e) => console.warn("[seed] kolom Participant.tanggalLahir:", e?.message || e));

  // WAJIB lowercase: route login mencari username dalam bentuk lowercase,
  // jadi akun admin juga harus tersimpan lowercase agar login tidak gagal.
  const username = (process.env.ADMIN_USERNAME || "admin@fezone.id").trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || "admin123";

  // PEMULIHAN OTOMATIS: akun admin lama mungkin tersimpan dengan huruf
  // besar/kecil campuran (mis. "Admin@Fezone.id" dari env versi lama).
  // Tanpa langkah ini akun itu tidak pernah ketemu oleh route login dan
  // login admin selalu gagal. Normalisasi menjadi huruf kecil.
  const caseMatch = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (caseMatch && caseMatch.role === "ADMIN" && caseMatch.username !== username) {
    await db.user.update({ where: { id: caseMatch.id }, data: { username } });
    console.log(`[seed] username admin dinormalkan: "${caseMatch.username}" -> "${username}"`);
  }

  await db.user.upsert({
    where: { username },
    create: { username, passwordHash: hashPassword(password), role: "ADMIN" },
    update: {}, // ← kosong: tidak pernah menimpa akun/password yang sudah ada
  });

  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn("[seed] ⚠️ ADMIN_INITIAL_PASSWORD tidak diset — password admin memakai default 'admin123'. Segera ganti setelah login pertama.");
  }
  console.log(`[seed] OK — admin "${username}" siap.`);
}

main()
  .catch((e) => {
    console.error("[seed] GAGAL:", e?.message || e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
