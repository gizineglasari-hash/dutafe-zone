"use client";

// ============================================================
// PEMBARUAN 20 TAHAP 4 — Dashboard Analitik Kesehatan (ADMIN)
// ------------------------------------------------------------
// Menampilkan: prevalensi anemia (Hb terakhir per remaja),
// tren Hb & pemeriksaan 12 bulan (WIB), sebaran per kecamatan
// & per Puskesmas (domisili remaja), serta sebaran status gizi
// (IMT/U & TB/U dari pengukuran terakhir). Semua angka dihitung
// server dari data asli — komponen ini hanya menggambar.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, BarChart3, Building2, Droplets, FileSpreadsheet, FileText, FlaskConical, HeartPulse, Loader2, MapPin, RefreshCw, Scale, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface DistribusiItem { nama: string; nilai: number; warna: string }
interface TrenItem { bulan: string; pemeriksaan: number; rataHb: number | null; anemiaPct: number | null }
interface WilayahItem {
  kecamatan?: string; puskesmas?: string;
  remaja: number; cekHb: number; anemia: number; prevalensiPct: number | null;
}
interface GiziItem { status: string; nilai: number }

// Laporan Bulanan per Puskesmas (pembaruan 20 Tahap 5)
interface MonthlyPuskesmas {
  id: string; nama: string; isActive: boolean; kelurahanCount: number;
  remajaWilayah: number; pemeriksaan: number; anemia: number;
  prevalensiPct: number | null; rataHb: number | null; checkinTtd: number;
}
interface MonthlyData {
  bulan: string; bulanLabel: string;
  tersedia: { key: string; label: string }[];
  ringkasan: {
    puskesmasTotal: number; puskesmasAktif: number; puskesmasAdaAktivitas: number;
    remajaWilayah: number; pemeriksaan: number; anemia: number;
    prevalensiPct: number | null; rataHb: number | null; checkinTtd: number;
  };
  perPuskesmas: MonthlyPuskesmas[];
}

interface HealthData {
  standards: { anemiaBelow: number; beratBelow: number; sedangBelow: number };
  kartu: {
    totalRemaja: number; sudahCekHb: number; belumCek: number; anemia: number;
    prevalensiPct: number; rataHb: number | null; pemeriksaanTotal: number; giziTerdata: number;
  };
  grafik: {
    distribusiAnemia: DistribusiItem[];
    trenHb: TrenItem[];
    perKecamatan: WilayahItem[];
    perPuskesmas: WilayahItem[];
    giziImtU: GiziItem[];
    giziTbU: GiziItem[];
  };
  insights: { icon: string; text: string }[];
}

const COLORS_GIZI = ["#0d9488", "#e11d48", "#f59e0b", "#8b5cf6", "#0ea5e9", "#84cc16", "#f97316", "#64748b"];

