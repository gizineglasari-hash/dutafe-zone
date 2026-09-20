"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Filter, Loader2, Search, Users, X } from "lucide-react";

// ------------------------------------------------------------
// Tab DATA REMAJA dasbor petugas (pembaruan 19 Tahap 3).
// Hanya remaja dalam wilayah kerja Puskesmas (dijaga server).
// Pencarian + 7 filter + paginasi server-side. Klik baris ->
// halaman detail read-only /dashboard-puskesmas/remaja/[id].
// ------------------------------------------------------------

interface RemajaRow {
  id: string;
  name: string;
  avatar: string;
  age: number;
  school: string;
  schoolDistrict: string | null;
  educationLevel: string;
  username: string;
  xp: number;
  level: number;
  levelName: string;
  levelIcon: string;
  missionsCompleted: number;
  ttdCount: number;
  hbValue: number | null;
  isDuta: boolean;
  isDutaCandidate: boolean;
}

interface ListData {
  remaja: RemajaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  wilayah: { kecamatan: string[] };
  opsiSekolah: string[];
}

const HB_OPSI = [
  { v: "", label: "Semua Status Hb" },
  { v: "anemia", label: "Anemia (Hb <12)" },
  { v: "normal", label: "Normal (Hb ≥12)" },
  { v: "belum", label: "Belum Cek Hb" },
];
const TTD_OPSI = [
  { v: "", label: "Semua TTD" },
  { v: "sudah", label: "Sudah Minum TTD" },
  { v: "belum", label: "Belum Minum TTD" },
];
const JENJANG_OPSI = [
  { v: "", label: "Semua Jenjang" },
  { v: "SMP", label: "SMP" },
  { v: "SMA", label: "SMA" },
];
const DUTA_OPSI = [
  { v: "", label: "Semua Status Duta" },
  { v: "winner", label: "Duta" },
  { v: "candidate", label: "Kandidat Duta" },
  { v: "none", label: "Bukan Duta" },
];
const LVL_OPSI = [
  { v: "", label: "Semua Level" },
  { v: "1", label: "Lv 1 — Kenali Anemia" },
  { v: "2", label: "Lv 2 — Pejuang TTD" },
  { v: "3", label: "Lv 3 — Sahabat Zat Besi" },
  { v: "4", label: "Lv 4 — Agen Bebas Anemia" },
  { v: "5", label: "Lv 5 — Duta Fe-Zone" },
];

function BadgeHb({ hb }: { hb: number | null }) {
  if (hb === null) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-500">Belum cek</span>;
  if (hb < 9) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">{hb.toFixed(1)} · Berat</span>;
  if (hb < 11) return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-extrabold text-orange-700">{hb.toFixed(1)} · Sedang</span>;
  if (hb < 12) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">{hb.toFixed(1)} · Ringan</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">{hb.toFixed(1)} · Normal</span>;
}

