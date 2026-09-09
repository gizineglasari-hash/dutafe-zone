import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// ------------------------------------------------------------------
// GET — Feed publik 🌟 Fe-Zone Community (hanya konten APPROVED)
// Filter: type | platform | level | q (search nama/sekolah/judul)
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const platform = searchParams.get("platform") || "all";
  const level = searchParams.get("level") || "all";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(60, parseInt(searchParams.get("limit") || "40", 10) || 40);

  const where: Record<string, unknown> = { status: "APPROVED" };
  if (type === "education" || type === "peer_educator") where.contentType = type;
  if (["youtube", "instagram", "tiktok", "uploaded"].includes(platform)) where.platform = platform;
  if (level === "SMP" || level === "SMA") where.participant = { educationLevel: level };

  const contents = await db.communityContent.findMany({
    where,
    include: {
      participant: { select: { id: true, name: true, school: true, educationLevel: true, avatar: true, profilePhotoUrl: true, isDuta: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Siapa yang login (untuk status Like miliknya)
  const user = await getSessionUser();
  let likedIds = new Set<string>();
  if (user) {
    const likes = await db.contentLike.findMany({
      where: { userId: user.id, contentId: { in: contents.map((c) => c.id) } },
      select: { contentId: true },
    });
    likedIds = new Set(likes.map((l) => l.contentId));
  }

  const filtered = q
    ? contents.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.participant.name.toLowerCase().includes(q) ||
        c.participant.school.toLowerCase().includes(q)
      )
    : contents;

  return NextResponse.json({
    contents: filtered.map((c) => ({
      id: c.id,
      contentType: c.contentType,
      title: c.title,
      description: c.description,
      platform: c.platform,
      externalUrl: c.externalUrl,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      likesCount: c.likesCount,
      createdAt: c.createdAt,
      likedByMe: likedIds.has(c.id),
      participant: {
        id: c.participant.id,
        name: c.participant.name,
        school: c.participant.school,
        educationLevel: c.participant.educationLevel,
        avatar: c.participant.avatar,
        profilePhotoUrl: c.participant.profilePhotoUrl,
        isDuta: c.participant.isDuta,
      },
    })),
  });
}