function Kartu({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <p className="font-display text-2xl font-extrabold text-[#3d1526]">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#3d1526]/40">{sub}</p>}
    </motion.div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <p className="font-display text-sm font-extrabold text-[#3d1526]">{title}</p>
      {subtitle && <p className="mb-2 text-[11px] text-[#3d1526]/50">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "2px solid #3d152620", fontSize: 12 },
  labelStyle: { fontWeight: 700, color: "#3d1526" },
};

export default function HealthAnalytics() {
  const [data, setData] = useState<HealthData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [bulanKey, setBulanKey] = useState<string>("");
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health-analytics", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal memuat data");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(d);
    } catch (e) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Laporan Bulanan per Puskesmas (pembaruan 20 T5) ----------
  const loadMonthly = useCallback(async (bulan?: string) => {
    setMonthlyBusy(true);
    try {
      const res = await fetch(`/api/admin/health-analytics/monthly${bulan ? `?bulan=${encodeURIComponent(bulan)}` : ""}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMonthly(d);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBulanKey(d.bulan);
      }
    } catch {
      // diamkan — panel utama tetap tampil
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonthlyBusy(false);
    }
  }, []);

  useEffect(() => {
    loadMonthly();
  }, [loadMonthly]);

  async function auditExportLaporan(format: string) {
    try {
      await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditOnly: true, format, jumlah: monthly?.perPuskesmas.length ?? 0, cakupan: `laporan bulanan puskesmas (${monthly?.bulan ?? "-"})` }),
      });
    } catch {
      // audit tidak boleh memblokir
    }
  }

  async function exportLaporanExcel() {
    if (!monthly) return;
    setExportBusy("xlsx");
    try {
      const XLSX = await import("xlsx");
      const headers = ["No", "Puskesmas", "Kelurahan di Wilayah", "Remaja Wilayah", "Cek Hb (bulan ini)", "Anemia", "Prevalensi (%)", "Rata Hb (g/dL)", "Check-in TTD", "Status"];
      const rowsExport = monthly.perPuskesmas.map((r, i) => [
        i + 1,
        r.nama,
        r.kelurahanCount,
        r.remajaWilayah,
        r.pemeriksaan,
        r.pemeriksaan > 0 ? r.anemia : "-",
        r.prevalensiPct === null ? "-" : r.prevalensiPct,
        r.rataHb === null ? "-" : r.rataHb,
        r.checkinTtd,
        r.pemeriksaan > 0 ? "Ada aktivitas" : "Belum ada pemeriksaan",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        [`FE-ZONE — Laporan Bulanan Puskesmas — ${monthly.bulanLabel}`],
        [`Dibuat: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Sumber: data asli aplikasi FE-ZONE`],
        [],
        headers,
        ...rowsExport,
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Bulanan");
      XLSX.writeFile(wb, `FE-ZONE-Laporan-Bulanan-Puskesmas-${monthly.bulan}.xlsx`);
      await auditExportLaporan("xlsx");
    } catch {
      // diamkan
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExportBusy(null);
    }
  }

  async function exportLaporanPdf() {
    if (!monthly) return;
    setExportBusy("pdf");
    try {
      const { default: JsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(`FE-ZONE — Laporan Bulanan Puskesmas — ${monthly.bulanLabel}`, 40, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Dibuat: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Total ${monthly.perPuskesmas.length} baris (termasuk remaja di luar wilayah Puskesmas)`, 40, 52);
      autoTable(doc, {
        startY: 64,
        head: [["No", "Puskesmas", "Kelurahan", "Remaja Wilayah", "Cek Hb", "Anemia", "Prevalensi", "Rata Hb", "TTD", "Status"]],
        body: monthly.perPuskesmas.map((r, i) => [
          i + 1,
          r.nama,
          r.kelurahanCount,
          r.remajaWilayah,
          r.pemeriksaan,
          r.pemeriksaan > 0 ? r.anemia : "-",
          r.prevalensiPct === null ? "-" : `${r.prevalensiPct}%`,
          r.rataHb === null ? "-" : `${r.rataHb}`,
          r.checkinTtd,
          r.pemeriksaan > 0 ? "Ada aktivitas" : "Belum ada pemeriksaan",
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [61, 21, 38] },
        alternateRowStyles: { fillColor: [250, 240, 232] },
      });
      doc.save(`FE-ZONE-Laporan-Bulanan-Puskesmas-${monthly.bulan}.pdf`);
      await auditExportLaporan("pdf");
    } catch {
      // diamkan
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExportBusy(null);
    }
  }

  if (busy && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-[#3d1526]/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat analitik kesehatan…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-display font-extrabold text-rose-700">Gagal memuat analitik</p>
        <p className="mb-3 text-sm text-rose-600">{error}</p>
        <button onClick={load} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { kartu, grafik, insights, standards } = data;
  const adaAnemia = grafik.distribusiAnemia.some((d) => d.nilai > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-[#3d1526]">
            <HeartPulse className="h-6 w-6 text-rose-600" /> Analitik Kesehatan
          </h1>
          <p className="text-xs text-[#3d1526]/50">
            Prevalensi anemia, tren Hb, sebaran wilayah & status gizi — dihitung dari data asli remaja.
            Ambang anemia: Hb &lt; {standards.anemiaBelow} g/dL (Kemenkes/WHO).
          </p>
        </div>
        <button onClick={load} disabled={busy}
          className="flex items-center gap-1.5 rounded-xl border border-[#3d1526]/15 bg-white px-3 py-2 text-xs font-bold text-[#3d1526] hover:bg-rose-50 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Segarkan
        </button>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kartu icon={<Users className="h-5 w-5" />} label="Total Remaja" value={kartu.totalRemaja} color="bg-rose-100 text-rose-600" />
        <Kartu icon={<Droplets className="h-5 w-5" />} label="Sudah Cek Hb" value={kartu.sudahCekHb} color="bg-cyan-100 text-cyan-600" sub={`${kartu.belumCek} belum cek`} />
        <Kartu icon={<HeartPulse className="h-5 w-5" />} label="Prevalensi Anemia" value={`${kartu.prevalensiPct}%`} color="bg-amber-100 text-amber-600" sub={`${kartu.anemia} remaja anemia`} />
        <Kartu icon={<Activity className="h-5 w-5" />} label="Rata-rata Hb" value={kartu.rataHb !== null ? `${kartu.rataHb}` : "—"} color="bg-emerald-100 text-emerald-600" sub="g/dL (Hb terakhir)" />
        <Kartu icon={<FlaskConical className="h-5 w-5" />} label="Total Pemeriksaan" value={kartu.pemeriksaanTotal} color="bg-violet-100 text-violet-600" sub="riwayat Hb tersimpan" />
        <Kartu icon={<Scale className="h-5 w-5" />} label="Gizi Terdata" value={kartu.giziTerdata} color="bg-teal-100 text-teal-600" sub="pengukuran terakhir" />
      </div>

      {/* Analisa otomatis */}
      {insights.length > 0 && (
        <div className="rounded-3xl border-2 border-rose-300/60 bg-gradient-to-br from-rose-50 to-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-300 text-lg">🧠</span>
            <div>
              <p className="font-display text-lg font-extrabold text-[#3d1526]">Analisa Otomatis Kesehatan</p>
              <p className="text-xs text-[#3d1526]/50">Ringkasan temuan dari data terkini — bantu putuskan langkah intervensi</p>
            </div>
          </div>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 rounded-2xl bg-white/80 px-4 py-3">
                <span className="text-lg leading-6">{ins.icon}</span>
                <p className="text-sm text-[#3d1526]/85">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grafik 1+2: distribusi anemia + tren */}
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard title="Distribusi Status Anemia" subtitle="Berdasarkan Hb TERAKHIR tiap remaja (Kemenkes/WHO)">
          {adaAnemia ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={grafik.distribusiAnemia.filter((d) => d.nilai > 0)} dataKey="nilai" nameKey="nama"
                    innerRadius={55} outerRadius={95} paddingAngle={2} strokeWidth={2}>
                    {grafik.distribusiAnemia.filter((d) => d.nilai > 0).map((d) => (
                      <Cell key={d.nama} fill={d.warna} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [`${v} remaja`, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-center text-sm text-[#3d1526]/40">
              Belum ada data Hb.<br />Hasil input petugas / Profil remaja akan muncul di sini.
            </div>
          )}
        </ChartCard>

        <div className="lg:col-span-3">
          <ChartCard title="Tren Hb 12 Bulan Terakhir (WIB)" subtitle="Batang = jumlah pemeriksaan · Garis rose = rata-rata Hb bulan itu (g/dL)">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={grafik.trenHb} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <YAxis yAxisId="kiri" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <YAxis yAxisId="kanan" orientation="right" domain={[6, 16]} tick={{ fontSize: 11 }} stroke="#e11d4880" />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="kiri" dataKey="pemeriksaan" name="Jumlah pemeriksaan" fill="#a5b4fc" radius={[6, 6, 0, 0]} barSize={18} />
                  <Line yAxisId="kanan" type="monotone" dataKey="rataHb" name="Rata-rata Hb (g/dL)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Grafik 3+4: sebaran wilayah */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sebaran per Kecamatan Domisili" subtitle="Remaja terdaftar per kecamatan (fallback: kecamatan sekolah)">
          {grafik.perKecamatan.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafik.perKecamatan.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <YAxis type="category" dataKey="kecamatan" width={130} tick={{ fontSize: 10 }} stroke="#3d152660" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="remaja" name="Jumlah remaja" fill="#e11d48" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#3d1526]/40">Belum ada data wilayah.</div>
          )}
        </ChartCard>

        <ChartCard title="Sebaran per Wilayah Kerja Puskesmas" subtitle="Remaja dipetakan dari kelurahan domisili (data induk Pembaruan 19)">
          {grafik.perPuskesmas.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafik.perPuskesmas.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <YAxis type="category" dataKey="puskesmas" width={170} tick={{ fontSize: 10 }} stroke="#3d152660" />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="remaja" name="Remaja" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={10} />
                  <Bar dataKey="anemia" name="Anemia" fill="#e11d48" radius={[0, 6, 6, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-[#3d1526]/40">Belum ada data Puskesmas.</div>
          )}
        </ChartCard>
      </div>

      {/* Tabel kecamatan */}
      <ChartCard title="Rincian per Kecamatan" subtitle="Prevalensi anemia dihitung dari remaja yang sudah terdata Hb-nya di kecamatan itu">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#3d1526]/10 text-[10px] uppercase tracking-wide text-[#3d1526]/50">
                <th className="py-2 pr-3">Kecamatan</th>
                <th className="py-2 pr-3 text-center">Remaja</th>
                <th className="py-2 pr-3 text-center">Cek Hb</th>
                <th className="py-2 pr-3 text-center">Anemia</th>
                <th className="py-2 pr-3 text-center">Prevalensi</th>
                <th className="py-2">Proporsi</th>
              </tr>
            </thead>
            <tbody>
              {grafik.perKecamatan.map((k) => (
                <tr key={k.kecamatan} className="border-b border-[#3d1526]/5">
                  <td className="py-2 pr-3 font-bold text-[#3d1526]">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-rose-400" /> {k.kecamatan}</span>
                  </td>
                  <td className="py-2 pr-3 text-center">{k.remaja}</td>
                  <td className="py-2 pr-3 text-center">{k.cekHb}</td>
                  <td className="py-2 pr-3 text-center">{k.cekHb > 0 ? k.anemia : "—"}</td>
                  <td className="py-2 pr-3 text-center font-extrabold">
                    {k.prevalensiPct !== null ? `${k.prevalensiPct}%` : <span className="text-[#3d1526]/30">belum ada data Hb</span>}
                  </td>
                  <td className="w-[160px] py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#3d1526]/8">
                      <div className="h-full rounded-full bg-rose-500"
                        style={{ width: `${k.prevalensiPct ?? 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Grafik 5+6: status gizi */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sebaran Status Gizi — IMT/U" subtitle="Dari pengukuran TERAKHIR tiap remaja (WHO Growth Reference 2007)">
          {grafik.giziImtU.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafik.giziImtU} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="#3d152660" interval={0} angle={-12} dy={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} remaja`, "Jumlah"]} />
                  <Bar dataKey="nilai" radius={[6, 6, 0, 0]} barSize={34}>
                    {grafik.giziImtU.map((_, i) => (
                      <Cell key={i} fill={COLORS_GIZI[i % COLORS_GIZI.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-[#3d1526]/40">
              Belum ada pemeriksaan status gizi.
            </div>
          )}
        </ChartCard>

        <ChartCard title="Sebaran Status Gizi — TB/U" subtitle="Dari pengukuran TERAKHIR tiap remaja (WHO Growth Reference 2007)">
          {grafik.giziTbU.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafik.giziTbU} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="#3d152660" interval={0} angle={-12} dy={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#3d152660" />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} remaja`, "Jumlah"]} />
                  <Bar dataKey="nilai" radius={[6, 6, 0, 0]} barSize={34}>
                    {grafik.giziTbU.map((_, i) => (
                      <Cell key={i} fill={COLORS_GIZI[(i + 3) % COLORS_GIZI.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-[#3d1526]/40">
              Belum ada pemeriksaan status gizi.
            </div>
          )}
        </ChartCard>
      </div>

      {/* ===== Laporan Bulanan per Puskesmas (pembaruan 20 Tahap 5) ===== */}
      <ChartCard
        title="Laporan Bulanan per Puskesmas"
        subtitle="Aktivitas pemeriksaan Hb & check-in TTD per wilayah kerja Puskesmas pada satu bulan (WIB) — bisa diunduh"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Building2 className="h-4 w-4 text-rose-500" />
          <select
            value={bulanKey}
            onChange={(e) => loadMonthly(e.target.value)}
            disabled={monthlyBusy || !monthly}
            className="rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 py-1.5 text-xs font-extrabold text-[#3d1526] focus:outline-none"
          >
            {(monthly?.tersedia ?? []).map((b) => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </select>
          {monthlyBusy && <Loader2 className="h-4 w-4 animate-spin text-[#3d1526]/50" />}
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportLaporanExcel}
              disabled={!monthly || exportBusy !== null}
              className="flex items-center gap-1 rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 py-1.5 text-xs font-extrabold text-[#3d1526] hover:bg-emerald-50 disabled:opacity-50"
            >
              {exportBusy === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Excel
            </button>
            <button
              onClick={exportLaporanPdf}
              disabled={!monthly || exportBusy !== null}
              className="flex items-center gap-1 rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 py-1.5 text-xs font-extrabold text-[#3d1526] hover:bg-rose-50 disabled:opacity-50"
            >
              {exportBusy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
            </button>
          </div>
        </div>

        {monthly ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              <div className="rounded-xl bg-[#faf0e8] p-2 text-center">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Puskesmas Aktif</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{monthly.ringkasan.puskesmasAktif}</p>
                <p className="text-[10px] text-[#3d1526]/40">{monthly.ringkasan.puskesmasAdaAktivitas} ada pemeriksaan</p>
              </div>
              <div className="rounded-xl bg-[#faf0e8] p-2 text-center">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Remaja Wilayah</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{monthly.ringkasan.remajaWilayah}</p>
              </div>
              <div className="rounded-xl bg-[#faf0e8] p-2 text-center">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Cek Hb Bulan Ini</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{monthly.ringkasan.pemeriksaan}</p>
              </div>
              <div className="rounded-xl bg-[#faf0e8] p-2 text-center">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Anemia Ditemukan</p>
                <p className="font-display text-lg font-extrabold text-rose-600">{monthly.ringkasan.anemia}</p>
                <p className="text-[10px] text-[#3d1526]/40">{monthly.ringkasan.prevalensiPct === null ? "belum ada data" : `${monthly.ringkasan.prevalensiPct}% dari pemeriksaan`}</p>
              </div>
              <div className="rounded-xl bg-[#faf0e8] p-2 text-center">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Check-in TTD</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{monthly.ringkasan.checkinTtd}</p>
              </div>
            </div>

            <div className="thin-scroll max-h-[420px] overflow-auto rounded-2xl border border-[#3d1526]/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_#3d15261a]">
                  <tr className="text-[10px] uppercase tracking-wide text-[#3d1526]/50">
                    <th className="px-3 py-2">Puskesmas</th>
                    <th className="px-3 py-2 text-center">Kelurahan</th>
                    <th className="px-3 py-2 text-center">Remaja Wilayah</th>
                    <th className="px-3 py-2 text-center">Cek Hb</th>
                    <th className="px-3 py-2 text-center">Anemia</th>
                    <th className="px-3 py-2 text-center">Prevalensi</th>
                    <th className="px-3 py-2 text-center">Rata Hb</th>
                    <th className="px-3 py-2 text-center">TTD</th>
                    <th className="px-3 py-2">Cakupan</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.perPuskesmas.map((r) => (
                    <tr key={r.id} className={`border-t border-[#3d1526]/5 ${r.id === "LUAR" ? "bg-[#faf5f0]/60" : ""}`}>
                      <td className="px-3 py-2 font-bold text-[#3d1526]">
                        {r.nama}
                        {!r.isActive && <span className="ml-1 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-extrabold text-neutral-500">nonaktif</span>}
                      </td>
                      <td className="px-3 py-2 text-center">{r.kelurahanCount || "—"}</td>
                      <td className="px-3 py-2 text-center">{r.remajaWilayah}</td>
                      <td className="px-3 py-2 text-center font-extrabold text-[#3d1526]">{r.pemeriksaan}</td>
                      <td className="px-3 py-2 text-center font-extrabold text-rose-600">{r.pemeriksaan > 0 ? r.anemia : "—"}</td>
                      <td className="px-3 py-2 text-center">{r.prevalensiPct === null ? "—" : `${r.prevalensiPct}%`}</td>
                      <td className="px-3 py-2 text-center">{r.rataHb === null ? "—" : `${r.rataHb} g/dL`}</td>
                      <td className="px-3 py-2 text-center">{r.checkinTtd}</td>
                      <td className="px-3 py-2">
                        {r.pemeriksaan > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">ada aktivitas</span>
                        ) : (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold text-neutral-500">belum ada pemeriksaan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-[#3d1526]/40">
              Remaja dipetakan ke Puskesmas lewat kelurahan domisili (data induk Pembaruan 19); baris terakhir menghitung remaja yang domisilinya belum terpetakan.
            </p>
          </>
        ) : (
          <div className="flex h-24 items-center justify-center text-sm text-[#3d1526]/40">
            {monthlyBusy ? "Memuat laporan…" : "Laporan belum tersedia."}
          </div>
        )}
      </ChartCard>

      <p className="flex items-center gap-1.5 text-[11px] text-[#3d1526]/40">
        <BarChart3 className="h-3.5 w-3.5" />
        Prevalensi & rata-rata dihitung server dari data asli; angka memperbarui otomatis setiap kali data Hb/gizi berubah (tekan Segarkan).
      </p>
    </div>
  );
}
