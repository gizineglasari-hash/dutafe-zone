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
