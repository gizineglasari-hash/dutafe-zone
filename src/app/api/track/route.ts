import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// ------------------------------------------------------------
// Penerima kunjungan halaman (dipanggil trackPage() dari browser).
// Anonim: path + visitorId acak + perangkat/browser dari user-agent.
// Ringan: tulis ke DB lalu balas 204 tanpa isi.
// ------------------------------------------------------------

function parseDevice(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Lainnya";
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`tr:${clientIp(req)}`, 240, 60 * 1000)) {
      return new NextResponse(null, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const path = String(body?.path ?? "").slice(0, 200);
    const visitorId = String(body?.visitorId ?? "").slice(0, 80);
    if (!path || !path.startsWith("/") || !visitorId) {
      return new NextResponse(null, { status: 204 });
    }

    const ua = req.headers.get("user-agent") ?? "";
    await db.pageView.create({
      data: {
        visitorId,
        path,
        referrer: String(body?.referrer ?? "").slice(0, 300) || null,
        device: parseDevice(ua),
        browser: parseBrowser(ua),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    // pelacakan gagal = abaikan, jangan ganggu pengguna
    return new NextResponse(null, { status: 204 });
  }
}
