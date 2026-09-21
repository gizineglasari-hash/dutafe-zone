import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getHbStandards } from "@/lib/puskesmas";

// ============================================================
// PEMBARUAN 20 TAHAP 4 — API Analitik Kesehatan (khusus ADMIN)
// ------------------------------------------------------------
// Sumber data 100% asli dari database (tanpa data dummy):
//   • HemoglobinRecord        = riwayat Hb hasil input petugas Puskesmas
//   • Participant.hbValue     = Hb terakhir (sinkron otomatis / data lama)
//   • NutritionAssessment     = riwayat status gizi (WHO 2007)
//   • Participant.domisili*   = wilayah domisili remaja (pembaruan 19)
//   • MasterPuskesmas/Wilayah = pemetaan kelurahan -> Puskesmas
// Klasifikasi anemia memakai standar yang SAMA dengan seluruh
// aplikasi (getHbStandards — Kemenkes/WHO, bisa diatur admin).
// Tidak ada rumus baru — hanya agregasi.
// ============================================================

const WIB = "Asia/Jakarta";

/** Kunci bulan WIB dari sebuah Date -> "YYYY-MM". */
function wibMonthKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: WIB }).slice(0, 7);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [participants, hbRecords, nutritions, puskesmasList, std] = await Promise.all([
      db.participant.findMany({
        select: {
          id: true,
          name: true,
          educationLevel: true,
          school: true,
          schoolDistrict: true,
          domisiliKecamatan: true,
          domisiliKelurahan: true,
          hbValue: true,
          hbCheckDate: true,
        },
      }),
      db.hemoglobinRecord.findMany({
        select: { participantId: true, checkDate: true, hbValue: true },
        orderBy: { checkDate: "asc" },
      }),
      db.nutritionAssessment.findMany({
        select: { participantId: true, tanggalPemeriksaan: true, imtUStatus: true, tbUStatus: true },
        orderBy: { tanggalPemeriksaan: "asc" },
      }),
      db.masterPuskesmas.findMany({
        select: {
          id: true,
          nama: true,
          wilayah: {
            select: { kelurahan: { select: { nama: true, kecamatan: { select: { nama: true } } } } },
          },
        },
      }),
      getHbStandards(),
    ]);

    // ----------------------------------------------------------
    // 1) Hb TERAKHIR per remaja (prevalensi = titik, bukan dobel hitung)
    //    Prioritas: baris terbaru di HemoglobinRecord. Remaja tanpa
    //    record (data lama sebelum Pembaruan 19) memakai hbValue.
    // ----------------------------------------------------------
    const latestHb = new Map<string, { hb: number; date: Date | null }>();
    for (const r of hbRecords) {
      latestHb.set(r.participantId, { hb: r.hbValue, date: r.checkDate });
    }
    const hasRecord = new Set(hbRecords.map((r) => r.participantId));
    const legacyHb: { participantId: string; hb: number; date: Date | null }[] = [];
    for (const p of participants) {
      if (!hasRecord.has(p.id) && p.hbValue !== null) {
        latestHb.set(p.id, { hb: p.hbValue, date: p.hbCheckDate });
        legacyHb.push({ participantId: p.id, hb: p.hbValue, date: p.hbCheckDate });
      }
    }

    // ----------------------------------------------------------
    // 2) Kartu ringkasan + distribusi klasifikasi anemia
    // ----------------------------------------------------------
    const totalRemaja = participants.length;
    const klas = { normal: 0, ringan: 0, sedang: 0, berat: 0 };
    let sudahCekHb = 0;
    let anemia = 0;
    let hbSum = 0;
    for (const p of participants) {
      const e = latestHb.get(p.id);
      if (!e) continue;
      sudahCekHb++;
      hbSum += e.hb;
      if (e.hb < std.beratBelow) klas.berat++;
      else if (e.hb < std.sedangBelow) klas.sedang++;
      else if (e.hb < std.anemiaBelow) klas.ringan++;
      else klas.normal++;
      if (e.hb < std.anemiaBelow) anemia++;
    }
    const belumCek = totalRemaja - sudahCekHb;
    const prevalensiPct = sudahCekHb ? Math.round((anemia / sudahCekHb) * 100) : 0;
    const rataHb = sudahCekHb ? Math.round((hbSum / sudahCekHb) * 10) / 10 : null;

    // ----------------------------------------------------------
    // 3) Tren Hb 12 bulan terakhir (WIB) — dari SEMUA pemeriksaan
    //    (riwayat penuh). Data lama tanpa record ikut di bulan
    //    tanggal ceknya, jadi tidak ada yang dobel.
    // ----------------------------------------------------------
    const now = new Date();
    const bulanList: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bulanList.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("id-ID", { month: "short", timeZone: WIB }),
      });
    }
    const perMonth = new Map<string, { n: number; sum: number; anemia: number }>(
      bulanList.map((b) => [b.key, { n: 0, sum: 0, anemia: 0 }])
    );
    const pushMonth = (d: Date | null, hb: number) => {
      if (!d) return;
      const k = wibMonthKey(d);
      const cur = perMonth.get(k);
      if (!cur) return; // di luar jendela 12 bulan
      cur.n++;
      cur.sum += hb;
      if (hb < std.anemiaBelow) cur.anemia++;
    };
    for (const r of hbRecords) pushMonth(r.checkDate, r.hbValue);
    for (const l of legacyHb) pushMonth(l.date, l.hb);

    const trenHb = bulanList.map((b) => {
      const cur = perMonth.get(b.key)!;
      return {
        bulan: b.label,
        pemeriksaan: cur.n,
        rataHb: cur.n ? Math.round((cur.sum / cur.n) * 10) / 10 : null,
        anemiaPct: cur.n ? Math.round((cur.anemia / cur.n) * 100) : null,
      };
    });

    // ----------------------------------------------------------
    // 4) Sebaran per kecamatan (domisili; fallback kecamatan sekolah)
    // ----------------------------------------------------------
    const kecMap = new Map<string, { remaja: number; cekHb: number; anemia: number }>();
    for (const p of participants) {
      const kec = p.domisiliKecamatan || p.schoolDistrict || "Lainnya";
      let cur = kecMap.get(kec);
      if (!cur) kecMap.set(kec, (cur = { remaja: 0, cekHb: 0, anemia: 0 }));
      cur.remaja++;
      const e = latestHb.get(p.id);
      if (e) {
        cur.cekHb++;
        if (e.hb < std.anemiaBelow) cur.anemia++;
      }
    }
    const perKecamatan = Array.from(kecMap.entries())
      .map(([kecamatan, v]) => ({
        kecamatan,
        remaja: v.remaja,
        cekHb: v.cekHb,
        anemia: v.anemia,
        prevalensiPct: v.cekHb ? Math.round((v.anemia / v.cekHb) * 100) : null,
      }))
      .sort((a, b) => b.remaja - a.remaja || a.kecamatan.localeCompare(b.kecamatan, "id"));

    // ----------------------------------------------------------
    // 5) Sebaran per Puskesmas — remaja dipetakan lewat kelurahan
    //    domisili (MasterKelurahan -> PuskesmasWilayah).
    // ----------------------------------------------------------
    const kelToPuskesmas = new Map<string, string>(); // "kecamatan|kelurahan" -> nama puskesmas
    for (const pk of puskesmasList) {
      for (const w of pk.wilayah) {
        kelToPuskesmas.set(`${w.kelurahan.kecamatan.nama}|${w.kelurahan.nama}`, pk.nama);
      }
    }
    const puskesmasAgg = new Map<string, { remaja: number; cekHb: number; anemia: number }>();
    const LUAR = "Di luar wilayah Puskesmas";
    for (const p of participants) {
      const nama =
        (p.domisiliKecamatan && p.domisiliKelurahan && kelToPuskesmas.get(`${p.domisiliKecamatan}|${p.domisiliKelurahan}`)) || LUAR;
      let cur = puskesmasAgg.get(nama);
      if (!cur) puskesmasAgg.set(nama, (cur = { remaja: 0, cekHb: 0, anemia: 0 }));
      cur.remaja++;
      const e = latestHb.get(p.id);
      if (e) {
        cur.cekHb++;
        if (e.hb < std.anemiaBelow) cur.anemia++;
      }
    }
    // Puskesmas tanpa remaja tetap tampil (nilai 0) agar admin melihat cakupan penuh
    for (const pk of puskesmasList) {
      if (!puskesmasAgg.has(pk.nama)) puskesmasAgg.set(pk.nama, { remaja: 0, cekHb: 0, anemia: 0 });
    }
    const perPuskesmas = Array.from(puskesmasAgg.entries())
      .map(([puskesmas, v]) => ({
        puskesmas,
        remaja: v.remaja,
        cekHb: v.cekHb,
        anemia: v.anemia,
        prevalensiPct: v.cekHb ? Math.round((v.anemia / v.cekHb) * 100) : null,
      }))
      .sort((a, b) => b.remaja - a.remaja || a.puskesmas.localeCompare(b.puskesmas, "id"));

    // ----------------------------------------------------------
    // 6) Sebaran status gizi — dari PENGUKURAN TERAKHIR per remaja
    //    (status sudah dihitung sistem WHO 2007 saat pemeriksaan)
    // ----------------------------------------------------------
    const lastGizi = new Map<string, { imtUStatus: string; tbUStatus: string }>();
    for (const n of nutritions) {
      lastGizi.set(n.participantId, { imtUStatus: n.imtUStatus, tbUStatus: n.tbUStatus });
    }
    const imtUCount = new Map<string, number>();
    const tbUCount = new Map<string, number>();
    for (const g of lastGizi.values()) {
      imtUCount.set(g.imtUStatus, (imtUCount.get(g.imtUStatus) ?? 0) + 1);
      tbUCount.set(g.tbUStatus, (tbUCount.get(g.tbUStatus) ?? 0) + 1);
    }
    const toSeries = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([status, nilai]) => ({ status, nilai }))
        .sort((a, b) => b.nilai - a.nilai);
    const giziImtU = toSeries(imtUCount);
    const giziTbU = toSeries(tbUCount);

    // ----------------------------------------------------------
    // 7) Analisa otomatis (gaya sama dgn tab Ringkasan)
    // ----------------------------------------------------------
    const insights: { icon: string; text: string }[] = [];
    if (totalRemaja === 0) {
      insights.push({ icon: "🌱", text: "Belum ada remaja terdaftar, sehingga analitik kesehatan belum bisa dihitung." });
    } else {
      if (sudahCekHb === 0) {
        insights.push({
          icon: "🩸",
          text: `Belum ada remaja yang terdata Hb-nya. Minta petugas Puskesmas menginput hasil pemeriksaan, atau ajak remaja mengisi hasil cek Hb di Profil.`,
        });
      } else {
        // Kategori masalah kesehatan publik menurut WHO (prevalensi anemia):
        // <5% tidak signifikan · 5–19,9% ringan · 20–39,9% sedang · ≥40% berat
        const kategoriWHO =
          prevalensiPct >= 40 ? "BERAT" : prevalensiPct >= 20 ? "SEDANG" : prevalensiPct >= 5 ? "RINGAN" : "TIDAK SIGNIFIKAN";
        insights.push({
          icon: "🩸",
          text: `Prevalensi anemia (Hb terakhir) ${prevalensiPct}% — ${anemia} dari ${sudahCekHb} remaja terdata. Menurut ambang WHO, ini termasuk masalah kesehatan publik kategori ${kategoriWHO}. Rata-rata Hb ${rataHb} g/dL.`,
        });
        const kecAdaCek = perKecamatan.filter((k) => k.cekHb > 0);
        if (kecAdaCek.length > 1) {
          const tertinggi = [...kecAdaCek].sort((a, b) => (b.prevalensiPct ?? 0) - (a.prevalensiPct ?? 0))[0];
          insights.push({
            icon: "📍",
            text: `Wilayah dengan prevalensi anemia tertinggi: Kecamatan ${tertinggi.kecamatan} (${tertinggi.prevalensiPct}% — ${tertinggi.anemia} dari ${tertinggi.cekHb} remaja terdata). Prioritaskan intervensi di sana.`,
          });
        }
        // Tren: bandingkan rata-rata Hb 3 bulan terakhir vs 3 bulan sebelumnya
        const withVal = trenHb.filter((t) => t.rataHb !== null);
        if (withVal.length >= 2) {
          const last3 = withVal.slice(-3);
          const prev3 = withVal.slice(-6, -3);
          const avg = (arr: typeof withVal) => arr.reduce((s, t) => s + (t.rataHb ?? 0), 0) / arr.length;
          if (prev3.length > 0) {
            const a = avg(last3);
            const b = avg(prev3);
            const delta = Math.round((a - b) * 10) / 10;
            insights.push({
              icon: delta >= 0 ? "📈" : "📉",
              text:
                delta >= 0
                  ? `Rata-rata Hb 3 bulan terakhir ${a.toFixed(1)} g/dL, naik ${delta.toFixed(1)} dibanding 3 bulan sebelumnya (${b.toFixed(1)}). Pertahankan program TTD & edukasi gizi.`
                  : `Rata-rata Hb 3 bulan terakhir ${a.toFixed(1)} g/dL, turun ${Math.abs(delta).toFixed(1)} dari 3 bulan sebelumnya (${b.toFixed(1)}). Perlu penguatan intervensi.`,
            });
          }
        }
        if (belumCek > 0) {
          insights.push({
            icon: "🔍",
            text: `${belumCek} remaja (${Math.round((belumCek / totalRemaja) * 100)}%) belum punya data Hb sama sekali. Dorong skrining Hb agar peta anemia makin lengkap.`,
          });
        }
      }
      if (lastGizi.size > 0) {
        const kurus = (imtUCount.get("Sangat Kurus") ?? 0) + (imtUCount.get("Kurus") ?? 0);
        const lebih = (imtUCount.get("Gizi Lebih") ?? 0) + (imtUCount.get("Obesitas") ?? 0);
        const pendek = (tbUCount.get("Sangat Pendek") ?? 0) + (tbUCount.get("Pendek") ?? 0);
        insights.push({
          icon: "⚖️",
          text: `Status gizi terdata ${lastGizi.size} remaja: ${kurus} kurus, ${lebih} gizi lebih/obesitas, dan ${pendek} pendek (stunting). Beban ganda seperti ini perlu edukasi menu seimbang.`,
        });
      }
    }

    return NextResponse.json({
      standards: std,
      kartu: {
        totalRemaja,
        sudahCekHb,
        belumCek,
        anemia,
        prevalensiPct,
        rataHb,
        pemeriksaanTotal: hbRecords.length + legacyHb.length,
        giziTerdata: lastGizi.size,
      },
      grafik: {
        distribusiAnemia: [
          { nama: "Normal", nilai: klas.normal, warna: "#10b981" },
          { nama: "Anemia Ringan", nilai: klas.ringan, warna: "#f59e0b" },
          { nama: "Anemia Sedang", nilai: klas.sedang, warna: "#f97316" },
          { nama: "Anemia Berat", nilai: klas.berat, warna: "#e11d48" },
          { nama: "Belum Cek", nilai: belumCek, warna: "#9ca3af" },
        ],
        trenHb,
        perKecamatan,
        perPuskesmas,
        giziImtU,
        giziTbU,
      },
      insights,
    });
  } catch (e) {
    console.error("HEALTH_ANALYTICS_ERR", e);
    return NextResponse.json({ error: "Gagal memuat analitik kesehatan" }, { status: 500 });
  }
}
