"use client";

// ============================================================
// 📊 DATA STATUS GIZI PESERTA (pembaruan 17) — tab admin
// 4 kartu statistik · tabel hasil cek gizi (data NYATA dari DB)
// · filter periode/jenis kelamin/status · pencarian · urutan
// · modal detail + grafik riwayat BB/TB/IMT per orang
// · ekspor Excel & PDF
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Eye, FileDown, FileSpreadsheet, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface GiziRow {
  id: string;
  namaPeserta: string;
  email: string;
  school: string;
  educationLevel: string;
  jenisKelamin: string;
  tanggalLahir: string;
  tanggalPemeriksaan: string;
  usiaLabel: string;
  beratBadanKg: number;
  tinggiBadanCm: number;
  imt: number;
  tbUZscore: number;
  tbUPercentile: number;
  tbUStatus: string;
  imtUZscore: number;
  imtUPercentile: number;
  imtUStatus: string;
  bbMedianWho: number | null;
  bbMinWho: number | null;
  bbMaxWho: number | null;
  whoReference: string | null;
  interpretation: string;
  recommendation: string;
  referenceStandard: string;
  createdAt: string;
}

interface DetailData {
  record: GiziRow & { referenceVersion: string; usiaDalamHari: number };
  history: { id: string; tanggalPemeriksaan: string; usiaLabel: string; beratBadanKg: number; tinggiBadanCm: number; imt: number; tbUStatus: string; imtUStatus: string; bbMedianWho: number | null; bbMinWho: number | null; bbMaxWho: number | null }[];
}

// format angka gaya Indonesia: 50,0
const fmt1 = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const TB_STATUSES = ["Normal", "Pendek", "Sangat Pendek"];
const IMT_STATUSES = ["Sangat Kurus", "Kurus", "Normal", "Gizi Lebih", "Obesitas"];

