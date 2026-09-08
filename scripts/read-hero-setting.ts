import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s = await db.appSetting.findUnique({ where: { key: "hero_image_url" } });
console.log("hero_image_url =", s?.value ?? "(null)");
await db.$disconnect();
