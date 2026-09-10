import webpush from "web-push";
import { db } from "@/lib/db";

// ------------------------------------------------------------
// Helper pengingat TTD via Web Push (standar W3C, gratis, tanpa
// layanan pihak ketiga seperti FCM/OneSignal).
//
// Kunci VAPID diambil dari Environment Variables di Vercel:
//   - VAPID_PUBLIC_KEY  (kunci publik, dikirim ke browser)
//   - VAPID_PRIVATE_KEY (kunci privat, HANYA di server)
//   - VAPID_SUBJECT     (opsional, alamat kontak mailto:)
// Jika belum diatur, semua fitur push melaporkan "belum siap"
// secara aman — website tetap berjalan normal tanpa error.
// ------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function getVapid(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

export function vapidConfigured(): boolean {
  return getVapid() !== null;
}

export function vapidPublicKey(): string | null {
  return getVapid()?.publicKey ?? null;
}

function ensureWebPush() {
  const vapid = getVapid();
  if (!vapid) return null;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:admin@fezone.id",
    vapid.publicKey,
    vapid.privateKey
  );
  return true;
}

// ------------------------------------------------------------
// Kirim push ke SEMUA perangkat milik satu peserta.
// Perangkat yang sudah tidak valid (404/410 — mis. izin dicabut
// atau browser di-uninstall) otomatis dihapus dari database.
// ------------------------------------------------------------
export async function sendPushToParticipant(
  participantId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureWebPush()) return { sent: 0, failed: 0 };

  const subs = await db.pushSubscription.findMany({ where: { participantId } });
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          // Simpan notifikasi di server push selama 3 hari — jika HP
          // offline lalu online lagi, notifikasi tetap muncul.
          { TTL: 3 * 24 * 3600 }
        );
        sent++;
      } catch (e: unknown) {
        failed++;
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );

  return { sent, failed };
}

// Selisih hari antara dua tanggal "YYYY-MM-DD" (aman zona waktu,
// pakai jam 12:00 supaya tidak tergeser oleh UTC).
export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(fromYmd + "T12:00:00");
  const b = Date.parse(toYmd + "T12:00:00");
  if (Number.isNaN(a) || Number.isNaN(b)) return -1;
  return Math.floor((a - b) / 86400000);
}

// Tanggal hari ini di zona Asia/Jakarta dalam format "YYYY-MM-DD"
export function jakartaTodayYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
