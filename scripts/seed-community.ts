import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Demo konten komunitas: video YouTube publik edukasi kesehatan + status bervariasi
const DEMO = [
  {
    name: "Alya Ramadhani", title: "Kenapa Remaja Putri Perlu TTD?",
    url: "https://www.youtube.com/watch?v=ScMzIvxBSi4", platform: "youtube",
    desc: "3 alasan kenapa TTD itu penting buat kita semua! #FEZONE #RemajaPutriBebasAnemia",
    status: "APPROVED", likes: 12,
  },
  {
    name: "Aulia Rahma Putri", title: "3 Makanan Sumber Zat Besi Favoritku",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", platform: "youtube",
    desc: "Bayam, telur, dan tempe — murah, enak, kaya zat besi!",
    status: "APPROVED", likes: 7,
  },
  {
    name: "Fitri Nur Hasanah", title: "5 Mitos Anemia yang Bikin Kaget",
    url: "https://www.tiktok.com/@infokesehatan/video/7123456789012345678", platform: "tiktok",
    desc: "Jangan percaya mitos! Cek faktanya di video ini.",
    status: "PENDING", likes: 0,
  },
  {
    name: "Gita Purnama Sari", title: "Tips Cegah Anemia Saat Puasa",
    url: "", platform: "none",
    desc: "Sahur dengan menu kaya zat besi + vitamin C: tumis bayam, telur, dan segelas jus jambu. Hindari teh/kopi saat makan agar serapan zat besi maksimal. Cek Hb rutin ya!",
    status: "APPROVED", likes: 3,
  },
];

async function main() {
  console.log("Seeding community content...");
  let added = 0;
  for (const d of DEMO) {
    const participant = await db.participant.findFirst({ where: { name: d.name } });
    if (!participant) {
      console.log(`- skip ${d.name} (tidak ada)`);
      continue;
    }
    const exists = await db.communityContent.findFirst({
      where: { participantId: participant.id, title: d.title },
    });
    if (exists) {
      console.log(`- skip ${d.title}`);
      continue;
    }
    const c = await db.communityContent.create({
      data: {
        participantId: participant.id,
        contentType: d.platform === "none" ? "education" : "peer_educator",
        title: d.title,
        description: d.desc,
        platform: d.platform,
        externalUrl: d.url || null,
        videoUrl: d.url || null,
        thumbnailUrl: d.platform === "youtube" && d.url ? `https://i.ytimg.com/vi/${d.url.split("v=")[1]}/hqdefault.jpg` : null,
        status: d.status,
        durationSec: d.platform === "none" ? null : 45,
        likesCount: d.likes,
        xpAwarded: d.status === "APPROVED" && d.platform !== "none" ? 100 : 0,
        xpGiven: d.status === "APPROVED" && d.platform !== "none",
        approvedAt: d.status === "APPROVED" ? new Date() : null,
        approvedBy: d.status === "APPROVED" ? "seed" : null,
      },
    });
    // Buat like unik dari user lain utk konten approved
    if (d.status === "APPROVED" && d.likes > 0) {
      const otherUsers = await db.user.findMany({
        where: { role: "PARTICIPANT", participant: { is: { id: { not: participant.id } } } },
        select: { id: true },
        take: d.likes,
      });
      for (const u of otherUsers) {
        await db.contentLike.create({ data: { contentId: c.id, userId: u.id } }).catch(() => {});
      }
      await db.communityContent.update({ where: { id: c.id }, data: { likeBonusMilestones: 0 } });
    }
    added++;
    console.log(`✓ ${d.title} (${d.status})`);
  }

  // Demo mission shares utk Aulia
  const aulia = await db.participant.findFirst({ where: { name: "Aulia Rahma Putri" } });
  if (aulia) {
    const existing = await db.missionShare.count({ where: { participantId: aulia.id } });
    if (existing === 0) {
      await db.missionShare.createMany({
        data: [
          { participantId: aulia.id, contentId: "EDU_ANEMIA", platform: "whatsapp", shareCount: 2 },
          { participantId: aulia.id, contentId: "EDU_ANEMIA", platform: "instagram", shareCount: 1 },
        ],
      });
      await db.missionProgress.updateMany({
        where: { participantId: aulia.id, missionKey: "M7", status: { in: ["LOCKED", "STARTED"] } },
        data: { status: "STARTED", progress: 90 },
      });
      console.log("✓ Mission shares Aulia (3 total)");
    }
  }
  console.log(`Seed community selesai — ${added} konten ditambahkan.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
