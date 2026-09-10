import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { daysBetween, jakartaTodayYmd, vapidConfigured } from "@/lib/push";

// ------------------------------------------------------------
// Statistik sistem pengingat TTD untuk panel Admin:
//  - jumlah perangkat & peserta yang mengaktifkan pengingat
//  - jumlah peserta yang sedang "jatuh tempo" (>= 7 hari tidak check-in)
//  - jumlah pengingat terkirim (total & 7 hari terakhir)
//  - 15 log pengiriman terakhir
// ------------------------------------------------------------

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = vapidConfigured();
  const today = jakartaTodayYmd();

  const subs = await db.pushSubscription.findMany({
    select: { participantId: true, userAgent: true, createdAt: true },
  });
  const participantIds = [...new Set(subs.map((s) => s.participantId))];

  // Check-in terakhir untuk peserta berlangganan push
  const checkins = await db.tTDCheckIn.groupBy({
    by: ["participantId"],
    _max: { date: true },
    where: { participantId: { in: participantIds } },
  });
  const lastMap = new Map(checkins.map((c) => [c.participantId, c._max.date]));

  let dueWithPush = 0; // berlangganan + >= 7 hari tidak check-in
  for (const pid of participantIds) {
    const last = lastMap.get(pid);
    if (last && daysBetween(today, last) >= 7) dueWithPush++;
  }

  // Semua peserta (dengan/tanpa push) yang >= 7 hari tidak check-in
  const allCheckins = await db.tTDCheckIn.groupBy({
    by: ["participantId"],
    _max: { date: true },
  });
  let overdueAll = 0;
  for (const c of allCheckins) {
    if (c._max.date && daysBetween(today, c._max.date) >= 7) overdueAll++;
  }

  const [sentTotal, sent7d] = await Promise.all([
    db.ttdReminderLog.count({ where: { kind: "weekly", success: true } }),
    db.ttdReminderLog.count({
      where: { kind: "weekly", success: true, sentAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
  ]);

  const recentLogs = await db.ttdReminderLog.findMany({
    take: 15,
    orderBy: { sentAt: "desc" },
    include: { participant: { select: { name: true, school: true } } },
  });

  return NextResponse.json({
    configured,
    totalSubscriptions: subs.length,
    participantsWithPush: participantIds.length,
    dueWithPush,
    overdueAll,
    sentTotal,
    sent7d,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      name: l.participant?.name ?? "(terhapus)",
      school: l.participant?.school ?? "",
      sentAt: l.sentAt,
      success: l.success,
      error: l.error,
      kind: l.kind,
    })),
  });
}
