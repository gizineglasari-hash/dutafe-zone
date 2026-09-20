/* eslint-disable @typescript-eslint/no-require-imports */
// ------------------------------------------------------------
// PEMBARUAN 19 — SISTEM MONITORING PUSKESMAS
// Pemulihan skema + data induk Puskesmas Kota Bandung.
// Dipanggil dari seed.production.js setiap build (idempoten).
//
// Prinsip penting:
// 1. CREATE TABLE IF NOT EXISTS — aman dijalankan berulang.
// 2. Data induk di-INSERT dengan ON CONFLICT DO NOTHING —
//    tidak pernah MENIMPA perubahan yang sudah dibuat admin
//    lewat panel (alamat/kontak/wilayah hasil editan admin
//    tetap utuh meski project di-deploy ulang).
// 3. Semua data dari master-data.json = data RESMI Dinkes
//    Kota Bandung (80 UPT Puskesmas, 30 kecamatan, 151
//    kelurahan). BUKAN data dummy. Lihat SOURCES.md.
// 4. ID deterministik (kec-*/kel-*/pus-*/wil-*) supaya
//    konsisten antar build tanpa tabel mapping tambahan.
// ------------------------------------------------------------

const MASTER = require("./master-data.json");

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedPuskesmas(db) {
  // ------------------------------------------------------------
  // 1) PEMULIHAN SKEMA: 7 tabel baru Pembaruan 19
  // ------------------------------------------------------------
  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "MasterKecamatan" (
        "id" TEXT PRIMARY KEY,
        "nama" TEXT NOT NULL UNIQUE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel MasterKecamatan:", e?.message || e));

  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "MasterKelurahan" (
        "id" TEXT PRIMARY KEY,
        "nama" TEXT NOT NULL,
        "kecamatanId" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MasterKelurahan_kecamatanId_fkey" FOREIGN KEY ("kecamatanId")
          REFERENCES "MasterKecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel MasterKelurahan:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "MasterKelurahan_nama_kecamatanId_key"
       ON "MasterKelurahan"("nama", "kecamatanId");`
    )
    .catch((e) => console.warn("[seed-p19] unik kelurahan:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "MasterKelurahan_kecamatanId_idx"
       ON "MasterKelurahan"("kecamatanId");`
    )
    .catch((e) => console.warn("[seed-p19] index kelurahan:", e?.message || e));

  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "MasterPuskesmas" (
        "id" TEXT PRIMARY KEY,
        "nama" TEXT NOT NULL UNIQUE,
        "alamat" TEXT,
        "telp" TEXT,
        "kecamatanId" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MasterPuskesmas_kecamatanId_fkey" FOREIGN KEY ("kecamatanId")
          REFERENCES "MasterKecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel MasterPuskesmas:", e?.message || e));

  // Wilayah kerja: 1 kelurahan hanya boleh dipetakan ke 1 Puskesmas
  // (kelurahanId UNIQUE) agar alur "kelurahan -> Puskesmas" selalu jelas.
  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "PuskesmasWilayah" (
        "id" TEXT PRIMARY KEY,
        "puskesmasId" TEXT NOT NULL,
        "kelurahanId" TEXT NOT NULL,
        CONSTRAINT "PuskesmasWilayah_puskesmasId_fkey" FOREIGN KEY ("puskesmasId")
          REFERENCES "MasterPuskesmas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PuskesmasWilayah_kelurahanId_fkey" FOREIGN KEY ("kelurahanId")
          REFERENCES "MasterKelurahan"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel PuskesmasWilayah:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "PuskesmasWilayah_kelurahanId_key"
       ON "PuskesmasWilayah"("kelurahanId");`
    )
    .catch((e) => console.warn("[seed-p19] unik wilayah:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "PuskesmasWilayah_puskesmasId_idx"
       ON "PuskesmasWilayah"("puskesmasId");`
    )
    .catch((e) => console.warn("[seed-p19] index wilayah:", e?.message || e));

  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "PuskesmasStaff" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "puskesmasId" TEXT NOT NULL,
        "nama" TEXT NOT NULL,
        "jabatan" TEXT,
        "profesi" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "verifiedAt" TIMESTAMP(3),
        "verifiedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PuskesmasStaff_userId_fkey" FOREIGN KEY ("userId")
          REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PuskesmasStaff_puskesmasId_fkey" FOREIGN KEY ("puskesmasId")
          REFERENCES "MasterPuskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel PuskesmasStaff:", e?.message || e));
  // Kolom tambahan Tahap 2: catatanAdmin (alasan tolak/nonaktif, tampil ke petugas).
  // ADD COLUMN IF NOT EXISTS — aman dijalankan berulang & di DB yang sudah berjalan.
  await db
    .$executeRawUnsafe(
      `ALTER TABLE "PuskesmasStaff" ADD COLUMN IF NOT EXISTS "catatanAdmin" TEXT;`
    )
    .catch((e) => console.warn("[seed-p19] kolom catatanAdmin:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "PuskesmasStaff_puskesmasId_idx" ON "PuskesmasStaff"("puskesmasId");`
    )
    .catch((e) => console.warn("[seed-p19] index staff-1:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "PuskesmasStaff_status_idx" ON "PuskesmasStaff"("status");`
    )
    .catch((e) => console.warn("[seed-p19] index staff-2:", e?.message || e));

  // Riwayat Hb: setiap pemeriksaan = baris baru, tidak pernah ditimpa.
  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "HemoglobinRecord" (
        "id" TEXT PRIMARY KEY,
        "participantId" TEXT NOT NULL,
        "checkDate" TIMESTAMP(3) NOT NULL,
        "hbValue" DOUBLE PRECISION NOT NULL,
        "method" TEXT,
        "location" TEXT,
        "examiner" TEXT,
        "notes" TEXT,
        "recordedByUserId" TEXT,
        "staffId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HemoglobinRecord_participantId_fkey" FOREIGN KEY ("participantId")
          REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "HemoglobinRecord_staffId_fkey" FOREIGN KEY ("staffId")
          REFERENCES "PuskesmasStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel HemoglobinRecord:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "HemoglobinRecord_participantId_checkDate_idx"
       ON "HemoglobinRecord"("participantId", "checkDate");`
    )
    .catch((e) => console.warn("[seed-p19] index hb:", e?.message || e));

  // Audit log: TERPISAH dari ActivityLog — tidak ikut terhapus
  // saat akun peserta dihapus (onDelete SET NULL, bukan cascade).
  await db
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT PRIMARY KEY,
        "actorUserId" TEXT,
        "actorRole" TEXT,
        "action" TEXT NOT NULL,
        "targetType" TEXT,
        "targetUserId" TEXT,
        "meta" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId")
          REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId")
          REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );`
    )
    .catch((e) => console.warn("[seed-p19] tabel AuditLog:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");`
    )
    .catch((e) => console.warn("[seed-p19] index audit-1:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");`
    )
    .catch((e) => console.warn("[seed-p19] index audit-2:", e?.message || e));
  await db
    .$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");`
    )
    .catch((e) => console.warn("[seed-p19] index audit-3:", e?.message || e));

  // ------------------------------------------------------------
  // 2) DATA INDUK RESMI (insert-only, tidak pernah menimpa)
  // ------------------------------------------------------------
  if (!MASTER || !Array.isArray(MASTER.kecamatan) || !Array.isArray(MASTER.puskesmas)) {
    console.warn("[seed-p19] ⚠️ master-data.json tidak terbaca — data induk dilewati.");
    return;
  }

  // 2a. Kecamatan (30)
  let nKec = 0;
  for (const nama of MASTER.kecamatan) {
    const r = await db
      .$executeRawUnsafe(
        `INSERT INTO "MasterKecamatan" ("id", "nama") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        `kec-${slug(nama)}`,
        nama
      )
      .catch((e) => {
        console.warn("[seed-p19] kecamatan", nama, e?.message || e);
        return 0;
      });
    nKec += r || 0;
  }

  // 2b. Kelurahan (151)
  let nKel = 0;
  for (const k of MASTER.kelurahan || []) {
    const r = await db
      .$executeRawUnsafe(
        `INSERT INTO "MasterKelurahan" ("id", "nama", "kecamatanId") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        `kel-${slug(k.kecamatan)}-${slug(k.nama)}`,
        k.nama,
        `kec-${slug(k.kecamatan)}`
      )
      .catch((e) => {
        console.warn("[seed-p19] kelurahan", k.nama, e?.message || e);
        return 0;
      });
    nKel += r || 0;
  }

  // 2c. Puskesmas (80) — alamat & telp bisa null (tidak dikarang)
  let nPus = 0;
  for (const p of MASTER.puskesmas || []) {
    const r = await db
      .$executeRawUnsafe(
        `INSERT INTO "MasterPuskesmas" ("id", "nama", "alamat", "telp", "kecamatanId")
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        `pus-${slug(p.nama)}`,
        p.nama,
        p.alamat ?? null,
        p.telp ?? null,
        p.kecamatan ? `kec-${slug(p.kecamatan)}` : null
      )
      .catch((e) => {
        console.warn("[seed-p19] puskesmas", p.nama, e?.message || e);
        return 0;
      });
    nPus += r || 0;
  }

  // 2d. Wilayah kerja (mapping Puskesmas -> kelurahan, parsial sesuai
  //     data resmi yang tersedia; admin bisa melengkapinya lewat panel)
  //     Tahan-duplikat: 1 kelurahan hanya boleh 1 Puskesmas —
  //     jika data sumber punya tumpang tindih, pemetaan PERTAMA yang menang.
  let nWil = 0;
  const wilDipakai = new Set();
  for (const w of MASTER.wilayah || []) {
    const kunci = `${slug(w.kecamatan)}|${slug(w.kelurahan)}`;
    if (wilDipakai.has(kunci)) continue;
    wilDipakai.add(kunci);
    const r = await db
      .$executeRawUnsafe(
        `INSERT INTO "PuskesmasWilayah" ("id", "puskesmasId", "kelurahanId")
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        `wil-${slug(w.puskesmas)}-${slug(w.kecamatan)}-${slug(w.kelurahan)}`,
        `pus-${slug(w.puskesmas)}`,
        `kel-${slug(w.kecamatan)}-${slug(w.kelurahan)}`
      )
      .catch((e) => {
        console.warn("[seed-p19] wilayah", w.puskesmas, w.kelurahan, e?.message || e);
        return 0;
      });
    nWil += r || 0;
  }

  console.log(
    `[seed-p19] OK — kecamatan baru: ${nKec}, kelurahan baru: ${nKel}, puskesmas baru: ${nPus}, wilayah baru: ${nWil} (sisanya sudah ada, tidak ditimpa).`
  );
}

module.exports = { seedPuskesmas };