function statusChip(s: string) {
  const color =
    s === "Normal" ? "bg-emerald-100 text-emerald-700"
    : s === "Pendek" || s === "Gizi Lebih" ? "bg-amber-100 text-amber-700"
    : s === "Kurus" ? "bg-orange-100 text-orange-700"
    : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${color}`}>{s}</span>;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <p className="font-display text-2xl font-extrabold text-[#3d1526]">{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">{label}</p>
    </div>
  );
}

function Chart({ title, unit, color, data }: { title: string; unit: string; color: string; data: Record<string, number | string>[] }) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-3">
      <p className="mb-1 font-display text-xs font-extrabold text-[#3d1526]">{title} <span className="text-[#3d1526]/40">({unit})</span></p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3d152614" />
            <XAxis dataKey="tgl" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #3d152622" }} />
            <Line type="monotone" dataKey="y" name={unit} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminGiziTab() {
  const [rows, setRows] = useState<GiziRow[]>([]);
  const [stats, setStats] = useState({ totalPemeriksaan: 0, totalOrang: 0, hariIni: 0, bulanIni: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [gender, setGender] = useState("");
  const [tbStatus, setTbStatus] = useState("");
  const [imtStatus, setImtStatus] = useState("");
  const [school, setSchool] = useState("");
  const [schools, setSchools] = useState<string[]>([]);
  const [usiaMin, setUsiaMin] = useState("");
  const [usiaMax, setUsiaMax] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("terbaru");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ period, gender, tbStatus, imtStatus, school, sort });
      if (usiaMin.trim()) p.set("usiaMin", usiaMin.trim());
      if (usiaMax.trim()) p.set("usiaMax", usiaMax.trim());
      if (q.trim()) p.set("q", q.trim());
      if (period === "custom") { p.set("from", from); p.set("to", to); }
      const res = await fetch(`/api/admin/nutrition?${p.toString()}`);
      const d = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal memuat", description: d.error, variant: "destructive" });
        return;
      }
      setStats(d.stats);
      setRows(d.rows);
      if (Array.isArray(d.schools)) setSchools(d.schools);
      setPage(1);
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [period, gender, tbStatus, imtStatus, school, sort, q, usiaMin, usiaMax, from, to]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/nutrition/${id}`);
      const d = await res.json();
      if (!res.ok) { toast({ title: "Gagal memuat detail", variant: "destructive" }); return; }
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  // ---------- EKSPOR ----------
  const EXPORT_HEADERS = [
    "Tanggal Pemeriksaan", "Nama", "Email", "Sekolah", "Jenjang", "JK", "Tanggal Lahir", "Usia",
    "Berat (kg)", "Tinggi (cm)", "IMT", "TB/U z", "TB/U %", "TB/U Status", "IMT/U z", "IMT/U %", "IMT/U Status",
    "Perkiraan BB median (kg)", "BB min -2SD (kg)", "BB maks +1SD (kg)", "Referensi",
  ];
  const toExportRows = (list: GiziRow[]) =>
    list.map((r) => [
      r.tanggalPemeriksaan, r.namaPeserta, r.email, r.school, r.educationLevel, r.jenisKelamin === "L" ? "L" : "P",
      r.tanggalLahir, r.usiaLabel, r.beratBadanKg, r.tinggiBadanCm, r.imt,
      r.tbUZscore, r.tbUPercentile, r.tbUStatus, r.imtUZscore, r.imtUPercentile, r.imtUStatus,
      r.bbMedianWho ?? "-", r.bbMinWho ?? "-", r.bbMaxWho ?? "-", r.whoReference ?? "-",
    ]);

  async function exportExcel() {
    if (!rows.length) { toast({ title: "Tidak ada data untuk diekspor" }); return; }
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...toExportRows(rows)]);
      ws["!cols"] = EXPORT_HEADERS.map(() => ({ wch: 14 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Status Gizi");
      XLSX.writeFile(wb, `FE-ZONE-Status-Gizi-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "📤 Excel berhasil diunduh", description: `${rows.length} baris data status gizi.` });
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    if (!rows.length) { toast({ title: "Tidak ada data untuk diekspor" }); return; }
    setExporting("pdf");
    try {
      const { default: JsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new JsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("FE-ZONE — Data Status Gizi Peserta (WHO Growth Reference 2007)", 14, 15);
      doc.setFontSize(9);
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")} · ${rows.length} baris`, 14, 21);
      autoTable(doc, {
        startY: 25,
        head: [EXPORT_HEADERS],
        body: toExportRows(rows).map((r) => r.map((v) => String(v))),
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        headStyles: { fillColor: [61, 21, 38] },
      });
      doc.save(`FE-ZONE-Status-Gizi-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "📄 PDF berhasil diunduh" });
    } finally {
      setExporting(null);
    }
  }

  const historyData = (key: "beratBadanKg" | "tinggiBadanCm" | "imt") =>
    (detail?.history ?? []).map((h) => ({ tgl: h.tanggalPemeriksaan, y: h[key] }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">📊 Data Status Gizi Peserta</h1>
          <p className="text-xs font-semibold text-[#3d1526]/50">
            Hasil pemeriksaan peserta · WHO Growth Reference 2007 (usia 5–19 tahun) · data nyata dari database
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" className="h-10 rounded-xl border-2 border-[#3d1526]/20 font-bold text-[#3d1526] hover:bg-rose-50">
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
          <Button onClick={exportExcel} disabled={exporting !== null} className="h-10 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
            {exporting === "excel" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          </Button>
          <Button onClick={exportPdf} disabled={exporting !== null} className="h-10 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700">
            {exporting === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ---------- 4 KARTU STATISTIK ---------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total Pemeriksaan" value={stats.totalPemeriksaan} color="bg-rose-100 text-rose-600" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Peserta Sudah Diperiksa" value={stats.totalOrang} color="bg-teal-100 text-teal-600" />
        <StatCard icon={<CalendarCheckIcon />} label="Pemeriksaan Hari Ini" value={stats.hariIni} color="bg-amber-100 text-amber-600" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Bulan Ini" value={stats.bulanIni} color="bg-violet-100 text-violet-600" />
      </div>

      {/* ---------- FILTER ---------- */}
      <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Periode</Label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="all">Semua</option>
              <option value="today">Hari ini</option>
              <option value="7d">7 hari terakhir</option>
              <option value="30d">30 hari terakhir</option>
              <option value="month">Bulan ini</option>
              <option value="custom">Kustom</option>
            </select>
          </div>
          {period === "custom" && (
            <>
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Dari</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-10 rounded-xl border-2 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Sampai</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-10 rounded-xl border-2 text-xs" />
              </div>
            </>
          )}
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Jenis kelamin</Label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="">Semua</option>
              <option value="P">Perempuan</option>
              <option value="L">Laki-laki</option>
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Status TB/U</Label>
            <select value={tbStatus} onChange={(e) => setTbStatus(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="">Semua</option>
              {TB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Status IMT/U</Label>
            <select value={imtStatus} onChange={(e) => setImtStatus(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="">Semua</option>
              {IMT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Sekolah</Label>
            <select value={school} onChange={(e) => setSchool(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="">Semua sekolah</option>
              {schools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Usia min (th)</Label>
            <Input type="number" min={5} max={19} value={usiaMin} onChange={(e) => setUsiaMin(e.target.value)} placeholder="cth. 12" className="mt-1 h-10 rounded-xl border-2 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Usia maks (th)</Label>
            <Input type="number" min={5} max={19} value={usiaMax} onChange={(e) => setUsiaMax(e.target.value)} placeholder="cth. 16" className="mt-1 h-10 rounded-xl border-2 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Urutkan</Label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1 h-10 w-full rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 text-xs font-bold text-[#3d1526]">
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="nama_az">Nama A→Z</option>
              <option value="nama_za">Nama Z→A</option>
              <option value="bb_desc">BB tertinggi</option>
              <option value="tb_desc">TB tertinggi</option>
              <option value="imt_desc">IMT tertinggi</option>
            </select>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d1526]/30" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, atau sekolah…" className="h-10 rounded-xl border-2 pl-9 text-sm" />
        </div>
      </div>

      {/* ---------- TABEL ---------- */}
      <div className="overflow-x-auto rounded-2xl border border-[#3d1526]/10 bg-white">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-[#3d1526]/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data status gizi…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-[#3d1526]/40">
            Belum ada data pemeriksaan yang cocok dengan filter.
          </p>
        ) : (
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#3d1526]/10 bg-[#faf5f0] text-[10px] font-extrabold uppercase text-[#3d1526]/50">
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Peserta</th>
                <th className="px-3 py-2.5">Sekolah</th>
                <th className="px-3 py-2.5">JK</th>
                <th className="px-3 py-2.5">Usia</th>
                <th className="px-3 py-2.5 text-right">BB</th>
                <th className="px-3 py-2.5 text-right">TB</th>
                <th className="px-3 py-2.5 text-right">IMT</th>
                <th className="px-3 py-2.5">TB/U</th>
                <th className="px-3 py-2.5">IMT/U</th>
                <th className="px-3 py-2.5 text-right">Perkiraan BB median</th>
                <th className="px-3 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-[#3d1526]/5 hover:bg-rose-50/40">
                  <td className="px-3 py-2.5 font-bold text-[#3d1526]">{r.tanggalPemeriksaan}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-extrabold text-[#3d1526]">{r.namaPeserta}</p>
                    <p className="text-[10px] font-semibold text-[#3d1526]/40">{r.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#3d1526]/70">{r.school} <span className="text-[#3d1526]/35">· {r.educationLevel}</span></td>
                  <td className="px-3 py-2.5 font-bold text-[#3d1526]/70">{r.jenisKelamin === "L" ? "L" : "P"}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#3d1526]/70">{r.usiaLabel}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-[#3d1526]">{r.beratBadanKg.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-[#3d1526]">{r.tinggiBadanCm.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-[#3d1526]">{r.imt.toFixed(2)}</td>
                  <td className="px-3 py-2.5">{statusChip(r.tbUStatus)}</td>
                  <td className="px-3 py-2.5">{statusChip(r.imtUStatus)}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold text-[#3d1526]">
                    {r.bbMedianWho != null ? `${fmt1(r.bbMedianWho)} kg` : <span className="text-[#3d1526]/30">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => openDetail(r.id)} className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 px-2 py-1 text-[10px] font-extrabold text-[#3d1526] hover:border-[#3d1526]/40" disabled={detailLoading}>
                      <Eye className="h-3 w-3" /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-[#3d1526]/10 px-3 py-2.5">
            <p className="text-[11px] font-bold text-[#3d1526]/50">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} dari {rows.length} baris
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border-2 border-[#3d1526]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#3d1526] disabled:opacity-30">← Sebelumnya</button>
              <span className="px-2 text-[11px] font-extrabold text-[#3d1526]/60">Hal. {page}/{pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="rounded-lg border-2 border-[#3d1526]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#3d1526] disabled:opacity-30">Berikutnya →</button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- MODAL DETAIL ---------- */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3d1526]/60 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="my-6 w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#3d1526]">💗 {detail.record.namaPeserta}</h2>
                <p className="text-xs font-bold text-[#3d1526]/50">
                  {detail.record.school} · {detail.record.educationLevel} · {detail.record.email}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-full bg-[#3d1526]/5 px-3 py-1.5 text-xs font-extrabold text-[#3d1526]">✕ Tutup</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-[#faf5f0] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/40">Pemeriksaan</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{detail.record.tanggalPemeriksaan}</p>
                <p className="text-[11px] font-bold text-[#3d1526]/50">Usia: {detail.record.usiaLabel}</p>
              </div>
              <div className="rounded-2xl bg-[#faf5f0] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/40">BB / TB</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{detail.record.beratBadanKg.toFixed(1)} kg · {detail.record.tinggiBadanCm.toFixed(1)} cm</p>
                <p className="text-[11px] font-bold text-[#3d1526]/50">IMT {detail.record.imt.toFixed(2)} kg/m²</p>
              </div>
              <div className="rounded-2xl bg-[#faf5f0] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/40">TB/U</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{detail.record.tbUStatus}</p>
                <p className="text-[11px] font-bold text-[#3d1526]/50">z {detail.record.tbUZscore >= 0 ? "+" : ""}{detail.record.tbUZscore.toFixed(2)} · {detail.record.tbUPercentile.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl bg-[#faf5f0] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/40">IMT/U</p>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">{detail.record.imtUStatus}</p>
                <p className="text-[11px] font-bold text-[#3d1526]/50">z {detail.record.imtUZscore >= 0 ? "+" : ""}{detail.record.imtUZscore.toFixed(2)} · {detail.record.imtUPercentile.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/40">Perkiraan BB sesuai TB (WHO)</p>
                {detail.record.bbMedianWho != null ? (
                  <>
                    <p className="font-display text-lg font-extrabold text-[#3d1526]">Median: {fmt1(detail.record.bbMedianWho)} kg</p>
                    <p className="text-[11px] font-bold text-[#3d1526]/50">
                      Rentang: {fmt1(detail.record.bbMinWho ?? 0)} – {fmt1(detail.record.bbMaxWho ?? 0)} kg
                      <span className="text-[#3d1526]/40"> (−2 SD s.d. +1 SD)</span>
                    </p>
                  </>
                ) : (
                  <p className="font-display text-sm font-extrabold text-[#3d1526]/50">— (data lama, sebelum fitur)</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Chart title="Berat Badan" unit="kg" color="#e11d48" data={historyData("beratBadanKg")} />
              <Chart title="Tinggi Badan" unit="cm" color="#0d9488" data={historyData("tinggiBadanCm")} />
              <Chart title="IMT" unit="kg/m²" color="#8b5cf6" data={historyData("imt")} />
            </div>

            <div className="mt-4 rounded-2xl border border-[#3d1526]/10 bg-[#faf5f0] p-4">
              <p className="mb-1 text-[10px] font-extrabold uppercase text-[#3d1526]/40">Interpretasi untuk peserta</p>
              <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-[#3d1526]/80">{detail.record.interpretation}</p>
              <p className="mb-1 mt-3 text-[10px] font-extrabold uppercase text-[#3d1526]/40">Rekomendasi</p>
              <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-[#3d1526]/80">{detail.record.recommendation}</p>
              <p className="mt-3 text-[10px] font-bold text-[#3d1526]/40">
                Referensi: {detail.record.referenceStandard} — {detail.record.referenceVersion}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#3d1526]/10">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#3d1526]/10 bg-[#faf5f0] text-[10px] font-extrabold uppercase text-[#3d1526]/50">
                    <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Usia</th>
                    <th className="px-3 py-2 text-right">BB (kg)</th><th className="px-3 py-2 text-right">TB (cm)</th>
                    <th className="px-3 py-2 text-right">IMT</th><th className="px-3 py-2">TB/U</th><th className="px-3 py-2">IMT/U</th>
                    <th className="px-3 py-2 text-right">BB median</th><th className="px-3 py-2 text-right">Rentang BB</th>
                  </tr>
                </thead>
                <tbody>
                  {[...detail.history].reverse().map((h) => (
                    <tr key={h.id} className="border-b border-[#3d1526]/5 font-bold text-[#3d1526]/80">
                      <td className="px-3 py-2">{h.tanggalPemeriksaan}</td>
                      <td className="px-3 py-2">{h.usiaLabel}</td>
                      <td className="px-3 py-2 text-right">{h.beratBadanKg.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{h.tinggiBadanCm.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{h.imt.toFixed(2)}</td>
                      <td className="px-3 py-2">{h.tbUStatus}</td>
                      <td className="px-3 py-2">{h.imtUStatus}</td>
                      <td className="px-3 py-2 text-right">{h.bbMedianWho != null ? `${fmt1(h.bbMedianWho)}` : "—"}</td>
                      <td className="px-3 py-2 text-right">{h.bbMinWho != null && h.bbMaxWho != null ? `${fmt1(h.bbMinWho)}–${fmt1(h.bbMaxWho)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ikon hari-ini (lucide CalendarCheck tidak diimport terpisah agar rapi)
function CalendarCheckIcon() { return <span className="text-base">📅</span>; }
