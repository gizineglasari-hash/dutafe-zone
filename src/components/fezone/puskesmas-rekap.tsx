"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileDown, FileSpreadsheet, FileText, Loader2, Search, X } from "lucide-react";

// ------------------------------------------------------------
// Tab REKAP & EXPORT dasbor petugas (pembaruan 19 Tahap 5).
// Rekap seluruh remaja wilayah (kecamatan sekolah ATAU kelurahan
// domisili terpetakan) + unduh Excel / CSV / PDF.
// File dirakit di browser (SheetJS & jsPDF — dependensi bawaan).
// Kolom export TIDAK memuat NIK & telepon (privasi — hanya Admin).
// ------------------------------------------------------------

interface RekapRow {
  id: string;
  name: string;
  username: string;
  age: number;
  educationLevel: string;
  school: string;
  schoolDistrict: string | null;
  domisiliKecamatan: string | null;
  domisiliKelurahan: string | null;
  hbValue: number | null;
  hbCheckDate: string | null;
  hbKategori: string | null;
  hbPemeriksa: string | null;
  hbMetode: string | null;
  ttdCount: number;
  missionsCompleted: number;
  level: number;
  levelName: string;
  xp: number;
  isDuta: boolean;
  isDutaCandidate: boolean;
  joinedAt: string;
}

interface RekapData {
  rows: RekapRow[];
  ringkasan: { total: number; cekHb: number; anemia: number; normal: number; ttdSudah: number; lulusMisi: number };
  wilayah: { kecamatan: string[]; puskesmas: string };
  opsiSekolah: string[];
  dibatasi: boolean;
}

const JENJANG_OPSI = [
  { v: "", label: "Semua Jenjang" },
  { v: "SMP", label: "SMP" },
  { v: "SMA", label: "SMA" },
];
const HB_OPSI = [
  { v: "", label: "Semua Status Hb" },
  { v: "berat", label: "Anemia Berat (<9)" },
  { v: "sedang", label: "Anemia Sedang (9–10,9)" },
  { v: "ringan", label: "Anemia Ringan (11–11,9)" },
  { v: "normal", label: "Normal (≥12)" },
  { v: "anemia", label: "Semua Anemia (<12)" },
  { v: "belum", label: "Belum Cek Hb" },
];
const TTD_OPSI = [
  { v: "", label: "Semua TTD" },
  { v: "sudah", label: "Sudah Minum TTD" },
  { v: "belum", label: "Belum Minum TTD" },
];
const LVL_OPSI = [
  { v: "", label: "Semua Level" },
  { v: "1", label: "Lv 1 — Kenali Anemia" },
  { v: "2", label: "Lv 2 — Pejuang TTD" },
  { v: "3", label: "Lv 3 — Sahabat Zat Besi" },
  { v: "4", label: "Lv 4 — Agen Bebas Anemia" },
  { v: "5", label: "Lv 5 — Duta Fe-Zone" },
];
const DUTA_OPSI = [
  { v: "", label: "Semua Status Duta" },
  { v: "winner", label: "Duta" },
  { v: "candidate", label: "Kandidat Duta" },
  { v: "none", label: "Bukan Duta" },
];

function kategoriCls(k: string | null): string {
  if (k === "BERAT") return "bg-red-100 text-red-700";
  if (k === "SEDANG") return "bg-orange-100 text-orange-700";
  if (k === "RINGAN") return "bg-amber-100 text-amber-700";
  if (k === "NORMAL") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-500";
}
function kategoriLabel(k: string | null): string {
  if (k === "BERAT") return "Berat";
  if (k === "SEDANG") return "Sedang";
  if (k === "RINGAN") return "Ringan";
  if (k === "NORMAL") return "Normal";
  return "Belum cek";
}
function tglID(d: string | null): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "puskesmas";
}

