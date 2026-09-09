import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// ------------------------------------------------------------
// Analisa kunjungan web (ala Vercel Analytics) untuk admin.
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD  (tanggal zona WIB)
// Semua agregasi dihitung di server, zona waktu Asia/Jakarta.
// ------------------------------------------------------------

const WIB = "Asia/Jakarta";

function wibDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: WIB }); // en-CA => YYYY-MM-DD
}

function startOfWibDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const todayStr = wibDay(new Date());
    let fromStr = searchParams.get("from") || todayStr;
    let toStr = searchParams.get("to") || todayStr;

    // Validasi format & urutan
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(fromStr) || !dateRe.test(toStr)) {
      fromStr = todayStr;
      toStr = todayStr;
    }
    if (fromStr > toStr) [fromStr, toStr] = [toStr, fromStr];

    const from = startOfWibDay(fromStr);
    const to = new Date(`${toStr}T23:59:59.999+07:00`);

    const rows = await db.pageView.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { visitorId: true, path: true, device: true, browser: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // ---- Totals ----
    const visitors = new Set<string>();
    const pageVisitors = new Map<string, Set<string>>();
    const pageViews = new Map<string, number>();
    const deviceVisitors = new Map<string, Set<string>>();
    const browserVisitors = new Map<string, Set<string>>();
    const dailyViews = new Map<string, number>();
    const dailyVisitors = new Map<string, Set<string>>();

    for (const r of rows) {
      visitors.add(r.visitorId);

      pageViews.set(r.path, (pageViews.get(r.path) ?? 0) + 1);
      let pv = pageVisitors.get(r.path);
      if (!pv) pageVisitors.set(r.path, (pv = new Set()));
      pv.add(r.visitorId);

      let dv = deviceVisitors.get(r.device);
      if (!dv) deviceVisitors.set(r.device, (dv = new Set()));
      dv.add(r.visitorId);

      let bv = browserVisitors.get(r.browser);
      if (!bv) browserVisitors.set(r.browser, (bv = new Set()));
      bv.add(r.visitorId);

      const day = wibDay(r.createdAt);
      dailyViews.set(day, (dailyViews.get(day) ?? 0) + 1);
      let dsv = dailyVisitors.get(day);
      if (!dsv) dailyVisitors.set(day, (dsv = new Set()));
      dsv.add(r.visitorId);
    }

    // ---- Sedang online: visitor unik 5 menit terakhir ----
    const liveRows = await db.pageView.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
      select: { visitorId: true },
      distinct: ["visitorId"],
    });
    const liveNow = liveRows.length;

    // ---- Top pages (maks 12) ----
    const topPages = Array.from(pageViews.entries())
      .map(([path, views]) => ({ path, views, visitors: (pageVisitors.get(path) ?? new Set()).size }))
      .sort((a, b) => b.views - a.views || b.visitors - a.visitors)
      .slice(0, 12);

    // ---- Perangkat & browser (pengunjung unik) ----
    const devices = Array.from(deviceVisitors.entries())
      .map(([device, set]) => ({ device, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors);
    const browsers = Array.from(browserVisitors.entries())
      .map(([browser, set]) => ({ browser, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors);

    // ---- Tren harian (isi hari kosong agar grafik kontinu) ----
    const daily: { date: string; views: number; visitors: number }[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const day = wibDay(cursor);
      daily.push({
        date: day,
        views: dailyViews.get(day) ?? 0,
        visitors: (dailyVisitors.get(day) ?? new Set()).size,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      range: { from: fromStr, to: toStr },
      totals: {
        visitors: visitors.size,
        pageviews: rows.length,
        liveNow,
        avgPages: visitors.size ? Math.round((rows.length / visitors.size) * 10) / 10 : 0,
      },
      topPages,
      devices,
      browsers,
      daily,
    });
  } catch (e) {
    console.error("ANALYTICS_ERR", e);
    return NextResponse.json({ error: "Gagal memuat analisa kunjungan" }, { status: 500 });
  }
}
