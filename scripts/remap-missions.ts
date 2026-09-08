// Remap mission lama -> urutan baru:
//   lama M2 = Kenali Senjata (quiz)  -> baru M3
//   lama M3 = TTD Tracker            -> baru M2
// Jalankan sekali setelah db push schema baru.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rows = await db.missionProgress.findMany({
    where: { missionKey: { in: ["M2", "M3"] } },
  });
  console.log(`Remap ${rows.length} baris MissionProgress...`);

  for (const r of rows) {
    const target = r.missionKey === "M2" ? "__TMP_M3" : "__TMP_M2";
    await db.missionProgress.update({ where: { id: r.id }, data: { missionKey: target } });
  }
  for (const r of rows) {
    const target = r.missionKey === "M2" ? "M3" : "M2";
    await db.missionProgress.update({ where: { id: r.id }, data: { missionKey: target } });
  }
  console.log("Selesai. Verifikasi:");
  const check = await db.missionProgress.groupBy({
    by: ["missionKey", "status"],
    _count: true,
    where: { missionKey: { in: ["M2", "M3"] } },
  });
  console.log(check);
}

main().finally(() => db.$disconnect());