export default function PuskesmasRemaja() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [hb, setHb] = useState("");
  const [ttd, setTtd] = useState("");
  const [lvl, setLvl] = useState("");
  const [duta, setDuta] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce pencarian
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQDebounced(q.trim()); setPage(1); }, 400);
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
      params.set("page", String(page));
      const r = await fetch(`/api/puskesmas/remaja?${params.toString()}`);
      if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
      const d = await r.json();
      if (r.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, [qDebounced, jenjang, sekolah, kecamatan, hb, ttd, lvl, duta, page]);

  useEffect(() => { load(); }, [load]);

  function ubahFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => { setter(e.target.value); setPage(1); };
  }

  const adaFilter = qDebounced || jenjang || sekolah || kecamatan || hb || ttd || lvl || duta;

  function resetFilter() {
    setQ(""); setJenjang(""); setSekolah(""); setKecamatan("");
    setHb(""); setTtd(""); setLvl(""); setDuta(""); setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Pencarian + filter */}
      <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, username, sekolah, atau NIK..."
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

      {/* Info total */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-extrabold text-fez-ink/50">
          <Users className="mr-1 inline h-3.5 w-3.5" />
          {data ? `${data.total} remaja ditemukan` : "Memuat..."}
          {data && data.wilayah.kecamatan.length > 0 && (
            <span className="ml-2 font-semibold text-fez-ink/40">· wilayah Kec. {data.wilayah.kecamatan.join(", ")}</span>
          )}
        </p>
        <Filter className="h-4 w-4 text-fez-ink/25" />
      </div>

      {/* Tabel (desktop) / kartu (mobile) */}
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-fez-ink/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat data remaja...
        </div>
      ) : data && data.remaja.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-fez-ink/25 bg-white/60 p-10 text-center">
          <p className="font-display text-lg font-extrabold text-fez-ink/60">Belum ada remaja cocok</p>
          <p className="mt-1 text-xs font-semibold text-fez-ink/45">
            Coba ubah kata kunci atau filter. Data hanya menampilkan remaja yang kecamatan sekolahnya di wilayah kerja Puskesmas Anda.
          </p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[2rem] border-2 border-fez-ink bg-white shadow-[8px_8px_0_0_#4a1d33] md:block">
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-fez-ink/10 bg-fez-cream/60 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/45">
                    <th className="px-4 py-3">Remaja</th>
                    <th className="px-4 py-3">Sekolah</th>
                    <th className="px-4 py-3">Level / XP</th>
                    <th className="px-4 py-3">Hb</th>
                    <th className="px-4 py-3">TTD</th>
                    <th className="px-4 py-3">Misi</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.remaja.map((r) => (
                    <tr key={r.id} className="border-b border-fez-ink/5 transition-colors hover:bg-fez-cream/40">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-fez-ink">{r.avatar} {r.name}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">@{r.username} · {r.age} th{r.isDuta ? " · 👑 Duta" : r.isDutaCandidate ? " · ⭐ Kandidat" : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate text-xs font-bold text-fez-ink/75" title={r.school}>{r.school}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">{r.educationLevel}{r.schoolDistrict ? ` · ${r.schoolDistrict}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-extrabold text-fez-ink">{r.levelIcon} Lv {r.level}</p>
                        <p className="text-[11px] font-semibold text-fez-ink/45">{r.xp.toLocaleString("id-ID")} XP</p>
                      </td>
                      <td className="px-4 py-3"><BadgeHb hb={r.hbValue} /></td>
                      <td className="px-4 py-3 text-xs font-extrabold text-fez-ink/70">{r.ttdCount > 0 ? `✅ ${r.ttdCount}×` : "—"}</td>
                      <td className="px-4 py-3 text-xs font-extrabold text-fez-ink/70">{r.missionsCompleted}/9</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/dashboard-puskesmas/remaja/${r.id}`}
                          className="rounded-xl border-2 border-fez-ink bg-fez-teal px-3 py-1.5 text-xs font-extrabold text-white shadow-[3px_3px_0_0_#4a1d33] transition-transform hover:-translate-y-0.5"
                        >
                          Detail
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.remaja.map((r) => (
              <a key={r.id} href={`/dashboard-puskesmas/remaja/${r.id}`} className="block rounded-3xl border-2 border-fez-ink bg-white p-4 shadow-[6px_6px_0_0_#4a1d33]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-extrabold text-fez-ink">{r.avatar} {r.name}</p>
                    <p className="text-[11px] font-semibold text-fez-ink/45">@{r.username} · {r.educationLevel} · {r.age} th</p>
                  </div>
                  <BadgeHb hb={r.hbValue} />
                </div>
                <p className="mt-1 truncate text-xs font-bold text-fez-ink/70">🏫 {r.school}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-extrabold text-fez-ink/60">
                  <span>{r.levelIcon} Lv {r.level} · {r.xp.toLocaleString("id-ID")} XP</span>
                  <span>💊 TTD {r.ttdCount > 0 ? `${r.ttdCount}×` : "—"}</span>
                  <span>🎯 Misi {r.missionsCompleted}/9</span>
                </div>
              </a>
            ))}
          </div>

          {/* Paginasi */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-3xl border-2 border-fez-ink bg-white px-4 py-3 shadow-[6px_6px_0_0_#4a1d33]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-fez-ink px-3 py-1.5 text-xs font-extrabold text-fez-ink disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </button>
              <p className="text-xs font-extrabold text-fez-ink/60">Halaman {data.page} dari {data.totalPages}</p>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-fez-ink px-3 py-1.5 text-xs font-extrabold text-fez-ink disabled:opacity-30"
              >
                Berikutnya <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
