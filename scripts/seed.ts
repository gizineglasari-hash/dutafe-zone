import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function dateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toLocaleDateString("en-CA");
}

interface DemoPlan {
  name: string; age: number; school: string; level: "SMP" | "SMA"; avatar: string;
  missionsDone: number; // dari M1..M9 (urut, M1 selalu)
  checkins: number; // jumlah check-in terakhir (dihampar 2/minggu)
  pre: number; post: number | null;
  candidate?: boolean; duta?: boolean;
}

const PLANS: DemoPlan[] = [
  { name: "Aulia Rahma Putri", age: 14, school: "SMPN 1 Harapan Bangsa", level: "SMP", avatar: "🌸", missionsDone: 8, checkins: 10, pre: 65, post: 90, candidate: true },
  { name: "Sinta Nur Maharani", age: 13, school: "SMPN 5 Cendekia", level: "SMP", avatar: "🌟", missionsDone: 7, checkins: 8, pre: 60, post: 85, candidate: true },
  { name: "Nabila Safitri", age: 14, school: "SMPN 1 Harapan Bangsa", level: "SMP", avatar: "🦋", missionsDone: 6, checkins: 7, pre: 70, post: 88, candidate: true },
  { name: "Zahra Aulia Fadhila", age: 13, school: "MTs Nusantara Sejahtera", level: "SMP", avatar: "🌺", missionsDone: 5, checkins: 5, pre: 55, post: 80 },
  { name: "Dinda Ayu Kartika", age: 15, school: "SMPN 3 Tunas Muda", level: "SMP", avatar: "⚡", missionsDone: 4, checkins: 4, pre: 50, post: null },
  { name: "Rani Kusumawardani", age: 14, school: "SMPN 5 Cendekia", level: "SMP", avatar: "🍀", missionsDone: 3, checkins: 3, pre: 45, post: null },
  { name: "Alya Ramadhani", age: 17, school: "SMAN 1 Cendekia Utama", level: "SMA", avatar: "💖", missionsDone: 8, checkins: 11, pre: 70, post: 95, candidate: true },
  { name: "Fitri Nur Hasanah", age: 16, school: "SMAN 4 Nusantara Jaya", level: "SMA", avatar: "🌞", missionsDone: 7, checkins: 9, pre: 65, post: 92, candidate: true },
  { name: "Gita Purnama Sari", age: 17, school: "SMAN 1 Cendekia Utama", level: "SMA", avatar: "🌙", missionsDone: 6, checkins: 6, pre: 60, post: 85, candidate: true },
  { name: "Hana Salsabila", age: 16, school: "SMKN Harapan Ilahi", level: "SMA", avatar: "🎀", missionsDone: 5, checkins: 6, pre: 55, post: 82 },
  { name: "Intan Permatasari", age: 17, school: "SMAN 4 Nusantara Jaya", level: "SMA", avatar: "🐉", missionsDone: 4, checkins: 4, pre: 50, post: null },
  { name: "Jihan Alifia Putri", age: 16, school: "SMAN 1 Cendekia Utama", level: "SMA", avatar: "🦸‍♀️", missionsDone: 2, checkins: 2, pre: 40, post: null },
];

const MISSION_ORDER = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"];

// XP calculation mirip aturan server
function planXp(plan: DemoPlan): number {
  let xp = 50; // pretest
  const done = MISSION_ORDER.slice(0, plan.missionsDone);
  const staticXp: Record<string, number> = { M1: 100, M2: 100, M4: 100, M5: 150, M6: 100, M7: 200, M8: 240, M9: 150 };
  for (const m of done) {
    if (m === "M3") {
      xp += plan.checkins * 10 + 50; // XP check-in + bonus
    } else if (m === "M9") {
      xp += 150;
    } else xp += staticXp[m] ?? 0;
  }
  xp += plan.checkins * 10;
  if (plan.post !== null) xp += 150;
  return xp;
}

const BADGE_FOR_MISSION: Record<string, string> = {
  M1: "ANEMIA_FIGHTER", M2: "TTD_CHAMPION", M4: "IRON_FOOD_HUNTER", M7: "PEER_EDUCATOR", M9: "CONSISTENCY_QUEEN",
};

