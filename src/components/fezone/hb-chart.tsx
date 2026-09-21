"use client";

// ============================================================
// Grafik Riwayat Hemoglobin (Hb) — pembaruan 20 Tahap 5
// ------------------------------------------------------------
// Ditampilkan di modal Detail Status Gizi (panel admin).
// • Garis = nilai Hb per pemeriksaan (HemoglobinRecord asli).
// • Warna titik = klasifikasi Kemenkes/WHO yang dipakai
//   seluruh aplikasi (kategori dihitung SERVER, bukan di sini).
// • Garis putus-putus = ambang anemia & anemia berat (standar
//   yang sama, bisa diatur admin lewat AppSetting hb_standards).
// • Titik "Diisi sendiri di Profil" (data lama) ikut digambar
//   dengan penanda khusus agar asal-usulnya jelas.
// Komponen mem-fetch datanya sendiri — patch admin.tsx minimal.
// ------------------------------------------------------------
import { useEffect, useState } from "react";
import { Droplets, Loader2, RefreshCw } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface HbRow {
  id: string;
  checkDate: string; // YYYY-MM-DD atau "-" (profil tanpa tanggal)
  hbValue: number;
  kategori: "BERAT" | "SEDANG" | "RINGAN" | "NORMAL";
  label: string;
  method: string | null;
  location: string | null;
  examiner: string | null;
  notes: string | null;
  sumber: "PUSKESMAS" | "PROFIL";
}

interface HbData {
  participant: { id: string; name: string; username: string; school: string; educationLevel: string };
  standards: { anemiaBelow: number; beratBelow: number; sedangBelow: number };
  rows: HbRow[];
}

const WARNA_KATEGORI: Record<HbRow["kategori"], string> = {
  NORMAL: "#10b981",
  RINGAN: "#f59e0b",
  SEDANG: "#f97316",
  BERAT: "#e11d48",
};