export default function PuskesmasRekap() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [hb, setHb] = useState("");
  const [ttd, setTtd] = useState("");
  const [lvl, setLvl] = useState("");
  const [duta, setDuta] = useState("");
  const [data, setData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQDebounced(q.trim()), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qDebounced) params.set("q", qDebounced);
      if (jenjang) params.set("jenjang", jenjang);
      if (sekolah) params.set("sekolah", sekolah);
      if (kecamatan) params.set("kecamatan", kecamatan);
      if (hb) params.set("hb", hb);
      if (ttd) params.set("ttd", ttd);
      if (lvl) params.set("lvl", lvl);
      if (duta) params.set("duta", duta);
      const r = await fetch(`/api/puskesmas/rekap?${params.toString()}`);
      if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
      const d = await r.json();
      if (r.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, [qDebounced, jenjang, sekolah, kecamatan, hb, ttd, lvl, duta]);

  useEffect(() => { load(); }, [load]);

  function ubahFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => setter(e.target.value);
  }
  const adaFilter = qDebounced || jenjang || sekolah || kecamatan || hb || ttd || lvl || duta;
  function resetFilter() {
    setQ(""); setJenjang(""); setSekolah(""); setKecamatan("");
    setHb(""); setTtd(""); setLvl(""); setDuta("");
  }

  // ---- Export: ambil data server (teraudit) lalu rakit file di browser ----
  async function ekspor(format: "xlsx" | "csv" | "pdf") {
    setExporting(format);
    setExportMsg(null);
    try {
      const r = await fetch("/api/puskesmas/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, q: qDebounced, jenjang, sekolah, kecamatan, hb, ttd, lvl, duta }),
      });
      if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
      const d = await r.json();
      if (!r.ok) {
        setExportMsg(d?.error || "Export gagal");
        return;
      }
      const namaFile = `rekap-fezone-${slug(d.meta.judul)}-${new Date().toISOString().slice(0, 10)}`;

      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([d.kolom, ...d.baris]);
        ws["!cols"] = d.kolom.map(() => ({ wch: 14 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Remaja");
        XLSX.writeFile(wb, `${namaFile}.xlsx`);
      } else if (format === "csv") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([d.kolom, ...d.baris]);
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        unduhBlob(blob, `${namaFile}.csv`);
      } else {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        doc.setFontSize(13);
        doc.text(d.meta.judul, 14, 12);
        doc.setFontSize(8);
        doc.text(`Dicetak: ${d.meta.dicetak} · Oleh: ${d.meta.oleh}`, 14, 17);
        doc.text(`Jumlah remaja: ${d.baris.length} · ${d.meta.catatan}`, 14, 21);
        autoTable(doc, {
          head: [d.kolom],
          body: d.baris,
          startY: 24,
          styles: { fontSize: 5.6, cellPadding: 0.8, overflow: "linebreak" },
          headStyles: { fillColor: [74, 29, 51], fontSize: 5.8 },
          alternateRowStyles: { fillColor: [248, 245, 240] },
          didDrawPage: () => {
            const h = doc.internal.pageSize.getHeight();
            doc.setFontSize(7);
            doc.text(
              `FE-ZONE — Duta Remaja Putri Bebas Anemia · Halaman ${doc.getNumberOfPages()}`,
              14, h - 5
            );
          },
        });
        doc.save(`${namaFile}.pdf`);
      }
      setExportMsg(`✅ ${d.baris.length} baris diekspor (${format.toUpperCase()}).`);
    } catch {
      setExportMsg("Export gagal — coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  function unduhBlob(blob: Blob, nama: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rk = data?.ringkasan;

  return (
    <div className="space-y-4">
      {/* Ringkasan angka */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: "Total Remaja", v: rk?.total, warna: "bg-teal-50" },
          { label: "Cek Hb", v: rk?.cekHb, warna: "bg-white" },
          { label: "Anemia", v: rk?.anemia, warna: "bg-rose-50" },
          { label: "Normal", v: rk?.normal, warna: "bg-emerald-50" },
          { label: "TTD", v: rk?.ttdSudah, warna: "bg-white" },
          { label: "Lulus 9 Misi", v: rk?.lulusMisi, warna: "bg-amber-50" },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl border-2 border-fez-ink p-2.5 text-center shadow-[4px_4px_0_0_#4a1d33] ${c.warna}`}>
            <p className="font-display text-xl font-extrabold text-fez-ink">{c.v ?? "–"}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/50">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Pencarian + filter */}
      <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, username, atau sekolah..."
              className="w-full rounded-xl border-2 border-fez-ink/15 bg-fez-cream/60 py-2.5 pl-10 pr-4 text-sm font-semibold text-fez-ink placeholder:text-fez-ink/35 focus:border-fez-teal focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <select value={jenjang} onChange={ubahFilter(setJenjang)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              {JENJANG_OPSI.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <select value={sekolah} onChange={ubahFilter(setSekolah)} className="min-w-0 rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              <option value="">Semua Sekolah</option>
              {(data?.opsiSekolah ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={kecamatan} onChange={ubahFilter(setKecamatan)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              <option value="">Semua Kecamatan</option>
              {(data?.wilayah.kecamatan ?? []).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={hb} onChange={ubahFilter(setHb)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              {HB_OPSI.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <select value={ttd} onChange={ubahFilter(setTtd)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              {TTD_OPSI.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <select value={lvl} onChange={ubahFilter(setLvl)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              {LVL_OPSI.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <select value={duta} onChange={ubahFilter(setDuta)} className="rounded-xl border-2 border-fez-ink/15 bg-white px-2 py-2 text-xs font-extrabold text-fez-ink focus:border-fez-teal focus:outline-none">
              {DUTA_OPSI.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          {adaFilter && (
            <button onClick={resetFilter} className="inline-flex w-fit items-center gap-1 rounded-full bg-fez-cream px-3 py-1 text-[11px] font-extrabold text-fez-ink/60 hover:bg-fez-cream/70">
              <X className="h-3 w-3" /> Bersihkan filter
            </button>
          )}
        </div>
      </div>

      {/* Bar export */}
      <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
        <p className="font-display text-sm font-extrabold text-fez-ink">📤 Unduh Rekap {data ? `(${data.ringkasan.total} remaja)` : ""}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-fez-ink/45">
          Mengikuti filter di atas. Kolom NIK &amp; telepon tidak disertakan (privasi). Setiap export tercatat di log audit.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => ekspor("xlsx")}
            disabled={!!exporting || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-fez-ink bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-[3px_3px_0_0_#4a1d33] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {exporting === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel (.xlsx)
          </button>
          <button
            onClick={() => ekspor("csv")}
            disabled={!!exporting || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-fez-ink bg-sky-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-[3px_3px_0_0_#4a1d33] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {exporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} CSV (.csv)
          </button>
          <button
            onClick={() => ekspor("pdf")}
            disabled={!!exporting || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-fez-ink bg-rose-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-[3px_3px_0_0_#4a1d33] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF (.pdf)
          </button>
        </div>
        {exportMsg && <p className="mt-2 text-[11px] font-extrabold text-fez-ink/60">{exportMsg}</p>}
      </div>

      {/* Tabel / kartu */}
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-fez-ink/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat rekap...
        </div>
      ) : data && data.rows.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-fez-ink/25 bg-white/60 p-10 text-center">
          <p className="font-display text-lg font-extrabold text-fez-ink/60">Tidak ada data rekap</p>
          <p className="mt-1 text-xs font-semibold text-fez-ink/45">Coba ubah kata kunci atau filter.</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {data.dibatasi && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-amber-700">
              Data mencapai batas 1000 remaja — sebagian mungkin tidak ditampilkan.
            </p>
          )}
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[2rem] border-2 border-fez-ink bg-white shadow-[8px_8px_0_0_#4a1d33] md:block">
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-fez-ink/10 bg-fez-cream/60 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/45">
                    <th className="px-4 py-3">Remaja</th>
                    <th className="px-4 py-3">Sekolah</th>
                    <th className="px-4 py-3">Domisili</th>
                    <th className="px-4 py-3">Hb Terakhir</th>
                    <th className="px-4 py-3">TTD</th>
                    <th className="px-4 py-3">Misi</th>
                    <th className="px-4 py-3">Level / XP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-fez-ink/5 transition-colors hover:bg-fez-cream/40">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-fez-ink">{r.name}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">@{r.username} · {r.age} th{r.isDuta ? " · 👑 Duta" : r.isDutaCandidate ? " · ⭐ Kandidat" : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[170px] truncate text-xs font-bold text-fez-ink/75" title={r.school}>{r.school}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">{r.educationLevel}{r.schoolDistrict ? ` · ${r.schoolDistrict}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-fez-ink/70">
                        {r.domisiliKelurahan ? <>{r.domisiliKelurahan}<br /><span className="text-[11px] font-semibold text-fez-ink/45">Kec. {r.domisiliKecamatan}</span></> : <span className="text-fez-ink/35">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${kategoriCls(r.hbKategori)}`}>
                          {r.hbValue !== null ? `${r.hbValue.toFixed(1).replace(".", ",")} · ${kategoriLabel(r.hbKategori)}` : "Belum cek"}
                        </span>
                        <p className="mt-0.5 text-[10px] font-semibold text-fez-ink/40">{tglID(r.hbCheckDate)}{r.hbPemeriksa ? ` · ${r.hbPemeriksa}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold text-fez-ink/70">{r.ttdCount > 0 ? `✅ ${r.ttdCount}×` : "—"}</td>
                      <td className="px-4 py-3 text-xs font-extrabold text-fez-ink/70">{r.missionsCompleted}/9</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-extrabold text-fez-ink">Lv {r.level}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">{r.xp.toLocaleString("id-ID")} XP</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.rows.map((r) => (
              <div key={r.id} className="rounded-3xl border-2 border-fez-ink bg-white p-4 shadow-[6px_6px_0_0_#4a1d33]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-extrabold text-fez-ink">{r.name}</p>
                    <p className="text-[11px] font-semibold text-fez-ink/45">@{r.username} · {r.educationLevel} · {r.age} th</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${kategoriCls(r.hbKategori)}`}>
                    {r.hbValue !== null ? `${r.hbValue.toFixed(1).replace(".", ",")} · ${kategoriLabel(r.hbKategori)}` : "Belum cek"}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-fez-ink/70">🏫 {r.school}</p>
                {r.domisiliKelurahan && <p className="text-[11px] font-semibold text-fez-ink/50">📍 {r.domisiliKelurahan}, Kec. {r.domisiliKecamatan}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-extrabold text-fez-ink/60">
                  <span>Lv {r.level} · {r.xp.toLocaleString("id-ID")} XP</span>
                  <span>💊 TTD {r.ttdCount > 0 ? `${r.ttdCount}×` : "—"}</span>
                  <span>🎯 Misi {r.missionsCompleted}/9</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
