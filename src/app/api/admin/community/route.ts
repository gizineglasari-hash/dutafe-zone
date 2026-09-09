import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PEER_VIDEO_MAX_XP } from "@/lib/constants";
import { awardXp } from "@/lib/gamification";

// ------------------------------------------------------------------
// GET — daftar semua konten komunitas utk moderasi
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all"; // all | PENDING | APPROVED | REJECTED
  const type = searchParams.get("type") || "all"; // all | education | peer_educator

  const where: Record<string, unknown> = {};
  if (["PENDING", "APPROVED", "REJECTED"].includes(status)) where.status = status;
  if (["education", "peer_educator"].includes(type)) where.contentType = type;

  const contents = await db.communityContent.findMany({
    where,
    include: {
      participant: { select: { id: true, name: true, school: true, educationLevel: true, avatar: true, profilePhotoUrl: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    contents: contents.map((c) => ({
      id: c.id,
      contentType: c.contentType,
      title: c.title,
      description: c.description,
      platform: c.platform,
      externalUrl: c.externalUrl,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      durationSec: c.durationSec,
      status: c.status,
      likesCount: c.likesCount,
      xpAwarded: c.xpGiven ? c.xpAwarded : 0,
      rejectReason: c.rejectReason,
      createdAt: c.createdAt,
      participant: c.participant,
    })),
  });
}

// ------------------------------------------------------------------
// POST — aksi moderasi: approve | reject | delete
// XP peer educator diberikan SEKALI per konten (xpGiven flag).
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, contentId, reason } = body ?? {};
  if (!contentId || typeof contentId !== "string") {
    return NextResponse.json({ error: "contentId wajib" }, { status: 400 });
  }

  const content = await db.communityContent.findUnique({ where: { id: contentId } });
  if (!content) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

  if (action === "approve") {
    // XP per video DITETAPKAN ADMIN (0 .. 300) — wajib untuk peer_educator yang belum diberi XP
    const xpInput = Number(body.xpAward);
    if (content.contentType === "peer_educator" && !content.xpGiven) {
      if (body.xpAward === undefined || body.xpAward === null || body.xpAward === "" || isNaN(xpInput) || xpInput < 0 || xpInput > PEER_VIDEO_MAX_XP) {
        return NextResponse.json({ error: `XP harus angka 0-${PEER_VIDEO_MAX_XP} (maks +${PEER_VIDEO_MAX_XP} XP per video)` }, { status: 400 });
      }
    }
    const assignedXp = isNaN(xpInput) ? 0 : Math.max(0, Math.min(PEER_VIDEO_MAX_XP, Math.round(xpInput)));

    let xpDelta = 0;

    // XP sekali per konten — refresh/re-approve tidak akan memberi XP lagi
    if (content.contentType === "peer_educator" && !content.xpGiven) {
      xpDelta = assignedXp;
      if (xpDelta > 0) await awardXp(content.participantId, xpDelta, "PEER_VIDEO_APPROVED", content.id);
    }

    const updated = await db.communityContent.update({
      where: { id: contentId },
      data: {
        status: "APPROVED",
        rejectReason: null,
        approvedAt: new Date(),
        approvedBy: admin.username,
        ...(content.contentType === "peer_educator" && !content.xpGiven
          ? { xpGiven: true, xpAwarded: assignedXp }
          : {}),
      },
    });

    // Jika peserta belum menyelesaikan M8 & ini video peer educator → M8 selesai otomatis
    if (content.contentType === "peer_educator") {
      const mp = await db.missionProgress.findUnique({
        where: { participantId_missionKey: { participantId: content.participantId, missionKey: "M8" } },
      });
      if (mp && mp.status !== "COMPLETED") {
        await db.missionProgress.update({
          where: { id: mp.id },
          data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
        });
      }
      const ds = await db.dutaStage.findUnique({ where: { participantId: content.participantId } });
      if (!ds) {
        await db.dutaStage.create({ data: { participantId: content.participantId, stage4Video: true } });
      } else if (!ds.stage4Video) {
        await db.dutaStage.update({ where: { id: ds.id }, data: { stage4Video: true } });
      }
    }

    return NextResponse.json({ ok: true, content: updated, xpDelta });
  }

  if (action === "reject") {
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi" }, { status: 400 });
    }
    // Jika sebelumnya approved lalu di-reject → XP TIDAK dicabut (tetap xpGiven=true) agar tidak merusak riwayat XP
    const updated = await db.communityContent.update({
      where: { id: contentId },
      data: { status: "REJECTED", rejectReason: String(reason).trim().slice(0, 300) },
    });
    return NextResponse.json({ ok: true, content: updated });
  }

  if (action === "delete") {
    await db.communityContent.delete({ where: { id: contentId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
