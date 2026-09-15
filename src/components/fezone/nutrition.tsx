"use client";

// ============================================================
// 💗 CEK STATUS GIZI — KHUSUS REMAJA PUTRI (pembaruan 17)
// Halaman peserta: intro → formulir → hasil (z-score WHO 2007,
// persentil, grafik skala z, PERKIRAAN BB SESUAI TINGGI BADAN)
// + interpretasi ramah remaja + riwayat pemeriksaan (setiap cek
// = catatan baru, tidak menimpa).
// Jenis kelamin TIDAK ditanyakan — semua kalkulasi WHO otomatis
// memakai referensi PEREMPUAN (website khusus remaja putri).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, History, Loader2, Ruler, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { SectionTitle } from "@/components/fezone/ui-bits";
import { cn } from "@/lib/utils";

interface GiziRecord {
  id: string;
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
}

interface BbPerkiraan {
  tersedia: boolean;
  bbMedian?: number;
  bbMin?: number;
  bbMax?: number;
  bmiMedian?: number;
  bmiMinus2SD?: number;
  bmiPlus1SD?: number;
  referensi?: string;
  pesan?: string;
}

interface Hasil {
  usia: string;
  imt: number;
  beratKg?: number;
  tinggiCm?: number;
  tbU: { z: number; percentile: number; status: string; color: string };
  imtU: { z: number; percentile: number; status: string; color: string };
  bbPerkiraan: BbPerkiraan;
  interpretation: string;
  recommendation: string;
  referenceStandard: string;
}

// format angka gaya Indonesia: 50,0 · 19,53
const fmt1 = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Edukasi sesuai status IMT/U (aman utk remaja — TANPA anjuran diet
// ketat/puasa/pembatasan makan ekstrem/obat pelangsing) — spek bagian L.
function edukasiPerkiraanBb(status: string): { emoji: string; judul: string; isi: string } {
  if (status === "Normal") {
    return {
      emoji: "💚",
      judul: "Berat badanmu proporsional — pertahankan!",
      isi: "Berat badanmu sudah sejalan dengan tinggi dan usiamu menurut referensi WHO. Kuncinya sederhana: makan bergizi seimbang setiap hari, tidur yang cukup, dan tetap aktif bergerak. Tubuh yang tumbuh sehat butuh bahan bakar yang baik, bukan pembatasan makan.",
    };
  }
  if (status === "Kurus" || status === "Sangat Kurus") {
    return {
      emoji: "🧡",
      judul: "Berat badanmu masih di bawah rentang yang disarankan",
      isi: "Coba perbanyak porsi dan frekuensi makan bergizi: 3 kali makan utama + 2 camilan sehat (susu, telur, kacang, buah). Bila berat badan sulit bertambah, jangan ragu mengajak orang tua/wali berkonsultasi ke petugas kesehatan (posyandu/puskesmas) atau pendamping program — mereka siap membantumu tumbuh lebih baik.",
    };
  }
  return {
    emoji: "💛",
    judul: "Berat badanmu di atas rentang yang disarankan",
    isi: "Mulailah dari kebiasaan kecil yang menyenangkan: perbanyak sayur, buah, dan air putih; kurangi minuman manis dan gorengan; serta bergerak aktif sekitar 60 menit sehari (bersepeda, menari, jalan bareng teman). Tubuhmu sedang bertumbuh — yang penting pola makan seimbang dan aktivitas fisik yang konsisten, BUKAN diet ekstrem atau target turun berat badan yang cepat.",
  };
}

const COLOR_CHIP: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-300",
  yellow: "bg-amber-100 text-amber-700 border-amber-300",
  orange: "bg-orange-100 text-orange-700 border-orange-300",
  red: "bg-rose-100 text-rose-700 border-rose-300",
};
const COLOR_LABEL: Record<string, string> = { green: "💚", yellow: "💛", orange: "🧡", red: "❤️" };

