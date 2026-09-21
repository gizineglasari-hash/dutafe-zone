import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getHbStandards } from "@/lib/puskesmas";

// ============================================================
// PEMBARUAN 20 TAHAP 5 — API LAPORAN BULANAN PER PUSKESMAS
// (khusus ADMIN)
// ------------------------------------------------------------
// Satu baris = satu Puskesmas pada satu bulan (WIB):
//   • remajaWilayah  = remaja yang kelurahan domisilinya masuk
//                      wilayah kerja Puskesmas (data induk P19)
//   • pemeriksaan    = jumlah pemeriksaan Hb pada bulan itu
//   • anemia         = pemeriksaan bulan itu dengan Hb di bawah
//                      ambang (standar Kemenkes/WHO aktif)
//   • rataHb         = rata-rata Hb pemeriksaan bulan itu
//   • checkinTtd     = jumlah check-in TTD bulan itu oleh remaja
//                      dalam wilayah
// Sumber 100% data asli (HemoglobinRecord, TTDCheckIn, domisili).
// Puskesmas tanpa aktivitas tetap tampil (nilai 0) agar admin
// melihat cakupan penuh. Tanpa rumus baru — hanya agregasi.
// ============================================================

const WIB = "Asia/Jakarta";

function defaultBulan(): string {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: WIB }); // YYYY-MM-DD
  return s.slice(0, 7);
}

function bulanLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: WIB });
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("bulan") || defaultBulan()).trim();
    if (!/^\d{4}-\d{2}$/.test(raw)) {
      return NextResponse.json({ error: "Format bulan harus YYYY-MM." }, { status: 400 });
    }
    const [y, m] = raw.split("-").map(Number);
    const dari = new Date(`${raw}-01T00:00:00+07:00`);
    const nextKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const sampai = new Date(`${nextKey}-01T00:00:00+07:00`);
    // wibDay(checkDate) === raw  ⇔  dari <= checkDate < sampai

    const [puskesmasList, participants, hbRecords, ttdCheckins, std] = await Promise.all([
      db.masterPuskesmas.findMany({
        select: {
          id: true,
          nama: true,
          isActive: true,
          wilayah: { select: { kelurahan: { select: { nama: true, kecamatan: { select: { nama: true } } } } } },
        },
        orderBy: { nama: "asc" },
      }),
      db.participant.findMany({
        select: { id: true, domisiliKecamatan: true, domisiliKelurahan: true },
      }),
      db.hemoglobinRecord.findMany({
        where: { checkDate: { gte: dari, lt: sampai } },
        select: { participantId: true, hbValue: true, checkDate: true },
      }),
      db.tTDCheckIn.findMany({
        where: { createdAt: { gte: dari, lt: sampai } },
        select: { participantId: true },
      }),
      getHbStandards(),
    ]);

    // Pemetaan remaja -> Puskesmas (via kelurahan domisili)
    const kelToPuskesmas = new Map<string, string>(); // "kecamatan|kelurahan" -> puskesmasId
    for (const pk of puskesmasList) {
      for (const w of pk.wilayah) {
        kelToPuskesmas.set(`${w.kelurahan.kecamatan.nama}|${w.kelurahan.nama}`, pk.id);
      }
    }
    const pidToPuskesmas = new Map<string, string>(); // participantId -> puskesmasId | "LUAR"
    for (const p of participants) {
      const pid =
        (p.domisiliKecamatan && p.domisiliKelurahan && kelToPuskesmas.get(`${p.domisiliKecamatan}|${p.domisiliKelurahan}`)) || "LUAR";
      pidToPuskesmas.set(p.id, pid);
    }

    // Agregasi per Puskesmas
    type Agg = { remajaWilayah: number; pemeriksaan: number; anemia: number; hbSum: number; checkinTtd: number };
    const agg = new Map<string, Agg>();
    const ensure = (id: string): Agg => {
      let cur = agg.get(id);
      if (!cur) agg.set(id, (cur = { remajaWilayah: 0, pemeriksaan: 0, anemia: 0, hbSum: 0, checkinTtd: 0 }));
      return cur;
    };
    for (const p of participants) ensure(pidToPuskesmas.get(p.id) ?? "LUAR");
    for (const t of ttdCheckins) {
      const pid = pidToPuskesmas.get(t.participantId);
      if (pid) ensure(pid).checkinTtd++;
    }
    for (const r of hbRecords) {
      const cur = ensure(pidToPuskesmas.get(r.participantId) ?? "LUAR");
      cur.pemeriksaan++;
      cur.hbSum += r.hbValue;
      if (r.hbValue < std.anemiaBelow) cur.anemia++;
    }

    const perPuskesmas = puskesmasList.map((pk) => {
      const cur = agg.get(pk.id) ?? { remajaWilayah: 0, pemeriksaan: 0, anemia: 0, hbSum: 0, checkinTtd: 0 };
      return {
        id: pk.id,
        nama: pk.nama,
        isActive: pk.isActive,
        kelurahanCount: pk.wilayah.length,
        remajaWilayah: cur.remajaWilayah,
        pemeriksaan: cur.pemeriksaan,
        anemia: cur.anemia,
        prevalensiPct: cur.pemeriksaan ? Math.round((cur.anemia / cur.pemeriksaan) * 100) : null,
        rataHb: cur.pemeriksaan ? Math.round((cur.hbSum / cur.pemeriksaan) * 10) / 10 : null,
        checkinTtd: cur.checkinTtd,
      };
    });
    const luar = agg.get("LUAR") ?? { remajaWilayah: 0, pemeriksaan: 0, anemia: 0, hbSum: 0, checkinTtd: 0 };
    perPuskesmas.push({
      id: "LUAR",
      nama: "Di luar wilayah Puskesmas",
      isActive: true,
      kelurahanCount: 0,
      remajaWilayah: luar.remajaWilayah,
      pemeriksaan: luar.pemeriksaan,
      anemia: luar.anemia,
      prevalensiPct: luar.pemeriksaan ? Math.round((luar.anemia / luar.pemeriksaan) * 100) : null,
      rataHb: luar.pemeriksaan ? Math.round((luar.hbSum / luar.pemeriksaan) * 10) / 10 : null,
      checkinTtd: luar.checkinTtd,
    });
    perPuskesmas.sort((a, b) => b.pemeriksaan - a.pemeriksaan || b.remajaWilayah - a.remajaWilayah || a.nama.localeCompare(b.nama, "id"));

    const totalPemeriksaan = perPuskesmas.reduce((s, r) => s + r.pemeriksaan, 0);
    const totalAnemia = perPuskesmas.reduce((s, r) => s + r.anemia, 0);
    const totalHb = hbRecords.reduce((s, r) => s + r.hbValue, 0);
    const totalRemajaWilayah = perPuskesmas.filter((r) => r.id !== "LUAR").reduce((s, r) => s + r.remajaWilayah, 0);
    const puskesmasAktif = puskesmasList.filter((p) => p.isActive).length;

    return NextResponse.json({
      bulan: raw,
      bulanLabel: bulanLabel(raw),
      tersedia: bulanListTersedia(), // daftar pilihan bulan utk dropdown
      ringkasan: {
        puskesmasTotal: puskesmasList.length,
        puskesmasAktif,
        puskesmasAdaAktivitas: perPuskesmas.filter((r) => r.id !== "LUAR" && r.pemeriksaan > 0).length,
        remajaWilayah: totalRemajaWilayah,
        pemeriksaan: totalPemeriksaan,
        anemia: totalAnemia,
        prevalensiPct: totalPemeriksaan ? Math.round((totalAnemia / totalPemeriksaan) * 100) : null,
        rataHb: totalPemeriksaan ? Math.round((totalHb / totalPemeriksaan) * 10) / 10 : null,
        checkinTtd: perPuskesmas.reduce((s, r) => s + r.checkinTtd, 0),
      },
      perPuskesmas,
    });
  } catch (e) {
    console.error("HEALTH_MONTHLY_ERR", e);
    return NextResponse.json({ error: "Gagal memuat laporan bulanan" }, { status: 500 });
  }
}

/** 12 bulan terakhir (termasuk bulan berjalan), terbaru dulu. */
function bulanListTersedia(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: WIB }) });
  }
  return out;
}
