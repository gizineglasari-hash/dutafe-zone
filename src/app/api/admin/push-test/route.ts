import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendPushToParticipant, vapidConfigured } from "@/lib/push";

// ------------------------------------------------------------
// Kirim NOTIFIKASI TEST ke semua perangkat yang terdaftar.
// Dipakai admin untuk memastikan push benar-benar sampai ke HP.
// Tidak mengganggu hitungan pengingat mingguan (kind: "test").
// ------------------------------------------------------------

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!vapidConfigured()) {
    return NextResponse.json(
      { error: "PUSH_NOT_CONFIGURED", message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diatur di Vercel." },
      { status: 503 }
    );
  }

  const subs = await db.pushSubscription.findMany({
    select: { participantId: true },
    distinct: ["participantId"],
  });

  if (subs.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      sent: 0,
      message: "Belum ada peserta yang mengaktifkan pengingat, jadi tidak ada yang dikirimi test.",
    });
  }

  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    const r = await sendPushToParticipant(s.participantId, {
      title: "🔔 Test Pengingat FE-ZONE",
      body: "Ini notifikasi TEST dari admin. Jika kamu melihat ini, pengingat mingguan TTD siap bekerja! 🎉",
      url: "/?view=app&tab=ttd",
      tag: "fezone-push-test",
    });
    sent += r.sent;
    failed += r.failed;
    await db.ttdReminderLog.create({
      data: {
        participantId: s.participantId,
        kind: "test",
        success: r.sent > 0,
        error: r.sent > 0 ? null : `0 terkirim, ${r.failed} gagal`,
      },
    });
  }

  return NextResponse.json({ ok: true, total: subs.length, sent, failed });
}
