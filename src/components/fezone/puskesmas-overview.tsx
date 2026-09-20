"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Award, Droplets, FileCheck2, HeartPulse, Loader2, MapPin, Sparkles,
  TrendingUp, UserPlus, Users,
} from "lucide-react";

// ------------------------------------------------------------
// Tab RINGKASAN dasbor petugas (pembaruan 19 Tahap 3):
// 8 kartu statistik + filter waktu (7/30/90 hari / semua) +
// 4 grafik (status anemia, klasifikasi Hb, per kecamatan,
// tren pendaftaran). Data hanya dari wilayah kerja Puskesmas.
// ------------------------------------------------------------

const WARNA_PERIODE = [
  { v: "7", label: "7 hari" },
  { v: "30", label: "30 hari" },
  { v: "90", label: "90 hari" },
  { v: "all", label: "Semua" },
];

const WARNA_ANEMIA = ["#E11D48", "#10B981", "#94A3B8"];

interface StatsData {
  wilayah: { kecamatan: string[]; kelurahan: number };
  kartu: {
    totalRemaja: number; remajaBaru: number; remajaAktif: number; sudahCekHb: number;
    anemia: number; minumTtd: number; lulusMisiInti: number; rataXp: number;
  };
  grafik: {
    statusAnemia: { nama: string; nilai: number }[];
    klasifikasiHb: { nama: string; nilai: number }[];
    perKecamatan: { nama: string; nilai: number }[];
    trenPendaftaran: { bulan: string; jumlah: number }[];
  };
}

function Kartu({ icon, label, value, warna, sub }: { icon: React.ReactNode; label: string; value: number | string; warna: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-fez-ink bg-white p-4 shadow-[4px_4px_0_0_#4a1d33]">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${warna}`}>{icon}</div>
      <p className="font-display text-2xl font-extrabold text-fez-ink">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/45">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-fez-ink/40">{sub}</p>}
    </motion.div>
  );
}

function PanelGrafik({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
      <p className="mb-3 font-display text-sm font-extrabold text-fez-ink">{title}</p>
      {children}
    </div>
  );
}