// ---------- Grafik sederhana: skala z-score −4..+4 ----------
function ZScale({ z, color, zones }: { z: number; color: string; zones: [number, number, string][] }) {
  const W = 320;
  const pos = (v: number) => ((Math.min(4, Math.max(-4, v)) + 4) / 8) * W;
  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} 44`} className="w-full" role="img" aria-label="Skala z-score">
        {zones.map(([a, b, c], i) => (
          <rect key={i} x={pos(a)} y={12} width={pos(b) - pos(a)} height={12} rx={4} fill={c} opacity={0.45} />
        ))}
        {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
          <g key={t}>
            <line x1={pos(t)} y1={26} x2={pos(t)} y2={32} stroke="#4a1d33" strokeWidth={1} opacity={0.4} />
            <text x={pos(t)} y={42} textAnchor="middle" fontSize={9} fill="#4a1d33" opacity={0.55} fontWeight="bold">
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
        <g transform={`translate(${pos(z)}, 0)`}>
          <polygon points="0,4 7,-5 -7,-5" fill="#4a1d33" />
          <circle cx={0} cy={18} r={4.5} fill="#4a1d33" stroke="#fff" strokeWidth={1.5} />
        </g>
      </svg>
      <p className="text-center text-[11px] font-bold text-fez-ink/50">
        Posisi kamu pada skala z-score (segitiga) · zona berwarna = batas status WHO
      </p>
      <p className="mt-1 text-center text-sm font-extrabold" style={{ color: zoneTextColor(color) }}>
        {COLOR_LABEL[color]} z = {z >= 0 ? "+" : ""}{z.toFixed(2)}
      </p>
    </div>
  );
}

function zoneTextColor(c: string) {
  return { green: "#047857", yellow: "#b45309", orange: "#c2410c", red: "#be123c" }[c] ?? "#4a1d33";
}

const ZONES_TB: [number, number, string][] = [[-4, -3, "#e11d48"], [-3, -2, "#f59e0b"], [-2, 4, "#10b981"]];
const ZONES_IMT: [number, number, string][] = [[-4, -3, "#e11d48"], [-3, -2, "#f97316"], [-2, 1, "#10b981"], [1, 2, "#f59e0b"], [2, 4, "#e11d48"]];

// ============================================================

export default function NutritionView() {
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorBox, setErrorBox] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [records, setRecords] = useState<GiziRecord[]>([]);
  const [today, setToday] = useState("");

  const [nama, setNama] = useState("");
  const [dob, setDob] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [berat, setBerat] = useState("");
  const [tinggi, setTinggi] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/participant/nutrition");
      if (!res.ok) return;
      const d = await res.json();
      setNama(d.prefill?.nama ?? "");
      setDob(d.prefill?.tanggalLahir ?? "");
      setToday(d.today ?? "");
      setCheckDate((prev) => prev || d.today || "");
      setRecords(d.records ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- validasi klien (cermin aturan server) ----
  function validate(): string | null {
    if (!dob || !berat.trim() || !tinggi.trim()) {
      return "Lengkapi tanggal lahir, berat badan, dan tinggi badan terlebih dahulu.";
    }
    if (!checkDate) return "Isi tanggal pemeriksaan.";
    if (checkDate > today) return "Tanggal pemeriksaan tidak boleh di masa depan.";
    if (checkDate < dob) return "Tanggal pemeriksaan tidak boleh sebelum tanggal lahirmu.";
    const b = Number(berat.replace(",", "."));
    const t = Number(tinggi.replace(",", "."));
    if (!Number.isFinite(b) || b < 2.5 || b > 250) return "Berat badan harus angka antara 2,5–250 kg (pakai satuan kg).";
    if (!Number.isFinite(t) || t < 50 || t > 250) return "Tinggi badan harus angka antara 50–250 cm (pakai satuan cm).";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validate();
    if (v) {
      setErrorBox(v);
      toast({ title: "Periksa isianmu", description: v, variant: "destructive" });
      return;
    }
    setBusy(true);
    setErrorBox(null);
    try {
      const res = await fetch("/api/participant/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggalLahir: dob, tanggalPemeriksaan: checkDate, beratBadanKg: berat, tinggiBadanCm: tinggi }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        // WAJIB: kegagalan disampaikan apa adanya
        setErrorBox(d.error || "Hasil belum tersimpan — server menolak data. Coba lagi.");
        toast({ title: "❌ Hasil belum tersimpan", description: d.error || "Terjadi kesalahan. Coba lagi.", variant: "destructive" });
        return;
      }
      setHasil(d.hasil);
      setRecords((prev) => [d.record, ...prev]);
      setBerat("");
      setTinggi("");
      toast({ title: "✅ Hasil cek status gizi tersimpan!", description: "Riwayat pemeriksaanmu bertambah — data lama tidak pernah tertimpa." });
      requestAnimationFrame(() => document.getElementById("hasil-gizi")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setErrorBox("Hasil belum tersimpan — koneksi ke server terputus. Periksa internet lalu coba lagi.");
      toast({ title: "❌ Hasil belum tersimpan", description: "Koneksi bermasalah. Coba lagi.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ============ MENU / INTRO ============ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border-2 border-fez-ink bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 p-6 shadow-[4px_4px_0_0_#4a1d33]"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-white text-3xl sticker-sm">💗</span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold text-fez-ink">CEK STATUS GIZI</h1>
            <p className="mt-1 text-sm font-semibold text-fez-ink/70">
              Kenali pertumbuhan dan status gizimu berdasarkan usia, berat badan, dan tinggi badan.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => { setFormOpen(true); requestAnimationFrame(() => document.getElementById("form-gizi")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
                className="h-12 rounded-2xl border-2 border-fez-ink bg-fez-rose px-6 font-extrabold text-white hover:bg-fez-berry"
              >
                <Heart className="mr-2 h-4 w-4" /> Mulai Cek Status Gizi
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fez-ink/20 bg-white/70 px-3 py-1.5 text-[11px] font-extrabold text-fez-ink/60">
                <ShieldCheck className="h-3.5 w-3.5" /> Data pribadi — hanya kamu & pendamping program
              </span>
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-white/70 px-4 py-2.5 text-[12px] font-semibold text-fez-ink/60">
          📐 Hasil dihitung memakai <b>WHO Growth Reference 2007</b> untuk <b>remaja putri</b> (standar resmi usia 5–19 tahun) — sama dengan yang dipakai petugas kesehatan.
          Setiap pemeriksaan disimpan sebagai <b>catatan baru</b>, jadi riwayat pertumbuhanmu utuh.
        </p>
      </motion.div>

      {/* ============ FORMULIR ============ */}
      {formOpen && (
        <motion.form
          id="form-gizi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[4px_4px_0_0_#4a1d33]"
        >
          <SectionTitle icon="📝" title="Data Pemeriksaan" sub="Isi angkanya dengan telatu ya — pakai satuan kg dan cm" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="font-bold text-fez-ink">Nama</Label>
              <Input value={nama} readOnly disabled className="mt-1 h-12 rounded-xl border-2 bg-fez-cream/60 font-bold" />
              <p className="mt-1 text-[11px] font-semibold text-fez-ink/50">Diambil otomatis dari profilmu.</p>
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Untuk siapa?</Label>
              <div className="mt-1 flex h-12 items-center gap-2 rounded-xl border-2 border-fez-ink/15 bg-fez-cream/60 px-3">
                <span className="text-lg">👧</span>
                <span className="text-sm font-extrabold text-fez-ink/70">Khusus Remaja Putri</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-fez-ink/50">Perhitungan WHO otomatis memakai referensi pertumbuhan perempuan.</p>
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Tanggal lahir *</Label>
              <Input type="date" value={dob} max={today} onChange={(e) => setDob(e.target.value)} className="mt-1 h-12 rounded-xl border-2 font-bold" required />
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Tanggal pemeriksaan *</Label>
              <Input type="date" value={checkDate} max={today} onChange={(e) => setCheckDate(e.target.value)} className="mt-1 h-12 rounded-xl border-2 font-bold" required />
              <p className="mt-1 text-[11px] font-semibold text-fez-ink/50">Otomatis hari ini — boleh diubah bila pengukuran dilain hari.</p>
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Berat badan (kg) *</Label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/30" />
                <Input inputMode="decimal" value={berat} onChange={(e) => setBerat(e.target.value)} placeholder="cth. 48,5" className="mt-1 h-12 rounded-xl border-2 pl-9 font-bold" required />
              </div>
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Tinggi badan (cm) *</Label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/30" />
                <Input inputMode="decimal" value={tinggi} onChange={(e) => setTinggi(e.target.value)} placeholder="cth. 155" className="mt-1 h-12 rounded-xl border-2 pl-9 font-bold" required />
              </div>
            </div>
          </div>

          {errorBox && (
            <div className="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3">
              <p className="text-sm font-extrabold text-rose-700">❌ {errorBox}</p>
            </div>
          )}

          <Button disabled={busy} className="mt-5 h-13 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose py-3 font-extrabold text-white hover:bg-fez-berry">
            {busy ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menghitung & menyimpan…</>) : (<><Sparkles className="mr-2 h-5 w-5" /> Hitung Status Giziku</>)}
          </Button>
          <p className="mt-2 text-center text-[11px] font-semibold text-fez-ink/45">
            Khusus usia 5–19 tahun · angka dihitung ulang di server agar aman & akurat
          </p>
        </motion.form>
      )}

      {/* ============ HASIL ============ */}
      {hasil && (
        <motion.div
          id="hasil-gizi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[4px_4px_0_0_#4a1d33]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle icon="📋" title="Hasil Status Gizimu" sub={hasil.usia} />
            <span className="rounded-full bg-fez-cream px-3 py-1 text-[11px] font-extrabold text-fez-ink/60">{hasil.referenceStandard}</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-extrabold text-fez-ink">📏 Tinggi / Umur (TB/U)</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-extrabold", COLOR_CHIP[hasil.tbU.color])}>
                  {COLOR_LABEL[hasil.tbU.color]} {hasil.tbU.status}
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-fez-ink">
                z = {hasil.tbU.z >= 0 ? "+" : ""}{hasil.tbU.z.toFixed(2)}
              </p>
              <p className="text-xs font-bold text-fez-ink/60">Persentil: {hasil.tbU.percentile.toFixed(1)}</p>
              <ZScale z={hasil.tbU.z} color={hasil.tbU.color} zones={ZONES_TB} />
            </div>

            <div className="rounded-3xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-extrabold text-fez-ink">⚖️ IMT / Umur (IMT/U)</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-extrabold", COLOR_CHIP[hasil.imtU.color])}>
                  {COLOR_LABEL[hasil.imtU.color]} {hasil.imtU.status}
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-fez-ink">
                IMT {hasil.imt.toFixed(2)} <span className="text-sm font-bold text-fez-ink/50">kg/m²</span>
              </p>
              <p className="text-xs font-bold text-fez-ink/60">
                z = {hasil.imtU.z >= 0 ? "+" : ""}{hasil.imtU.z.toFixed(2)} · Persentil: {hasil.imtU.percentile.toFixed(1)}
              </p>
              <ZScale z={hasil.imtU.z} color={hasil.imtU.color} zones={ZONES_IMT} />
            </div>
          </div>

          {/* ====== PERKIRAAN BB SESUAI TINGGI BADAN ====== */}
          <div className="mt-4 rounded-3xl border-2 border-fez-ink/10 bg-gradient-to-br from-pink-50 to-rose-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-extrabold text-fez-ink">💗 Perkiraan BB sesuai Tinggi Badan</p>
              <span
                title="Perkiraan ini membantu memberikan gambaran berat badan berdasarkan tinggi badan dan pertumbuhan menurut WHO. Bukan angka yang wajib dicapai."
                className="cursor-help rounded-full border border-fez-ink/20 bg-white px-2.5 py-1 text-[11px] font-extrabold text-fez-ink/60"
              >ⓘ Penjelasan</span>
            </div>

            {hasil.bbPerkiraan?.tersedia && hasil.bbPerkiraan.bbMedian != null ? (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/40">Berat badan saat ini</p>
                    <p className="font-display text-xl font-extrabold text-fez-ink">{fmt1(hasil.beratKg ?? records[0]?.beratBadanKg ?? 0)} kg</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/40">Tinggi badan</p>
                    <p className="font-display text-xl font-extrabold text-fez-ink">{fmt1(hasil.tinggiCm ?? records[0]?.tinggiBadanCm ?? 0)} cm</p>
                  </div>
                  <div className="rounded-2xl border-2 border-fez-rose/30 bg-white p-3">
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/40">Perkiraan BB pada median pertumbuhan</p>
                    <p className="font-display text-xl font-extrabold text-fez-rose">{fmt1(hasil.bbPerkiraan.bbMedian)} kg</p>
                    <p className="text-[10px] font-bold text-fez-ink/45">"pertengahan" pertumbuhan remaja putri seumuranmu menurut WHO</p>
                  </div>
                  <div className="rounded-2xl border-2 border-emerald-300/60 bg-white p-3">
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/40">Rentang BB sesuai</p>
                    <p className="font-display text-xl font-extrabold text-emerald-700">
                      {fmt1(hasil.bbPerkiraan.bbMin ?? 0)} – {fmt1(hasil.bbPerkiraan.bbMax ?? 0)} kg
                    </p>
                    <p className="text-[10px] font-bold text-fez-ink/45">setara batas IMT/U −2 SD s.d. +1 SD menurut usiamu</p>
                  </div>
                </div>
                <p className="mt-3 rounded-2xl bg-white/70 px-4 py-2.5 text-[12px] font-semibold leading-relaxed text-fez-ink/65">
                  💬 <b>Keterangan:</b> Perkiraan berat badan dihitung berdasarkan tinggi badan, usia, dan referensi pertumbuhan WHO untuk remaja putri. Nilai ini bukan target berat badan yang wajib dicapai.
                </p>
                <div className="mt-2 rounded-2xl border-2 border-fez-ink/10 bg-white/70 p-3">
                  <p className="text-sm font-extrabold text-fez-ink">{edukasiPerkiraanBb(hasil.imtU.status).emoji} {edukasiPerkiraanBb(hasil.imtU.status).judul}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-relaxed text-fez-ink/70">{edukasiPerkiraanBb(hasil.imtU.status).isi}</p>
                  <p className="mt-2 rounded-xl bg-fez-cream/70 px-3 py-2 text-[12px] font-semibold italic leading-relaxed text-fez-ink/60">
                    "Setiap remaja tumbuh dengan kecepatan yang berbeda. Berat badan tidak perlu dibandingkan dengan teman sebaya. Yang lebih penting adalah pertumbuhan yang sehat dan konsisten."
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm font-extrabold text-fez-ink/70">
                ⚠️ {hasil.bbPerkiraan?.pesan || "Perkiraan BB sesuai tinggi badan belum dapat dihitung karena referensi WHO belum tersedia."}
              </p>
            )}
          </div>

          <div className="mt-4 rounded-3xl border-2 border-fez-ink/10 bg-gradient-to-br from-rose-50 to-amber-50 p-4">
            <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-fez-ink/85">{hasil.interpretation}</p>
            <div className="mt-3 rounded-2xl bg-white/80 p-3">
              <p className="whitespace-pre-line text-[13px] font-semibold leading-relaxed text-fez-ink/70">{hasil.recommendation}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ RIWAYAT ============ */}
      <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[4px_4px_0_0_#4a1d33]">
        <SectionTitle icon="🗂️" title="Riwayat Pemeriksaan" sub="Setiap cek tersimpan sebagai catatan baru" />
        {loading ? (
          <p className="py-6 text-center text-sm font-bold text-fez-ink/40">Memuat riwayat…</p>
        ) : records.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-fez-ink/40">
            <History className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Belum ada pemeriksaan. Mulai cek pertamamu di atas! 💗
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-fez-ink/10 text-[11px] font-extrabold uppercase text-fez-ink/45">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Usia</th>
                  <th className="py-2 pr-3">BB (kg)</th>
                  <th className="py-2 pr-3">TB (cm)</th>
                  <th className="py-2 pr-3">IMT</th>
                  <th className="py-2 pr-3">TB/U</th>
                  <th className="py-2 pr-3">IMT/U</th>
                  <th className="py-2 pr-3">Perkiraan BB median</th>
                  <th className="py-2">Rentang BB sesuai</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-fez-ink/5 font-bold text-fez-ink/80">
                    <td className="py-2.5 pr-3">{r.tanggalPemeriksaan}</td>
                    <td className="py-2.5 pr-3 text-xs">{r.usiaLabel}</td>
                    <td className="py-2.5 pr-3">{r.beratBadanKg.toFixed(1)}</td>
                    <td className="py-2.5 pr-3">{r.tinggiBadanCm.toFixed(1)}</td>
                    <td className="py-2.5 pr-3">{r.imt.toFixed(2)}</td>
                    <td className="py-2.5 pr-3">{r.tbUStatus}</td>
                    <td className="py-2.5 pr-3">{r.imtUStatus}</td>
                    <td className="py-2.5 pr-3">{r.bbMedianWho != null ? `${fmt1(r.bbMedianWho)} kg` : "—"}</td>
                    <td className="py-2.5">{r.bbMinWho != null && r.bbMaxWho != null ? `${fmt1(r.bbMinWho)} – ${fmt1(r.bbMaxWho)} kg` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
