import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";

// Bonus engagement yang aman: setiap 10 Like unik = +20 XP (sekali per milestone)
const LIKE_BONUS_STEP = 10;
const LIKE_BONUS_XP = 20;

// ------------------------------------------------------------------
// POST — Like / Unlike (toggle). 1 akun = 1 Like per konten.
// Unique constraint contentId + userId mencegah Like ganda.
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login untuk memberikan Like ❤️" }, { status: 401 });
  }

  const { contentId } = await req.json().catch(() => ({}));
  if (!contentId || typeof contentId !== "string") {
    return NextResponse.json({ error: "contentId wajib" }, { status: 400 });
  }

  const content = await db.communityContent.findUnique({ where: { id: contentId } });
  if (!content) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });
  if (content.status !== "APPROVED") {
    return NextResponse.json({ error: "Konten belum disetujui" }, { status: 403 });
  }

  const existing = await db.contentLike.findUnique({
    where: { contentId_userId: { contentId, userId: user.id } },
  });

  let liked: boolean;
  if (existing) {
    // Unlike
    await db.contentLike.delete({ where: { id: existing.id } });
    await db.communityContent.update({
      where: { id: contentId },
      data: { likesCount: { decrement: 1 } },
    });
    liked = false;
  } else {
    // Like — unique constraint melindungi dari spam
    try {
      await db.contentLike.create({ data: { contentId, userId: user.id } });
    } catch {
      return NextResponse.json({ error: "Kamu sudah memberikan Like untuk konten ini" }, { status: 409 });
    }
    const updated = await db.communityContent.update({
      where: { id: contentId },
      data: { likesCount: { increment: 1 } },
    });
    liked = true;

    // Bonus XP berbasis Like unik — hanya melintasi milestone baru, aman dari Unlike→Like berulang
    if (content.participantId !== user.participantId) {
      const milestones = Math.floor(updated.likesCount / LIKE_BONUS_STEP);
      if (milestones > content.likeBonusMilestones) {
        const newMilestones = milestones - content.likeBonusMilestones;
        const bonus = newMilestones * LIKE_BONUS_XP;
        await db.communityContent.update({
          where: { id: contentId },
          data: {
            likeBonusMilestones: milestones,
            likeBonusXp: { increment: bonus },
          },
        });
        await awardXp(content.participantId, bonus, "LIKE_BONUS", contentId);
      }
    }
  }

  const fresh = await db.communityContent.findUnique({
    where: { id: contentId },
    select: { likesCount: true },
  });

  return NextResponse.json({ ok: true, liked, likesCount: fresh?.likesCount ?? 0 });
}
