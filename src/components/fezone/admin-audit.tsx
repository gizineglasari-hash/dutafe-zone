"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck } from "lucide-react";

// ------------------------------------------------------------
// Tab LOG AUDIT panel Admin (pembaruan 19 Tahap 5).
// Jejak aksi sensitif: login, buka data remaja, input/ubah/
// hapus Hb, export, verifikasi petugas. Read-only + filter
// (aksi, peran, pencarian, rentang tanggal) + paginasi.
// ------------------------------------------------------------

interface AuditRow {
  id: string;
  waktu: string;
  aksi: string;
  aksiLabel: string;
  peran: string | null;
  aktor: string;
  target: string | null;
  targetType: string | null;
  meta: string | null;
}

interface AuditData {
  logs: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  labelAksi: Record<string, string>;
}

const WARNA_PERAN: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  PETUGAS: "bg-teal-100 text-teal-700",
  PARTICIPANT: "bg-rose-100 text-rose-700",
  SISTEM: "bg-slate-100 text-slate-600",
};

function warnaAksi(a: string): string {
  if (a.startsWith("HB_DELETE")) return "bg-red-100 text-red-700";
  if (a.startsWith("HB_")) return "bg-amber-100 text-amber-700";
  if (a === "EXPORT") return "bg-sky-100 text-sky-700";
  if (a.startsWith("LOGIN")) return "bg-emerald-100 text-emerald-700";
  if (a === "VIEW_PARTICIPANT") return "bg-indigo-100 text-indigo-700";
  return "bg-slate-100 text-slate-600";
}
function ringkasMeta(meta: string | null): string {
  if (!meta) return "–";
  try {
    const d = JSON.parse(meta);
    const bagian: string[] = [];
    if (d.puskesmas) bagian.push(String(d.puskesmas));
    if (d.nama) bagian.push(String(d.nama));
    if (d.jumlah !== undefined) bagian.push(`${d.jumlah} data`);
    if (d.format) bagian.push(String(d.format).toUpperCase());
    if (d.status) bagian.push(String(d.status));
    if (d.notes) bagian.push(`"${String(d.notes).slice(0, 40)}"`);
    if (d.hbValue !== undefined) bagian.push(`Hb ${d.hbValue}`);
    return bagian.length > 0 ? bagian.join(" · ") : meta.slice(0, 60);
  } catch {
    return meta.slice(0, 60);
  }
}

