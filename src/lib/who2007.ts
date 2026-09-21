// ============================================================
// Mesin hitung Status Gizi — WHO Growth Reference 2007 (5–19 th)
// ============================================================
// Mengikuti metode WHO AnthroPlus:
//   z = ((y / M)^L − 1) / (L × S)          (rumus LMS)
//   percentile = distribusi normal kumulatif Φ(z) × 100
// Usia dihitung PERSIS per hari (bukan selisih tahun saja),
// lalu dikonversi ke bulan eksak = hari / 30,4375 (TANPA
// pembulatan). Nilai L, M, S di-INTERPOLASI linear antara dua
// baris bulan tabel yang mengapit usia tersebut — persis
// perilaku interpolasi makro igrowup WHO AnthroPlus. Pada
// usia bulan BULAT hasilnya identik dengan pembacaan baris
// tunggal (kompatibel dengan record v1/v2 yang lama).
// Di luar ±3 SD dipakai koreksi resmi WHO (igrowup): lebar SD
// lokal antara garis +2..+3 SD (atau −3..−2 SD), bukan
// ekstrapolasi LMS mentah.
// v1 (lama) = floor bulan; v2 = round bulan; keduanya membaca
// SATU baris tabel (z "berundak" antar bulan, selisih hingga
// ±0,05 SD dari kurva kontinu AnthroPlus). v3 menghilangkan
// undakan itu dengan interpolasi — inilah akar kasus delta
// 0,05 SD pada TB/U yang dilaporkan di audit Pembaruan 18.
// ------------------------------------------------------------
// Klasifikasi (WHO 2007):
//   TB/U  : < −3 Sangat Pendek · −3..−2 Pendek · ≥ −2 Normal
//   IMT/U : < −3 Sangat Kurus · −3..−2 Kurus · −2..+1 Normal
//           · +1..+2 Gizi Lebih · > +2 Obesitas
// ============================================================
import { BFA_GIRLS, BFA_BOYS, HFA_GIRLS, HFA_BOYS, WFA_GIRLS, WFA_BOYS, type LmsTable } from "./who2007-data";

export const REFERENCE_STANDARD = "WHO Growth Reference 2007";
export const REFERENCE_VERSION = "Tabel expanded LMS resmi WHO (hfa/bmi z-score, 61–228 bulan), metode WHO AnthroPlus";
/**
 * Versi algoritma kalkulator (spek bagian 22-23):
 * - v1 = floor(hari/30,4375) + 1 baris tabel → versi awal
 * - v2 = round(hari/30,4375) + 1 baris tabel → |Δ| ≤ ±0,05 SD
 *        vs kurva kontinu AnthroPlus (akar kasus delta TB/U)
 * - v3 = usia eksak + interpolasi linear LMS antar baris +
 *        koreksi resmi WHO di luar ±3 SD → identik metode
 *        WHO AnthroPlus (igrowup). Pembaruan 20 Tahap 1.
 * Setiap record baru menyimpan versi ini ke kolom calculation_version
 * agar admin tahu algoritma apa yang dipakai saat pemeriksaan.
 * Record lama (v1/v2) TIDAK diubah — kolom ini nullable & per baris.
 */
export const CALCULATION_VERSION = "WHO2007-FEMALE-5-19-LMS-v3";
export const DAYS_PER_MONTH_LMS = 30.4375;
export const MIN_MONTH_LMS = 61; // 5 tahun
export const MAX_MONTH_LMS = 228; // 19 tahun
// BB/U (weight-for-age) hanya tersedia 5–10 tahun menurut WHO 2007 —
// di atas usia itu indikator berat badan resmi adalah IMT/U.
export const MIN_MONTH_WFA = 61; // 5 tahun
export const MAX_MONTH_WFA = 120; // 10 tahun

export type Sex = "L" | "P";

// ---------------- Tanggal & usia ----------------