export default function PuskesmasOverview({ puskesmasNama }: { puskesmasNama: string }) {
  const [periode, setPeriode] = useState("30");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/puskesmas/stats?periode=${p}`);
      if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
      const d = await r.json();
      if (r.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(periode); }, [periode, load]);

  const k = data?.kartu;
  const g = data?.grafik;

  return (
    <div className="space-y-4">
      {/* Header wilayah + filter waktu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">Wilayah pemantauan</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-fez-ink">
            <MapPin className="h-4 w-4 text-fez-teal" /> {puskesmasNama}
          </p>
          {data?.wilayah && (
            <p className="mt-0.5 text-xs font-semibold text-fez-ink/50">
              {data.wilayah.kelurahan} kelurahan
              {data.wilayah.kecamatan.length > 0 && <> · Kec. {data.wilayah.kecamatan.join(", ")}</>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WARNA_PERIODE.map((op) => (
            <button
              key={op.v}
              onClick={() => setPeriode(op.v)}
              className={`rounded-full border-2 border-fez-ink px-3 py-1 text-xs font-extrabold transition-colors ${
                periode === op.v ? "bg-fez-ink text-white" : "bg-white text-fez-ink/60 hover:bg-fez-cream"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-fez-ink/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Menghitung statistik wilayah...
        </div>
      ) : k && g ? (
        <>
          {/* 8 kartu statistik */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kartu icon={<Users className="h-4 w-4 text-white" />} label="Total Remaja" value={k.totalRemaja} warna="bg-fez-teal" />
            <Kartu icon={<UserPlus className="h-4 w-4 text-white" />} label="Remaja Baru" value={k.remajaBaru} warna="bg-sky-500" sub={periode === "all" ? "sepanjang waktu" : `${periode} hari terakhir`} />
            <Kartu icon={<TrendingUp className="h-4 w-4 text-white" />} label="Remaja Aktif" value={k.remajaAktif} warna="bg-emerald-500" sub={periode === "all" ? "pernah beraktivitas" : `${periode} hari terakhir`} />
            <Kartu icon={<Award className="h-4 w-4 text-white" />} label="Rata-rata XP" value={k.rataXp} warna="bg-violet-500" />
            <Kartu icon={<HeartPulse className="h-4 w-4 text-white" />} label="Sudah Cek Hb" value={k.sudahCekHb} warna="bg-rose-500" />
            <Kartu icon={<Droplets className="h-4 w-4 text-white" />} label="Anemia (Hb <12)" value={k.anemia} warna="bg-red-600" />
            <Kartu icon={<FileCheck2 className="h-4 w-4 text-white" />} label="Minum TTD" value={k.minumTtd} warna="bg-amber-500" />
            <Kartu icon={<Sparkles className="h-4 w-4 text-white" />} label="Lulus 9 Misi Inti" value={k.lulusMisiInti} warna="bg-lime-600" />
          </div>

          {/* Grafik 1+2 berdampingan */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelGrafik title="Status Anemia Remaja Wilayah">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={g.statusAnemia} dataKey="nilai" nameKey="nama" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {g.statusAnemia.map((_, i) => <Cell key={i} fill={WARNA_ANEMIA[i % WARNA_ANEMIA.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} remaja`} />
                  <Legend verticalAlign="bottom" iconType="circle" formatter={(v) => <span className="text-xs font-bold text-fez-ink/70">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </PanelGrafik>

            <PanelGrafik title="Klasifikasi Hemoglobin (Kemenkes)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={g.klasifikasiHb} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152618" />
                  <XAxis dataKey="nama" tick={{ fontSize: 10, fontWeight: 700, fill: "#3d1526aa" }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#3d1526aa" }} />
                  <Tooltip formatter={(v: number) => `${v} remaja`} />
                  <Bar dataKey="nilai" radius={[8, 8, 0, 0]}>
                    <Cell fill="#B91C1C" /><Cell fill="#F97316" /><Cell fill="#FBBF24" /><Cell fill="#10B981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-fez-ink/45">
                Berat: Hb &lt;9 · Sedang: 9–10,9 · Ringan: 11–11,9 · Normal: ≥12 g/dL (remaja putri non-hamil, standar WHO/Kemenkes)
              </p>
            </PanelGrafik>
          </div>

          {/* Grafik 3+4 berdampingan */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelGrafik title="Remaja per Kecamatan Sekolah">
              {g.perKecamatan.length === 0 ? (
                <p className="py-16 text-center text-xs font-bold text-fez-ink/40">Belum ada remaja di wilayah Anda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={g.perKecamatan} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d152618" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#3d1526aa" }} />
                    <YAxis type="category" dataKey="nama" width={110} tick={{ fontSize: 10, fontWeight: 700, fill: "#3d1526aa" }} />
                    <Tooltip formatter={(v: number) => `${v} remaja`} />
                    <Bar dataKey="nilai" fill="#0D9488" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </PanelGrafik>

            <PanelGrafik title="Tren Pendaftaran 6 Bulan Terakhir">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={g.trenPendaftaran} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <defs>
                    <linearGradient id="gradTren" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D9488" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#0D9488" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d152618" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fontWeight: 700, fill: "#3d1526aa" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#3d1526aa" }} />
                  <Tooltip formatter={(v: number) => `${v} remaja`} />
                  <Area type="monotone" dataKey="jumlah" stroke="#0D9488" strokeWidth={2.5} fill="url(#gradTren)" />
                </AreaChart>
              </ResponsiveContainer>
            </PanelGrafik>
          </div>
        </>
      ) : (
        <div className="rounded-[2rem] border-2 border-fez-ink bg-red-50 p-6 text-sm font-bold text-red-700 shadow-[8px_8px_0_0_#4a1d33]">
          Gagal memuat statistik. Coba muat ulang halaman.
        </div>
      )}
    </div>
  );
}