function fmtTanggal(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "tanpa tanggal";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface TooltipItem { payload?: HbRow & { tanggalLabel: string } }

export default function HbChart({ participantId }: { participantId: string }) {
  const [data, setData] = useState<HbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/hemoglobin`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal memuat riwayat Hb");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(d);
    } catch (e) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-[#3d1526]/10 bg-white text-sm text-[#3d1526]/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat riwayat Hb…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
        <p className="text-sm font-bold text-rose-700">{error}</p>
        <button onClick={load} className="mt-2 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white">Coba Lagi</button>
      </div>
    );
  }

  if (!data) return null;
  const { standards, rows, participant } = data;

  // Urut naik untuk grafik; terbaru untuk kartu & tabel
  const points = rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.checkDate))
    .map((r) => ({ ...r, tanggalLabel: fmtTanggal(r.checkDate) }));
  const terbaru = points.length ? points[points.length - 1] : null;
  const pertama = points.length ? points[0] : null;
  const deltaHb = terbaru && pertama && points.length >= 2
    ? `${terbaru.hbValue > pertama.hbValue ? "+" : terbaru.hbValue < pertama.hbValue ? "−" : "±"}${Math.abs(terbaru.hbValue - pertama.hbValue).toFixed(1)}`
    : null;

  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-display text-sm font-extrabold text-[#3d1526]">
            <Droplets className="h-4 w-4 text-rose-500" /> Grafik Hemoglobin (Hb)
          </p>
          <p className="text-[11px] text-[#3d1526]/50">
            Perkembangan Hb {participant.name} · ambang anemia Hb &lt; {standards.anemiaBelow} g/dL (Kemenkes/WHO)
          </p>
        </div>
        <button onClick={load} className="rounded-xl border border-[#3d1526]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#3d1526]/70 hover:bg-rose-50">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {terbaru ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl bg-[#faf0e8] p-2">
            <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Hb Terakhir</p>
            <p className="font-display text-lg font-extrabold text-[#3d1526]">{terbaru.hbValue.toFixed(1)} <span className="text-[10px]">g/dL</span></p>
            <p className="text-[10px] font-extrabold" style={{ color: WARNA_KATEGORI[terbaru.kategori] }}>{terbaru.label}</p>
          </div>
          <div className="rounded-xl bg-[#faf0e8] p-2">
            <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Tanggal Terakhir</p>
            <p className="text-sm font-extrabold text-[#3d1526]">{fmtTanggal(terbaru.checkDate)}</p>
            <p className="text-[10px] text-[#3d1526]/40">{terbaru.sumber === "PROFIL" ? "diisi sendiri di Profil" : "input petugas"}</p>
          </div>
          <div className="rounded-xl bg-[#faf0e8] p-2">
            <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Total Pemeriksaan</p>
            <p className="font-display text-lg font-extrabold text-[#3d1526]">{rows.length}</p>
            {deltaHb && <p className="text-[10px] font-bold text-emerald-700">perubahan sejak pertama: {deltaHb} g/dL</p>}
          </div>
          <div className="rounded-xl bg-[#faf0e8] p-2">
            <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/45">Ambang (Standar Aktif)</p>
            <p className="text-sm font-extrabold text-[#3d1526]">Anemia &lt; {standards.anemiaBelow} · Berat &lt; {standards.beratBelow}</p>
            <p className="text-[10px] text-[#3d1526]/40">sedang &lt; {standards.sedangBelow} g/dL</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-[#faf0e8] p-4 text-center text-sm font-bold text-[#3d1526]/50">
          Belum ada riwayat Hb untuk remaja ini. Hasil pemeriksaan petugas Puskesmas atau isi Hb di Profil akan tampil di sini.
        </div>
      )}

      {points.length >= 1 && (
        <div className="mt-3 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3d152610" />
              <XAxis dataKey="tanggalLabel" tick={{ fontSize: 10 }} stroke="#3d152660" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="#3d152660" unit=" g/dL" width={70} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "2px solid #3d152620", fontSize: 12 }}
                labelStyle={{ fontWeight: 700, color: "#3d1526" }}
                formatter={(value: number | string) => [`${Number(value).toFixed(1)} g/dL`, "Hb"]}
                labelFormatter={(label: string) => label}
              />
              {terbaru && (
                <ReferenceLine
                  y={standards.anemiaBelow}
                  stroke="#e11d48"
                  strokeDasharray="6 4"
                  label={{ value: `batas anemia (${standards.anemiaBelow})`, position: "insideBottomRight", fontSize: 9, fill: "#e11d48" }}
                />
              )}
              {terbaru && (
                <ReferenceLine
                  y={standards.beratBelow}
                  stroke="#f97316"
                  strokeDasharray="3 5"
                  label={{ value: `berat (${standards.beratBelow})`, position: "insideBottomRight", fontSize: 9, fill: "#f97316" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="hbValue"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={(props: { cx?: number; cy?: number; payload?: HbRow & { tanggalLabel: string } }) => {
                  const p = props.payload;
                  if (!p || props.cx === undefined || props.cy === undefined) return <g key="noop" />;
                  return (
                    <circle
                      key={`${p.id}-${p.checkDate}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={p.sumber === "PROFIL" ? 5 : 4}
                      fill={WARNA_KATEGORI[p.kategori]}
                      stroke={p.sumber === "PROFIL" ? "#3d1526" : "#fff"}
                      strokeWidth={p.sumber === "PROFIL" ? 2 : 1.5}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {points.length >= 1 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-extrabold text-rose-600">
            Tabel riwayat Hb ({rows.length} pemeriksaan, terbaru → terlama)
          </summary>
          <div className="thin-scroll mt-2 max-h-48 overflow-auto rounded-xl border border-[#3d1526]/10">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#3d1526]/10 text-[9px] uppercase tracking-wide text-[#3d1526]/50">
                  <th className="px-2 py-1.5">Tanggal</th>
                  <th className="px-2 py-1.5">Hb</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Pemeriksa</th>
                  <th className="px-2 py-1.5">Metode</th>
                  <th className="px-2 py-1.5">Lokasi</th>
                  <th className="px-2 py-1.5">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.id + r.checkDate} className="border-b border-[#3d1526]/5">
                    <td className="px-2 py-1.5 font-bold text-[#3d1526]">{fmtTanggal(r.checkDate)}</td>
                    <td className="px-2 py-1.5 font-extrabold text-[#3d1526]">{r.hbValue.toFixed(1)} g/dL</td>
                    <td className="px-2 py-1.5 font-extrabold" style={{ color: WARNA_KATEGORI[r.kategori] }}>{r.label}</td>
                    <td className="px-2 py-1.5 text-[#3d1526]/70">
                      {r.examiner ?? (r.sumber === "PROFIL" ? "diisi sendiri di Profil" : "—")}
                    </td>
                    <td className="px-2 py-1.5 text-[#3d1526]/70">{r.method ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[#3d1526]/70">{r.location ?? "—"}</td>
                    <td className="px-2 py-1.5 text-[#3d1526]/70">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
