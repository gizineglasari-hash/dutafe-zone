"use client";

// ============================================================
// Grafik Pertumbuhan WHO — pembaruan 20 Tahap 3
// ============================================================
// Tiga indikator sesuai spek: BB/U (5–10 th) · TB/U (5–19 th) ·
// IMT/U (5–19 th) dengan 7 garis referensi (−3..+3 SD) yang
// dihitung dari tabel LMS resmi WHO Growth Reference 2007 —
// tabel & rumus yang SAMA dengan kalkulator (who2007.ts),
// tanpa mencampur standar Anthro/AnthroPlus.
//   • BB/U hanya digambar pada 61–120 bulan — WHO tidak
//     menyediakan referensi BB/U di atas 10 tahun (tidak boleh
//     diekstrapolasi); remaja >10 th dinilai lewat IMT/U.
//   • Titik pengukuran berasal dari tabel nutrition_assessments
//     (satu sumber data dengan tabel riwayat — tanpa data dummy).
//   • Usia diplot EKSAK per hari (bulan = hari / 30,4375) sesuai
//     metode AnthroPlus; nilai kurva di titik usia eksak pun
//     diinterpolasi, sehingga garis referensi mulus melewati
//     setiap titik pengukuran.
// Komponen murni client-side — memakai data riwayat yang sudah
// di-fetch modal Detail (tanpa API baru).
// ------------------------------------------------------------
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  bmiTable,
  classifyBbU,
  computeDetailedAge,
  heightTable,
  lmsLookupExact,
  lmsValueAtZ,
  MAX_MONTH_LMS,
  MAX_MONTH_WFA,
  MIN_MONTH_LMS,
  wfaTable,
  zScoreExact,
  type Sex,
} from "@/lib/who2007";
import type { LmsTable } from "@/lib/who2007-data";

export interface GrowthChartRow {
  id: string;
  tanggalPemeriksaan: string;
  usiaLabel: string;
  beratBadanKg: number;
  tinggiBadanCm: number;
  imt: number;
  tbUZscore: number;
  imtUZscore: number;
}

interface GrowthChartProps {
  participant: { name: string; jenisKelamin: string | null; tanggalLahir: string | null };
  rows: GrowthChartRow[];
}

type Indicator = "bbu" | "tbu" | "imtu";

const INDIKATOR: Record<Indicator, { label: string; unit: string; desc: string }> = {
  bbu: { label: "BB/U", unit: "kg", desc: "Berat badan menurut umur — referensi WHO hanya untuk usia 5–10 tahun" },
  tbu: { label: "TB/U", unit: "cm", desc: "Tinggi badan menurut umur — usia 5–19 tahun" },
  imtu: { label: "IMT/U", unit: "kg/m²", desc: "Indeks massa tubuh menurut umur — usia 5–19 tahun" },
};

// Palet garis referensi lembut (anti-stigma): merah/oranye/krem
// hanya sebagai penanda batas SD, bukan "label buruk" pada remaja.
const SD_LEVELS = [-3, -2, -1, 0, 1, 2, 3] as const;
const SD_KEY: Record<number, string> = { [-3]: "m3", [-2]: "m2", [-1]: "m1", [0]: "med", [1]: "p1", [2]: "p2", [3]: "p3" };
const SD_LABEL: Record<number, string> = { [-3]: "−3 SD", [-2]: "−2 SD", [-1]: "−1 SD", [0]: "Median (0)", [1]: "+1 SD", [2]: "+2 SD", [3]: "+3 SD" };
const SD_COLOR: Record<number, string> = {
  [-3]: "#d98282",
  [-2]: "#e0a96d",
  [-1]: "#cbbd93",
  [0]: "#4e9a6f",
  [1]: "#cbbd93",
  [2]: "#e0a96d",
  [3]: "#d98282",
};
const WarnaData = "#b3467a"; // rose tema FE-ZONE

type ChartRow = Record<string, number | string | null | undefined> & { bulan: number };

interface PlotPoint {
  bulan: number;
  nilai: number;
  tanggal: string;
  usia: string;
  z: number | null;
  status: string | null;
}