/** "YYYY-MM-DD" -> Date (UTC tengah malam, aman dibandingkan). */
export function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** Format Date (UTC) -> "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hari ini menurut kalender WIB (UTC+7), sebagai "YYYY-MM-DD". */
export function todayWIB(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

export interface DetailedAge {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  monthsLms: number;
  label: string;
}

/** Usia persis: tahun + bulan kalender + sisa hari, plus total hari & bulan LMS. */
export function computeDetailedAge(dobISO: string, checkISO: string): DetailedAge | null {
  const dob = parseISODate(dobISO);
  const check = parseISODate(checkISO);
  if (!dob || !check) return null;
  if (check.getTime() < dob.getTime()) return null;

  const totalDays = Math.round((check.getTime() - dob.getTime()) / 86400000);

  // breakdown kalender
  let years = check.getUTCFullYear() - dob.getUTCFullYear();
  let months = check.getUTCMonth() - dob.getUTCMonth();
  let days = check.getUTCDate() - dob.getUTCDate();
  if (days < 0) {
    months -= 1;
    // jumlah hari pada bulan sebelum bulan tanggal cek
    days += new Date(Date.UTC(check.getUTCFullYear(), check.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Konvensi WHO AnthroPlus: usia dalam hari dibagi 30,4375 lalu
  // DIBULATKAN ke bulan terdekat (bukan floor). Audit 16-09-2026:
  // kasus 4808 hari (157,963 bl) → AnthroPlus memakai bulan 158.
  const monthsLms = Math.round(totalDays / DAYS_PER_MONTH_LMS);
  const label = `${years} tahun ${months} bulan ${days} hari`;
  return { years, months, days, totalDays, monthsLms, label };
}

// ---------------- Z-score & persentil ----------------

function lmsLookup(table: LmsTable, month: number): [number, number, number] {
  const m = Math.min(MAX_MONTH_LMS, Math.max(MIN_MONTH_LMS, month));
  // tabel berurutan 61..228 → indeks langsung
  const row = table[m - 61];
  if (row && row[0] === m) return [row[1], row[2], row[3]];
  // fallback keamanan: cari linear
  const found = table.find((r) => r[0] === m) ?? (month < MIN_MONTH_LMS ? table[0] : table[table.length - 1]);
  return [found[1], found[2], found[3]];
}

/** z-score LMS baris tunggal (bulan bulat) — dipakai v1/v2, disimpan demi kompatibilitas. */
export function zScore(table: LmsTable, monthsLms: number, y: number): number {
  const [L, M, S] = lmsLookup(table, monthsLms);
  if (Math.abs(L) < 1e-6) return Math.log(y / M) / S;
  return (Math.pow(y / M, L) - 1) / (L * S);
}

/**
 * Pemetaan LMS pada usia EKSAK (pecahan bulan): interpolasi linear
 * antara dua baris bulan yang mengapit — persis perilaku makro
 * igrowup WHO AnthroPlus. Pada usia bulan bulat hasilnya identik
 * dengan lmsLookup (kompatibel penuh dengan data lama v1/v2).
 */
export function lmsLookupExact(table: LmsTable, monthExact: number): [number, number, number] {
  const m = Math.min(MAX_MONTH_LMS, Math.max(MIN_MONTH_LMS, monthExact));
  const lo = Math.floor(m);
  const hi = Math.min(MAX_MONTH_LMS, lo + 1);
  const loLms = lmsLookup(table, lo);
  if (hi === lo) return loLms;
  const hiLms = lmsLookup(table, hi);
  const w = m - lo; // bobot interpolasi 0..1
  return [
    loLms[0] + (hiLms[0] - loLms[0]) * w,
    loLms[1] + (hiLms[1] - loLms[1]) * w,
    loLms[2] + (hiLms[2] - loLms[2]) * w,
  ];
}

/**
 * z-score metode AnthroPlus PENUH (v3):
 * 1. LMS diinterpolasi pada usia eksak (bukan dibulatkan).
 * 2. Rentang −3..+3 SD memakai rumus LMS standar.
 * 3. Di luar ±3 SD memakai koreksi resmi WHO (manual AnthroPlus
 *    / makro igrowup): z = ±3 + (y − M±3SD) / (lebar SD LOKAL
 *    antara garis +2..+3 SD atau −3..−2 SD).
 */
export function zScoreExact(table: LmsTable, monthsExact: number, y: number): number {
  const lms = lmsLookupExact(table, monthsExact);
  const [L, M, S] = lms;
  const raw = Math.abs(L) < 1e-6 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
  if (raw > 3) {
    const m2 = lmsValueAtZ(lms, 2);
    const m3 = lmsValueAtZ(lms, 3);
    if (m2 != null && m3 != null && m3 > m2) return 3 + (y - m3) / (m3 - m2);
  }
  if (raw < -3) {
    const m2 = lmsValueAtZ(lms, -2);
    const m3 = lmsValueAtZ(lms, -3);
    if (m2 != null && m3 != null && m2 > m3) return -3 + (y - m3) / (m2 - m3);
  }
  return raw;
}

/** Fungsi error Abramowitz–Stegun (galat ~1.5e-7) → CDF normal. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Persentil (0.1–99.9) dari z-score menurut distribusi normal. */
export function percentileFromZ(z: number): number {
  const p = 0.5 * (1 + erf(z / Math.SQRT2)) * 100;
  const clamped = Math.min(99.9, Math.max(0.1, p));
  return Math.round(clamped * 10) / 10;
}

// ---------------- Klasifikasi status ----------------

export type ColorKey = "green" | "yellow" | "orange" | "red";

export interface StatusResult {
  z: number;
  percentile: number;
  status: string;
  color: ColorKey;
}

export function classifyTbU(z: number): StatusResult {
  const percentile = percentileFromZ(z);
  if (z < -3) return { z, percentile, status: "Sangat Pendek", color: "red" };
  if (z < -2) return { z, percentile, status: "Pendek", color: "yellow" };
  return { z, percentile, status: "Normal", color: "green" };
}

export function classifyImtU(z: number): StatusResult {
  const percentile = percentileFromZ(z);
  if (z < -3) return { z, percentile, status: "Sangat Kurus", color: "red" };
  if (z < -2) return { z, percentile, status: "Kurus", color: "orange" };
  if (z <= 1) return { z, percentile, status: "Normal", color: "green" };
  if (z <= 2) return { z, percentile, status: "Gizi Lebih", color: "yellow" };
  return { z, percentile, status: "Obesitas", color: "red" };
}

/**
 * Klasifikasi BB/U resmi WHO 2007 (weight-for-age 5–10 th, cutoff
 * baku: <−3 sangat kurang · −3..−2 kurang · −2..+1 normal ·
 * +1..+2 risiko lebih · >+2 lebih) — dipakai tooltip grafik
 * pertumbuhan. Bukan pengganti TB/U & IMT/U pada kalkulator.
 */
export function classifyBbU(z: number): StatusResult {
  const percentile = percentileFromZ(z);
  if (z < -3) return { z, percentile, status: "BB Sangat Kurang", color: "red" };
  if (z < -2) return { z, percentile, status: "BB Kurang", color: "orange" };
  if (z <= 1) return { z, percentile, status: "BB Normal", color: "green" };
  if (z <= 2) return { z, percentile, status: "Risiko BB Lebih", color: "yellow" };
  return { z, percentile, status: "BB Lebih", color: "red" };
}

export interface AssessmentInput {
  sex: Sex;
  dobISO: string;
  checkISO: string;
  weightKg: number;
  heightCm: number;
}

export interface AssessmentResult {
  age: DetailedAge;
  imt: number;
  tbU: StatusResult;
  imtU: StatusResult;
  interpretation: string;
  recommendation: string;
  /** Debug kalkulasi (KHUSUS admin — tidak pernah ditampilkan ke peserta). */
  debug: {
    version: string;
    sex: Sex;
    dobISO: string;
    checkISO: string;
    totalDays: number;
    monthsLmsExact: number; // hari / 30,4375 sebelum dibulatkan
    monthsLms: number; // bulan tabel LMS yang dipakai
    bmiRaw: number; // IMT presisi penuh sebelum tampil dibulatkan
    tbU_L: number; // L,M,S hasil interpolasi pada usia eksak (v3)
    tbU_M: number;
    tbU_S: number;
    imtU_L: number;
    imtU_M: number;
    imtU_S: number;
    tbURaw: number; // z sebelum pembulatan tampilan
    imtURaw: number;
  };
}

const COLOR_EMOJI: Record<ColorKey, string> = {
  green: "💚",
  yellow: "💛",
  orange: "🧡",
  red: "❤️",
};

export function heightTable(sex: Sex): LmsTable {
  return sex === "L" ? HFA_BOYS : HFA_GIRLS;
}
export function bmiTable(sex: Sex): LmsTable {
  return sex === "L" ? BFA_BOYS : BFA_GIRLS;
}
/** Tabel BB/U 5–10 tahun (WHO 2007). Selalu tersedia untuk L & P. */
export function wfaTable(sex: Sex): LmsTable {
  return sex === "L" ? WFA_BOYS : WFA_GIRLS;
}

// ---------------- PERKIRAAN BB SESUAI TINGGI BADAN ----------------
// Semua perhitungan memakai tabel LMS WHO 2007 PEREMPUAN yang SAMA
// dengan perhitungan z-score IMT/U di atas (satu sumber data, bukan
// database referensi kedua). TANPA rumus dewasa (Broca/Lorentz/Devine/
// TB−100) — sesuai spek fitur.
// ------------------------------------------------------------------

/** Konversi z-score LMS -> nilai fisik: y = M × (1 + L·S·z)^(1/L). */
export function lmsValueAtZ([L, M, S]: [number, number, number], z: number): number | null {
  if (Math.abs(L) < 1e-6) return M * Math.exp(S * z);
  const base = 1 + L * S * z;
  if (base <= 0) return null;
  return M * Math.pow(base, 1 / L);
}

export interface FemaleBMIReference {
  monthsLms: number;
  L: number;
  M: number;
  S: number;
  /** IMT pada median (z = 0) — "pertumbuhan tengah" remaja putri seumuran. */
  bmiMedian: number;
  /** IMT pada −3 SD (batas Sangat Kurus). */
  bmiMinus3SD: number;
  /** IMT pada −2 SD (batas Kurus — batas bawah rentang BB sesuai). */
  bmiMinus2SD: number;
  /** IMT pada +1 SD (batas Gizi Lebih — batas atas rentang BB sesuai). */
  bmiPlus1SD: number;
  /** IMT pada +2 SD (batas Obesitas). */
  bmiPlus2SD: number;
}

/**
 * Referensi IMT WHO 2007 PEREMPUAN untuk usia dalam bulan (61–228).
 * Reusable: dipakai untuk perkiraan BB median / rentang BB sesuai.
 * Mengembalikan null bila usia di luar rentang referensi (5–19 tahun)
 * — pemanggil TIDAK BOLEH mengarang angka (lihat spek bagian J).
 */
export function getWHOFemaleBMIReference(monthsLms: number): FemaleBMIReference | null {
  if (monthsLms < MIN_MONTH_LMS || monthsLms > MAX_MONTH_LMS) return null;
  const [L, M, S] = lmsLookup(BFA_GIRLS, monthsLms);
  const at = (z: number) => lmsValueAtZ([L, M, S], z);
  const m0 = at(0), mNeg3 = at(-3), mNeg2 = at(-2), mPos1 = at(1), mPos2 = at(2);
  if (m0 === null || mNeg3 === null || mNeg2 === null || mPos1 === null || mPos2 === null) return null;
  return {
    monthsLms,
    L, M, S,
    bmiMedian: m0,
    bmiMinus3SD: mNeg3,
    bmiMinus2SD: mNeg2,
    bmiPlus1SD: mPos1,
    bmiPlus2SD: mPos2,
  };
}

export interface WeightEstimate {
  /** Perkiraan BB (kg) pada median pertumbuhan: IMT median WHO × TB(m)². */
  bbMedian: number;
  /** BB minimal (kg) setara IMT/U −2 SD × TB(m)². */
  bbMin: number;
  /** BB maksimal (kg) setara IMT/U +1 SD × TB(m)². */
  bbMax: number;
  /** Nilai IMT acuan yang dipakai (utk transparansi/admin). */
  bmiMedian: number;
  bmiMinus2SD: number;
  bmiPlus1SD: number;
  monthsLms: number;
}

/** Tanda bintang konstanta label referensi utk fitur perkiraan BB. */
export const WHO_REFERENCE_LABEL = "WHO 2007 Female 5-19 years";

/**
 * Perkiraan BB sesuai tinggi badan utk remaja putri:
 *   BB = IMT(z acuan) × TB(m)²  — TB TIDAK dibulatkan sebelum kalkulasi.
 * Acuan diambil dari tabel WHO 2007 perempuan sesuai usia dalam bulan
 * (median = pertumbuhan tengah; rentang = −2 SD s.d. +1 SD, batas
 * kategori IMT/U WHO). Null bila referensi tidak tersedia.
 */
export function estimateWeightForHeight(heightCm: number, monthsLms: number): WeightEstimate | null {
  const ref = getWHOFemaleBMIReference(monthsLms);
  if (!ref) return null;
  const tbM = heightCm / 100; // tidak dibulatkan — pembulatan hanya di tampilan
  const tb2 = tbM * tbM;
  return {
    bbMedian: ref.bmiMedian * tb2,
    bbMin: ref.bmiMinus2SD * tb2,
    bbMax: ref.bmiPlus1SD * tb2,
    bmiMedian: ref.bmiMedian,
    bmiMinus2SD: ref.bmiMinus2SD,
    bmiPlus1SD: ref.bmiPlus1SD,
    monthsLms,
  };
}

// ---------------- Interpretasi ramah remaja ----------------

const TB_TEXT: Record<string, { title: string; body: string; advice: string }> = {
  Normal: {
    title: "Tinggi badanmu sesuai usia — keren!",
    body: "Pertumbuhan tinggimu berjalan sebagaimana mestinya untuk usiamu. Terus asup gizi seimbang, cukup tidur, dan tetap aktif bergerak agar pertumbuhanmu tetap lancar.",
    advice: "Pertahankan pola makan bergizi seimbang (karbohidrat, protein, sayur, buah), tidur 8–9 jam per hari, dan rajin berolahraga.",
  },
  Pendek: {
    title: "Tinggi badanmu sedikit di bawah rata-rata usiamu",
    body: "Tinggimu masih bisa mengejar ketinggalan jika kebutuhan gizimu terpenuhi. Kondisi ini sering terkait asupan protein/kalsium yang kurang atau kebutuhan energi yang tidak tercukupi.",
    advice: "Perbanyak protein (telur, ikan, ayam, tahu, tempe) dan kalsium (susu, keju), sarapan yang cukup, dan minta pendamping program memantau pertumbuhanmu secara berkala.",
  },
  "Sangat Pendek": {
    title: "Tinggi badanmu jauh di bawah usiamu (perlu perhatian)",
    body: "Kondisi ini disebut stunting berat. Tubuh mungkin kekurangan gizi dalam jangka panjang. Kabar baiknya, usia remaja masih masa pertumbuhan — pendampingan gizi sangat membantu.",
    advice: "Segera konsultasikan ke posyandu/puskesmas atau pendamping program untuk pemeriksaan lebih lanjut dan bantuan gizi yang tepat.",
  },
};

const IMT_TEXT: Record<string, { title: string; body: string; advice: string }> = {
  Normal: {
    title: "Berat badanmu proporsional dengan tinggimu — mantap!",
    body: "Komposisi berat dan tinggi badanmu berada pada rentang sehat untuk usiamu. Ini tanda asupan dan penggunaan energimu seimbang.",
    advice: "Pertahankan makan bergizi seimbang, batasi jajanan tinggi gula, dan tetap aktif bergerak minimal 60 menit sehari.",
  },
  Kurus: {
    title: "Berat badanmu kurang dibanding tinggimu",
    body: "Tubuhmu sedang kekurangan energi/nutrisi. Bila dibiarkan, daya tahan tubuh bisa menurun dan kamu mudah lelah saat belajar atau beraktivitas.",
    advice: "Tambah porsi dan frekuensi makan (3 kali makan utama + 2 snack bergizi), pilih makanan padat gizi, dan pantau berat badanmu tiap bulan.",
  },
  "Sangat Kurus": {
    title: "Berat badanmu sangat kurang (perlu perhatian segera)",
    body: "Kondisi ini menandakan kekurangan gizi berat yang berisiko menurunkan imun tubuh dan konsentrasi belajarmu. Jangan ditunda — minta bantuan tenaga kesehatan.",
    advice: "Segera periksakan diri ke puskesmas/pendamping program untuk evaluasi kesehatan dan program pemulihan gizi.",
  },
  "Gizi Lebih": {
    title: "Berat badanmu sedikit di atas rentang sehat",
    body: "Beratmu mulai melebihi proporsi tinggi badanmu. Belum obesitas, tapi ini momen yang tepat untuk menyeimbangkan kembali makan dan gerakmu.",
    advice: "Kurangi minuman manis dan gorengan, perbanyak sayur & buah, dan ajak teman berolahraga bersama 60 menit per hari.",
  },
  Obesitas: {
    title: "Berat badanmu melebihi batas obesitas (perlu perhatian)",
    body: "Kelebihan berat badan yang besar dapat memengaruhi jantung, sendi, dan semangat belajarmu. Kamu tidak sendiri — pendamping program bisa bantu susun rencana yang menyenangkan.",
    advice: "Konsultasikan ke tenaga kesehatan/pendamping program untuk pola makan & aktivitas fisik yang aman dan berkelanjutan.",
  },
};

/** Hitung lengkap: usia, IMT, TB/U, IMT/U, interpretasi & rekomendasi. */
export function assess(input: AssessmentInput): AssessmentResult | { error: string } {
  const { sex, dobISO, checkISO, weightKg, heightCm } = input;

  if (!(weightKg >= 2.5 && weightKg <= 250)) return { error: "Berat badan harus antara 2,5–250 kg. Periksa kembali angkanya ya." };
  if (!(heightCm >= 50 && heightCm <= 250)) return { error: "Tinggi badan harus antara 50–250 cm. Periksa kembali angkanya ya." };

  const age = computeDetailedAge(dobISO, checkISO);
  if (!age) return { error: "Tanggal pemeriksaan tidak boleh sebelum tanggal lahir." };

  if (age.monthsLms < MIN_MONTH_LMS) {
    return { error: "Referensi WHO AnthroPlus digunakan untuk usia 5–19 tahun. Usiamu masih di bawah 5 tahun — minta bantuan orang tua/posyandu untuk pengukuran." };
  }
  if (age.monthsLms > MAX_MONTH_LMS) {
    return { error: "Referensi WHO AnthroPlus digunakan untuk usia 5–19 tahun. Usiamu sudah melewati 19 tahun." };
  }

  const heightM = heightCm / 100;
  const imt = weightKg / (heightM * heightM);
  if (!(imt >= 6 && imt <= 55)) {
    return { error: "Kombinasi berat & tinggi badan tidak masuk akal untuk remaja. Periksa kembali angkanya (perhatikan satuan: kg dan cm)." };
  }

  // v3: usia eksak + interpolasi LMS (identik WHO AnthroPlus)
  const monthsExact = age.totalDays / DAYS_PER_MONTH_LMS;
  const tbLms = lmsLookupExact(heightTable(sex), monthsExact);
  const bmiLms = lmsLookupExact(bmiTable(sex), monthsExact);
  const tbURaw = zScoreExact(heightTable(sex), monthsExact, heightCm);
  const imtURaw = zScoreExact(bmiTable(sex), monthsExact, imt);
  const tbU = classifyTbU(tbURaw);
  const imtU = classifyImtU(imtURaw);

  const tb = TB_TEXT[tbU.status];
  const imtTxt = IMT_TEXT[imtU.status];

  const interpretation = [
    `${COLOR_EMOJI[tbU.color]} Tinggi Badan menurut Umur (TB/U): ${tbU.status} — ${tb.title} ${tb.body}`,
    "",
    `${COLOR_EMOJI[imtU.color]} Indeks Massa Tubuh menurut Umur (IMT/U): ${imtU.status} — ${imtTxt.title} ${imtTxt.body}`,
  ].join("\n");

  const recommendation = [
    `Saran untukmu:`,
    `• TB/U — ${tb.advice}`,
    `• IMT/U — ${imtTxt.advice}`,
    ``,
    `Catatan: hasil ini adalah skrining awal, bukan diagnosis. Diskusikan hasilnya dengan petugas kesehatan atau pendamping program FE-ZONE.`,
  ].join("\n");

  return {
    age,
    imt,
    tbU,
    imtU,
    interpretation,
    recommendation,
    debug: {
      version: CALCULATION_VERSION,
      sex,
      dobISO,
      checkISO,
      totalDays: age.totalDays,
      monthsLmsExact: Math.round((age.totalDays / DAYS_PER_MONTH_LMS) * 1e6) / 1e6,
      monthsLms: age.monthsLms,
      bmiRaw: imt,
      tbU_L: tbLms[0],
      tbU_M: tbLms[1],
      tbU_S: tbLms[2],
      imtU_L: bmiLms[0],
      imtU_M: bmiLms[1],
      imtU_S: bmiLms[2],
      tbURaw,
      imtURaw,
    },
  };
}
