import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToParticipant, vapidConfigured, daysBetween, jakartaTodayYmd } from "@/lib/push";

// ------------------------------------------------------------
// CRON PENGINGAT TTD — dipanggil otomatis oleh Vercel Cron
// SETIAP HARI pukul 02:00 UTC (09:00 WIB) via vercel.json.
//
// Aturan pengiriman (semua dihitung di SERVER dari database asli):
//  1. Hanya peserta yang AKTIF mengaktifkan pengingat (ada
//     PushSubscription) yang diproses.
//  2. Hanya peserta yang sudah pernah check-in TTD minimal 1x
//     (peserta yang belum mulai sama sekali tidak diganggu).
//  3. Jika check-in terakhir >= 7 hari lalu → kirim pengingat.
//  4. IDEMPOTEN: maksimal 1 pengingat per 7 hari per peserta,
//     dicatat di tabel TtdReminderLog — tidak pernah dobel.
//  5. Begitu peserta check-in lagi, hitungan 7 hari mulai ulang
//     (check-in memang menulis tanggal baru di TTDCheckIn).
//
// Keamanan: jika env CRON_SECRET diatur di Vercel, Vercel Cron
// otomatis mengirim header "Authorization: Bearer <rahasia>".
// Endpoint juga menerima ?key=<rahasia> untuk uji manual via browser.
// ------------------------------------------------------------

export async function GET(req: NextRequest) {
  // ----- Autentikasi cron -----
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const header = req.headers.get("authorization");
    const keyParam = new URL(req.url).searchParams.get("key");
    if (header !== `Bearer ${secret}` && keyParam !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!vapidConfigured()) {
    return NextResponse.json(
      { error: "PUSH_NOT_CONFIGURED", message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diatur." },
      { status: 503 }
    );
  }

  const today = jakartaTodayYmd();

  // 1. Semua peserta yang memiliki langganan push aktif
  const subs = await db.pushSubscription.findMany({
    select: { participantId: true },
    distinct: ["participantId"],
  });
  const participantIds = subs.map((s) => s.participantId);

  let checked = 0;
  let reminded = 0;
  let skippedRecentlyReminded = 0;
  let notDue = 0;
  const errors: string[] = [];

  // Proses satu per satu (jumlah peserta masih kecil; aman & mudah dilacak)
  for (const participantId of participantIds) {
    checked++;

    // 2. Tanggal check-in terakhir dari DATABASE (sumber kebenaran)
    const lastCheckIn = await db.tTDCheckIn.findFirst({
      where: { participantId },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    // Peserta belum pernah check-in sama sekali → tidak diganggu
    if (!lastCheckIn?.date) {
      notDue++;
      continue;
    }

    const daysSince = daysBetween(today, lastCheckIn.date);
    if (daysSince < 7) {
      notDue++;
      continue;
    }

    // 3. IDEMPOTEN: sudah diingatkan dalam 7 hari terakhir → lewati
    const lastLog = await db.ttdReminderLog.findFirst({
      where: { participantId, kind: "weekly", success: true },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });
    if (lastLog && Date.now() - lastLog.sentAt.getTime() < 7 * 86400000) {
      skippedRecentlyReminded++;
      continue;
    }

    // 4. Kirim pengingat
    const payload = {
      title: "💊 Saatnya Ingat TTD!",
      body:
        daysSince === 7
          ? "Sudah seminggu sejak check-in TTD terakhirmu. Yuk check-in sekarang & jaga streak-mu! 🔥"
          : `Sudah ${daysSince} hari sejak check-in TTD terakhirmu. Yuk check-in sekarang! 💪`,
      url: "/?view=app&tab=ttd",
      tag: "fezone-ttd-reminder",
    };

    try {
      const r = await sendPushToParticipant(participantId, payload);
      await db.ttdReminderLog.create({
        data: {
          participantId,
          kind: "weekly",
          success: r.sent > 0,
          error: r.sent > 0 ? null : `0 terkirim, ${r.failed} gagal`,
        },
      });
      if (r.sent > 0) reminded++;
      else errors.push(`${participantId}: gagal kirim ke ${r.failed} perangkat`);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "unknown";
      errors.push(`${participantId}: ${msg}`);
      await db.ttdReminderLog
        .create({ data: { participantId, kind: "weekly", success: false, error: msg.slice(0, 250) } })
        .catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    today,
    checked,
    reminded,
    notDue,
    skippedRecentlyReminded,
    errors,
  });
}