export default function AdminAuditTab() {
  const [aksi, setAksi] = useState("");
  const [peran, setPeran] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditData | null>(null);
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsiAksi, setOpsiAksi] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => { setQDebounced(q.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (aksi) params.set("aksi", aksi);
      if (peran) params.set("peran", peran);
      if (qDebounced) params.set("q", qDebounced);
      if (dari) params.set("dari", dari);
      if (sampai) params.set("sampai", sampai);
      params.set("page", String(page));
      const r = await fetch(`/api/admin/audit?${params.toString()}`);
      if (r.status === 401) { window.location.href = "/masuk-admin"; return; }
      const d = await r.json();
      if (r.ok) {
        setData(d);
        if (Object.keys(opsiAksi).length === 0 && d.labelAksi) setOpsiAksi(d.labelAksi);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aksi, peran, qDebounced, dari, sampai, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border-2 border-[#3d1526]/15 bg-white p-5">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-[#3d1526]">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> Log Audit Sistem
        </p>
        <p className="mt-1 text-xs font-semibold text-[#3d1526]/55">
          Jejak semua aksi sensitif: login, buka data remaja, input/ubah/hapus Hb, export data, verifikasi petugas.
          Log tidak dapat diubah atau dihapus.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <select value={aksi} onChange={(e) => { setAksi(e.target.value); setPage(1); }} className="rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 py-2 text-xs font-extrabold text-[#3d1526]">
            <option value="">Semua Aksi</option>
            {Object.entries(opsiAksi).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={peran} onChange={(e) => { setPeran(e.target.value); setPage(1); }} className="rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 py-2 text-xs font-extrabold text-[#3d1526]">
            <option value="">Semua Peran</option>
            <option value="ADMIN">Admin</option>
            <option value="PETUGAS">Petugas</option>
            <option value="PARTICIPANT">Peserta</option>
          </select>
          <input type="date" value={dari} onChange={(e) => { setDari(e.target.value); setPage(1); }} className="rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 py-2 text-xs font-extrabold text-[#3d1526]" />
          <input type="date" value={sampai} onChange={(e) => { setSampai(e.target.value); setPage(1); }} className="rounded-xl border-2 border-[#3d1526]/15 bg-white px-2 py-2 text-xs font-extrabold text-[#3d1526]" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3d1526]/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari username/isinya..."
              className="w-full rounded-xl border-2 border-[#3d1526]/15 bg-white py-2 pl-8 pr-3 text-xs font-bold text-[#3d1526] placeholder:text-[#3d1526]/35"
            />
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-[#3d1526]/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat log audit...
        </div>
      ) : data && data.logs.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[#3d1526]/25 bg-white/60 p-10 text-center">
          <p className="font-display text-lg font-extrabold text-[#3d1526]/60">Belum ada log cocok</p>
          <p className="mt-1 text-xs font-semibold text-[#3d1526]/45">Coba ubah filter atau kata kunci.</p>
        </div>
      ) : data ? (
        <>
          <div className="overflow-hidden rounded-3xl border-2 border-[#3d1526]/15 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-[#3d1526]/10 bg-[#faf5f0] text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Pelaku</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setDetail(l)}
                      className="cursor-pointer border-b border-[#3d1526]/5 transition-colors hover:bg-[#faf5f0]"
                    >
                      <td className="px-4 py-2.5 text-xs font-bold text-[#3d1526]/70">
                        {new Date(l.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${warnaAksi(l.aksi)}`}>{l.aksiLabel}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-extrabold text-[#3d1526]/85">
                        {l.aktor}
                        {l.peran && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${WARNA_PERAN[l.peran] ?? "bg-slate-100 text-slate-600"}`}>{l.peran}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-[#3d1526]/60">
                        {l.target ? `@${l.target}` : l.targetType ?? "–"}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-xs font-semibold text-[#3d1526]/50">{ringkasMeta(l.meta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginasi */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-3xl border-2 border-[#3d1526]/15 bg-white px-4 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-[#3d1526]/20 px-3 py-1.5 text-xs font-extrabold text-[#3d1526] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </button>
              <p className="text-xs font-extrabold text-[#3d1526]/60">Halaman {data.page} dari {data.totalPages} · {data.total} log</p>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-[#3d1526]/20 px-3 py-1.5 text-xs font-extrabold text-[#3d1526] disabled:opacity-30"
              >
                Berikutnya <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : null}

      {/* Modal detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#3d1526]/20 bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-extrabold text-[#3d1526]">Detail Log Audit</p>
            <div className="mt-3 space-y-2 text-xs font-bold text-[#3d1526]/75">
              <p><span className="text-[#3d1526]/40">Waktu:</span> {new Date(detail.waktu).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })}</p>
              <p><span className="text-[#3d1526]/40">Aksi:</span> {detail.aksiLabel} <span className="text-[#3d1526]/35">({detail.aksi})</span></p>
              <p><span className="text-[#3d1526]/40">Pelaku:</span> {detail.aktor} {detail.peran ? `(${detail.peran})` : ""}</p>
              <p><span className="text-[#3d1526]/40">Target:</span> {detail.target ? `@${detail.target}` : detail.targetType ?? "–"} {detail.targetType ? `· ${detail.targetType}` : ""}</p>
              <div>
                <p className="text-[#3d1526]/40">Meta lengkap:</p>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[#faf5f0] p-3 text-[10px] leading-relaxed text-[#3d1526]/70">
                  {detail.meta ? (() => { try { return JSON.stringify(JSON.parse(detail.meta), null, 2); } catch { return detail.meta; } })() : "–"}
                </pre>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 w-full rounded-xl border-2 border-[#3d1526]/20 py-2 text-xs font-extrabold text-[#3d1526] hover:bg-[#faf5f0]">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
