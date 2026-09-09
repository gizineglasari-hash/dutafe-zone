import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLevel } from "@/lib/constants";

// GET — Top 3 leaderboard SMP & SMA (publik, untuk landing page sebelum login).
// Hanya menampilkan data aman: nama, sekolah, avatar, XP, level — tanpa data sensitif.
export async function GET() {
  const result: Record<string, unknown> = {};

  for (const lv of ["SMP", "SMA"] as const) {
    const participants = await db.participant.findMany({
      where: { educationLevel: lv },
      orderBy: [{ xp: "desc" }, { name: "asc" }],
      take: 3,
      select: {
        id: true,
        name: true,
        school: true,
        avatar: true,
        profilePhotoUrl: true,
        xp: true,
        isDuta: true,
      },
    });

    result[lv] = participants.map((p, i) => {
      const lvInfo = getLevel(p.xp);
      return {
        rank: i + 1,
        id: p.id,
        name: p.name,
        school: p.school,
        avatar: p.avatar,
        profilePhotoUrl: p.profilePhotoUrl,
        xp: p.xp,
        level: lvInfo.level,
        levelIcon: lvInfo.icon,
        levelName: lvInfo.name,
        isDuta: p.isDuta,
      };
    });
  }

  return NextResponse.json(result);
}