/** Nilai 7 garis SD pada satu usia (interpolasi LMS di usia eksak). */
function curveRow(table: LmsTable, bulan: number): ChartRow {
  const lms = lmsLookupExact(table, bulan);
  const row = { bulan } as ChartRow;
  for (const z of SD_LEVELS) row[SD_KEY[z]] = lmsValueAtZ(lms, z);
  return row;
}

function tableFor(ind: Indicator, sex: Sex): LmsTable {
  if (ind === "bbu") return wfaTable(sex);
  if (ind === "tbu") return heightTable(sex);
  return bmiTable(sex);
}

export default function GrowthChart({ participant, rows }: GrowthChartProps) {
  const [ind, setInd] = useState<Indicator>("tbu");
  const sex: Sex = participant.jenisKelamin === "L" ? "L" : "P";
  const dob = participant.tanggalLahir;

  // 1) Konversi seluruh pengukuran -> usia eksak (bulan) + titik per indikator
  const model = useMemo(() => {
    if (!dob) return null;
    const semua = rows
      .map((r) => {
        const age = computeDetailedAge(dob, r.tanggalPemeriksaan);
        return age ? { r, bulan: age.totalDays / 30.4375 } : null;
      })
      .filter((x): x is { r: GrowthChartRow; bulan: number } => x !== null)
      .sort((a, b) => a.bulan - b.bulan);

    const poin: Record<Indicator, PlotPoint[]> = { bbu: [], tbu: [], imtu: [] };
    let terpotongBbu = 0;
    let terpotongLms = 0;
    for (const { r, bulan } of semua) {
      const dasar = { tanggal: r.tanggalPemeriksaan, usia: r.usiaLabel };
      // BB/U — hanya ≤ 120 bulan (batas resmi tabel WHO 2007)
      if (bulan <= MAX_MONTH_WFA) {
        const z = zScoreExact(wfaTable(sex), bulan, r.beratBadanKg);
        poin.bbu.push({ bulan, nilai: r.beratBadanKg, ...dasar, z: Math.round(z * 100) / 100, status: classifyBbU(z).status });
      } else terpotongBbu += 1;
      // TB/U & IMT/U — 61..228 bulan
      if (bulan >= MIN_MONTH_LMS && bulan <= MAX_MONTH_LMS) {
        poin.tbu.push({ bulan, nilai: r.tinggiBadanCm, ...dasar, z: r.tbUZscore, status: null });
        poin.imtu.push({ bulan, nilai: r.imt, ...dasar, z: r.imtUZscore, status: null });
      } else terpotongLms += 1;
    }
    return { poin, terpotongBbu, terpotongLms };
  }, [dob, rows, sex]);

  // 2) Susun baris kurva + titik, domain sumbu X/Y, ticks (hooks aman:
  //    semua useMemo dijalankan sebelum early-return mana pun)
  const view = useMemo(() => {
    if (!model) return null;
    const cfg = INDIKATOR[ind];
    const poinInd = model.poin[ind];
    const table = tableFor(ind, sex);
    const bbu = ind === "bbu";

    const bulanPoin = poinInd.map((p) => p.bulan);
    if (bulanPoin.length === 0) return { cfg, poinInd, kosong: true } as const;

    const minB = Math.min(...bulanPoin);
    const maxB = Math.max(...bulanPoin);
    const x0 = bbu ? MIN_MONTH_LMS : Math.max(MIN_MONTH_LMS, Math.floor(minB) - 6);
    const x1 = bbu ? MAX_MONTH_WFA : Math.min(MAX_MONTH_LMS, Math.ceil(maxB) + 6);

    const data: ChartRow[] = [];
    for (let m = Math.ceil(x0); m <= Math.floor(x1); m++) data.push(curveRow(table, m));
    for (const p of poinInd) {
      if (p.bulan < x0 - 0.001 || p.bulan > x1 + 0.001) continue;
      data.push({ ...curveRow(table, p.bulan), bulan: p.bulan, nilai: p.nilai, tanggal: p.tanggal, usia: p.usia, z: p.z, status: p.status });
    }
    data.sort((a, b) => a.bulan - b.bulan);

    // Domain Y dari kurva terlihat + titik, dengan padding
    const vals: number[] = [];
    for (const row of data) {
      for (const z of SD_LEVELS) {
        const v = row[SD_KEY[z]];
        if (typeof v === "number") vals.push(v);
      }
      if (typeof row.nilai === "number") vals.push(row.nilai);
    }
    const vMin = Math.min(...vals);
    const vMax = Math.max(...vals);
    const pad = Math.max((vMax - vMin) * 0.12, cfg.unit === "cm" ? 4 : 1);
    const yDom: [number, number] = [vMin - pad, vMax + pad];

    const ticks: number[] = [];
    for (let m = Math.ceil(x0 / 12) * 12; m <= x1; m += 12) ticks.push(m);

    return { cfg, poinInd, kosong: false, x0, x1, data, yDom, ticks } as const;
  }, [model, ind, sex]);

  // ---------- early returns (SETELAH semua hooks) ----------
  if (!dob) {
    return (
      <Notice>
        Grafik pertumbuhan tidak dapat digambar — tanggal lahir pengguna ini tidak tersedia.
      </Notice>
    );
  }
  if (!model || !view) return null;

  const { cfg, poinInd } = view;

  // BB/U: semua pengukuran di atas 10 tahun → penjelasan aturan WHO
  if (view.kosong && ind === "bbu") {
    return (
      <GrafikKerangka ind={ind} setInd={setInd} footer={null}>
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5 text-center">
          <p className="text-2xl">📏</p>
          <p className="mt-1 text-sm font-extrabold text-[#3d1526]">Grafik BB/U tidak berlaku untuk pengguna ini</p>
          <p className="mx-auto mt-1 max-w-lg text-xs font-semibold leading-relaxed text-[#3d1526]/60">
            Menurut WHO Growth Reference 2007, referensi Berat badan menurut umur (BB/U) hanya tersedia hingga usia{" "}
            <b>10 tahun (120 bulan)</b>. Semua {model.terpotongBbu} pengukuran {participant.name} dilakukan setelah usia itu,
            sehingga berat badan dinilai dengan indikator <b>IMT/U</b> — silakan buka tab IMT/U. (WHO tidak mengizinkan kurva
            BB/U diekstrapolasi melewati 10 tahun.)
          </p>
        </div>
      </GrafikKerangka>
    );
  }
  if (view.kosong) {
    return (
      <GrafikKerangka ind={ind} setInd={setInd} footer={null}>
        <Notice>Tidak ada pengukuran dalam rentang usia referensi (5–19 tahun) untuk indikator {cfg.label}.</Notice>
      </GrafikKerangka>
    );
  }

  const footer = (
    <p className="mt-2 text-[10px] font-bold leading-relaxed text-[#3d1526]/45">
      Kurva referensi: tabel LMS resmi WHO Growth Reference 2007 (metode WHO AnthroPlus) — tabel yang sama dengan kalkulator
      Status Gizi. z TB/U &amp; IMT/U pada tooltip diambil dari riwayat tersimpan; z BB/U dihitung ulang dengan algoritma v3.
      {ind === "bbu" && model.terpotongBbu > 0
        ? ` ${model.terpotongBbu} pengukuran di atas usia 10 tahun tidak digambar pada BB/U (di luar rentang referensi WHO).`
        : ""}
      {ind !== "bbu" && model.terpotongLms > 0 ? ` ${model.terpotongLms} pengukuran di luar rentang usia 5–19 tahun tidak digambar.` : ""}
    </p>
  );

  return (
    <GrafikKerangka ind={ind} setInd={setInd} footer={footer}>
      {/* Legenda ringkas */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {SD_LEVELS.map((z) => (
          <span key={z} className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#3d1526]/55">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: SD_COLOR[z] }} />
            {SD_LABEL[z]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#b3467a]">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WarnaData }} />
          Pengukuran {participant.name}
        </span>
      </div>

      <div className="mt-1 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={view.data as ChartRow[]} margin={{ top: 10, right: 18, bottom: 2, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,21,38,0.08)" />
            <XAxis
              dataKey="bulan"
              type="number"
              domain={[view.x0, view.x1]}
              ticks={view.ticks as number[]}
              tickFormatter={(m: number) => `${Math.round(m / 12)} th`}
              allowDataOverflow
              stroke="rgba(61,21,38,0.3)"
              tick={{ fontSize: 11, fontWeight: 700, fill: "rgba(61,21,38,0.55)" }}
              tickMargin={6}
            />
            <YAxis
              domain={view.yDom as [number, number]}
              tickFormatter={(v: number) => v.toFixed(cfg.unit === "kg/m²" ? 1 : 0)}
              width={46}
              stroke="rgba(61,21,38,0.3)"
              tick={{ fontSize: 11, fontWeight: 700, fill: "rgba(61,21,38,0.55)" }}
            />
            <Tooltip
              cursor={{ stroke: "rgba(61,21,38,0.25)", strokeDasharray: "4 4" }}
              content={(props) => <TooltipIsi payload={props.payload as TooltipPayloadItem[]} unit={cfg.unit} />}
            />
            {/* 7 garis referensi SD */}
            {SD_LEVELS.map((z) =>
              z === 0 ? (
                <Line key={z} type="linear" dataKey="med" stroke={SD_COLOR[0]} strokeWidth={2.4} dot={false} isAnimationActive={false} />
              ) : (
                <Line key={z} type="linear" dataKey={SD_KEY[z]} stroke={SD_COLOR[z]} strokeWidth={1.4} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              )
            )}
            {/* Jejak pengukuran remaja */}
            <Line
              type="linear"
              dataKey="nilai"
              stroke={WarnaData}
              strokeWidth={2.6}
              dot={{ r: 4, fill: WarnaData, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[10px] font-bold text-[#3d1526]/40">
        Sumbu mendatar: usia ({bbuLabel(ind)}) · Sumbu tegak: {cfg.desc.split(" — ")[0].toLowerCase()} ({cfg.unit})
      </p>
    </GrafikKerangka>
  );
}

function bbuLabel(ind: Indicator): string {
  return ind === "bbu" ? "hingga 10 tahun sesuai referensi WHO" : "5–19 tahun";
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#3d1526]/20 bg-white p-4 text-center">
      <p className="text-xs font-bold text-[#3d1526]/60">{children}</p>
    </div>
  );
}

/* ---------- kerangka kartu + pemilih indikator ---------- */
function GrafikKerangka({
  ind,
  setInd,
  footer,
  children,
}: {
  ind: Indicator;
  setInd: (i: Indicator) => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/50">Grafik Pertumbuhan WHO</p>
          <p className="text-xs font-bold text-[#3d1526]/55">{INDIKATOR[ind].desc}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-[#faf0e8] p-1">
          {(Object.keys(INDIKATOR) as Indicator[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setInd(k)}
              title={INDIKATOR[k].desc}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors ${
                ind === k ? "bg-[#b3467a] text-white shadow-sm" : "text-[#3d1526]/60 hover:bg-white/70"
              }`}
            >
              {INDIKATOR[k].label}
            </button>
          ))}
        </div>
      </div>
      {children}
      {footer}
    </div>
  );
}

/* ---------- tooltip khusus titik pengukuran ---------- */
interface TooltipPayloadItem {
  dataKey?: string | number;
  payload?: ChartRow;
}

function TooltipIsi({ payload, unit }: { payload?: TooltipPayloadItem[]; unit: string }) {
  const item = payload?.find((p) => p.dataKey === "nilai" && p.payload && typeof p.payload.nilai === "number");
  if (!item || !item.payload) return null;
  const p = item.payload;
  const nilai = p.nilai as number;
  const z = typeof p.z === "number" ? p.z : null;
  return (
    <div className="rounded-xl border-2 border-[#3d1526]/10 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-extrabold text-[#3d1526]">{p.tanggal as string}</p>
      <p className="text-[10px] font-bold text-[#3d1526]/50">Usia saat ukur: {p.usia as string}</p>
      <p className="mt-1 text-sm font-extrabold" style={{ color: WarnaData }}>
        {nilai.toLocaleString("id-ID", { maximumFractionDigits: 2 })} {unit}
      </p>
      {z !== null && (
        <p className="text-[10px] font-extrabold text-[#3d1526]/60">
          {z > 0 ? "+" : ""}
          {z.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SD
          {p.status ? ` · ${p.status as string}` : ""}
        </p>
      )}
    </div>
  );
}