async function main() {
  console.log("Seeding FE-ZONE...");

  // Admin
  await db.user.upsert({
    where: { username: "admin@fezone.id" },
    create: { username: "admin@fezone.id", passwordHash: hashPassword("admin123"), role: "ADMIN" },
    update: {},
  });
  console.log("✓ Admin: admin@fezone.id / admin123");

  await db.appSetting.upsert({
    where: { key: "duta_winners" },
    create: { key: "duta_winners", value: "1" },
    update: {},
  });

  let i = 0;
  for (const plan of PLANS) {
    i++;
    const uname = i === 1 ? "aulia@demo.id" : `demo${i}@fezone.id`;
    const existing = await db.user.findUnique({ where: { username: uname } });
    if (existing) { console.log(`- skip ${plan.name}`); continue; }

    const user = await db.user.create({
      data: {
        username: uname,
        passwordHash: hashPassword("pejuang123"),
        role: "PARTICIPANT",
        participant: {
          create: {
            name: plan.name, age: plan.age, school: plan.school,
            educationLevel: plan.level, avatar: plan.avatar,
            preTestScore: plan.pre, postTestScore: plan.post,
            isDutaCandidate: !!plan.candidate || !!plan.duta,
            isDuta: !!plan.duta,
          },
        },
      },
      include: { participant: true },
    });
    const pid = user.participant!.id;

    // Missions
    const doneKeys = MISSION_ORDER.slice(0, plan.missionsDone);
    for (const key of MISSION_ORDER) {
      const isDone = doneKeys.includes(key);
      await db.missionProgress.create({
        data: {
          participantId: pid, missionKey: key,
          status: isDone ? "COMPLETED" : plan.missionsDone > 0 ? "STARTED" : "LOCKED",
          progress: isDone ? 100 : plan.missionsDone > 0 ? 30 : 0,
          completedAt: isDone ? new Date(Date.now() - (MISSION_ORDER.indexOf(key) + 1) * 2 * 24 * 3600 * 1000) : null,
        },
      });
    }

    // Check-ins (2x/minggu terakhir)
    for (let c = 0; c < plan.checkins; c++) {
      const d = dateStr(c * 3 + 1); // ~2.3x per minggu
      await db.tTDCheckIn.create({ data: { participantId: pid, date: d, xp: 10 } });
    }

    // Badges
    for (const key of doneKeys) {
      const b = BADGE_FOR_MISSION[key];
      if (b) await db.participantBadge.create({ data: { participantId: pid, badgeKey: b } });
    }

    // Quiz results
    await db.quizResult.create({ data: { participantId: pid, quizKey: "PRETEST", score: plan.pre, correct: Math.round(plan.pre / 10), total: 10 } });
    if (plan.post !== null) {
      await db.quizResult.create({ data: { participantId: pid, quizKey: "POSTTEST", score: plan.post, correct: Math.round(plan.post / 10), total: 10 } });
    }

    // XP
    const xp = planXp(plan);
    await db.participant.update({ where: { id: pid }, data: { xp, lastCheckIn: dateStr(1), streakWeeks: Math.min(4, Math.ceil(plan.checkins / 2.5)) } });

    // Activity logs (untuk keaktifan)
    const acts = Math.min(45, 5 + plan.missionsDone * 4 + plan.checkins);
    for (let a = 0; a < acts; a++) {
      await db.activityLog.create({
        data: { participantId: pid, type: a % 3 === 0 ? "LOGIN" : a % 3 === 1 ? "XP" : "MISSION_DONE", createdAt: new Date(Date.now() - (a % 14) * 24 * 3600 * 1000) },
      });
    }

    // Duta stage utk kandidat
    if (plan.candidate || plan.duta) {
      await db.dutaStage.create({
        data: {
          participantId: pid,
          stage1Posttest: plan.post !== null, stage2Quiz: true, stage3Peer: true, stage4Video: true,
          stage5Presentation: "Saya mengusulkan program 'TTD Wednesday Club' — pengingat rutin tiap Rabu lewat grup WA kelas, poster kreatif di mading, dan peer educator yang berbagi cerita manfaat TTD setiap minggu.",
          completedAt: new Date(),
        },
      });
    }

    console.log(`✓ ${plan.name} (${plan.level}, ${xp} XP, ${plan.missionsDone} misi)`);
  }

  // Video submission pending untuk 1 peserta (untuk demo penilaian admin)
  const aulia = await db.participant.findFirst({ where: { name: "Aulia Rahma Putri" } });
  if (aulia) {
    const existing = await db.videoSubmission.findFirst({ where: { participantId: aulia.id } });
    if (!existing) {
      await db.videoSubmission.create({
        data: {
          participantId: aulia.id, missionKey: "M8",
          fileName: "demo-video.mp4", fileUrl: "", durationSec: 45, status: "PENDING",
        },
      });
    }
  }

  console.log("Seed selesai! 🎉");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
