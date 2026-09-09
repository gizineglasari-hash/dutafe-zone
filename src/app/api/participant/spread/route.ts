import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { SPREAD_TARGET } from "@/lib/constants";
import { assertMissionUnlocked, awardBadge, completeMission, syncMissionUnlocks } from "@/lib/gamification";

// Mission 7 — Spread the Fe-Zone
// Share edukasi HANYA via WhatsApp. Target: 5 teman (progress 0/5 → 5/5).
const PLATFORMS = ["whatsapp"]; // hanya WhatsApp sesuai spesifikasi
const TARGET = SPREAD_TARGET;

// ------------------------------------------------------------------
// GET — progress mission Spread the Fe-Zone (jumlah share / 5)
// ------------------------------------------------------------------
export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shares = await db.missionShare.findMany({ where: { participantId: auth.participantId } });
  const mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId: auth.participantId, missionKey: "M7" } },
  });
  // Hanya share WhatsApp yang dihitung menuju target
  const total = shares.filter((s) => s.platform === "whatsapp").reduce((a, s) => a + s.shareCount, 0);
  return NextResponse.json({
    total,
    target: TARGET,
    completed: mp?.status === "COMPLETED",
    platforms: Object.fromEntries(PLATFORMS.map((p) => [p, shares.filter((s) => s.platform === p).reduce((a, s) => a + s.shareCount, 0)])),
  });
}

// ------------------------------------------------------------------
// POST — catat aktivitas share edukasi dari website (WhatsApp saja).
// CATATAN: sistem hanya mencatat klik share dari website —
// ini BUKAN verifikasi otomatis bahwa konten benar-benar dikirim ke teman.
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  // Validasi unlock server-side (anti manipulasi API/URL)
  const unlocked = await assertMissionUnlocked(pid, "M7");
  if (!unlocked) {
    return NextResponse.json({ error: "Mission 7 masih terkunci. Lulus Mission 6 dulu!" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const platform = String(body.platform || "").trim();
  const contentId = body.contentId ? String(body.contentId).slice(0, 60) : null;

  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Share hanya boleh via WhatsApp 📱" }, { status: 400 });
  }

  // Upsert per (peserta, materi, platform) — shareCount bertambah tiap share
  await db.missionShare.upsert({
    where: {
      participantId_contentId_platform: { participantId: pid, contentId: contentId ?? "", platform },
    },
    create: { participantId: pid, contentId, platform, shareCount: 1 },
    update: { shareCount: { increment: 1 } },
  });

  const mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId: pid, missionKey: "M7" } },
  });
  const alreadyCompleted = mp?.status === "COMPLETED";

  const totalShares = (
    await db.missionShare.findMany({ where: { participantId: pid, platform: "whatsapp" } })
  ).reduce((a, s) => a + s.shareCount, 0);

  let completed = false;
  let xpEarned = 0;
  let badge: string | null = null;

  if (!alreadyCompleted && totalShares >= TARGET) {
    // Target tercapai → misi LULUS → reward 200 XP SEKALI (idempotent via status COMPLETED)
    const res = await completeMission(pid, "M7", {
      xpOverride: 200,
      dataJson: JSON.stringify({ shares: totalShares }),
    });
    xpEarned = res.xpAwarded;
    completed = !res.already;
    if (completed && (await awardBadge(pid, "PEER_EDUCATOR"))) badge = "PEER_EDUCATOR";
    await syncMissionUnlocks(pid);
  } else if (!alreadyCompleted) {
    await db.missionProgress.updateMany({
      where: { participantId: pid, missionKey: "M7", status: { in: ["LOCKED", "STARTED"] } },
      data: { status: "STARTED", progress: Math.min(90, Math.round((totalShares / TARGET) * 90)) },
    });
  }

  await db.activityLog.create({
    data: { participantId: pid, type: "SHARE", meta: `${platform}${contentId ? `:${contentId}` : ""}` },
  });

  return NextResponse.json({
    ok: true,
    total: totalShares,
    target: TARGET,
    completed: alreadyCompleted || completed,
    xpEarned,
    badge,
  });
}
