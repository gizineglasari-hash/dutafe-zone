import type { MythItem, QuizQuestion } from "@/lib/content-quizzes";

// ------------------------------------------------------------
// Pusat pembersihan data bank soal hasil editan admin (PAKET C).
// Dipakai oleh:
//   - /api/admin/quiz      → saat MENYIMPAN (validasi ketat)
//   - /api/participant/quiz & /api/participant/myth → saat MENILAI
//     (pemeriksaan bentuk ringan sebelum dipakai menghitung nilai)
//
// Prinsip: data yang tidak valid → buang bagian itu / pakai
// soal bawaan. Kuis tidak pernah bisa "kosong" karena salah edit.
// ------------------------------------------------------------

export const QUIZ_BANK_KEYS = ["PRETEST", "POSTTEST", "M1", "M2", "MITOS", "FINAL_QUIZ"] as const;
export type QuizBankKey = (typeof QUIZ_BANK_KEYS)[number];

export type QuizBankKind = "list" | "level" | "myths";

export function bankKind(key: string): QuizBankKind {
  if (key === "M1" || key === "M2") return "level";
  if (key === "MITOS") return "myths";
  return "list";
}

export interface ListBankData {
  v: 1;
  kind: "list";
  questions: QuizQuestion[];
}
export interface LevelBankData {
  v: 1;
  kind: "level";
  levels: { SMP: QuizQuestion[]; SMA: QuizQuestion[] };
}
export interface MythBankData {
  v: 1;
  kind: "myths";
  myths: MythItem[];
}
export type QuizBankData = ListBankData | LevelBankData | MythBankData;

export const MAX_QUESTIONS = 30;
export const MAX_OPTIONS = 6;

export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// ---- Soal pilihan ganda: { q, options[], answer, explain } ----
export function sanitizeQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const q = cleanText(o.q, 300);
  if (!q) return null;

  const options = (Array.isArray(o.options) ? o.options : [])
    .map((x) => cleanText(x, 160))
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
  if (options.length < 2) return null;

  const answer =
    typeof o.answer === "number" && Number.isInteger(o.answer) && o.answer >= 0 && o.answer < options.length
      ? o.answer
      : 0;
  const explain = cleanText(o.explain, 400);

  return { q, options, answer, explain };
}

// ---- Pernyataan Mitos/Fakta: { statement, isFact, explain } ----
export function sanitizeMyth(raw: unknown): MythItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const statement = cleanText(o.statement, 300);
  if (!statement) return null;

  return { statement, isFact: o.isFact === true, explain: cleanText(o.explain, 400) };
}

function sanitizeQuestionList(raw: unknown): QuizQuestion[] {
  return (Array.isArray(raw) ? raw : [])
    .map(sanitizeQuestion)
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, MAX_QUESTIONS);
}

// ---- Bank lengkap per key: bentuk mengikuti kind ----
// Return null = data tidak valid untuk disimpan.
export function sanitizeBankData(key: string, data: unknown): QuizBankData | null {
  if (!QUIZ_BANK_KEYS.includes(key as QuizBankKey)) return null;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const kind = bankKind(key);

  if (kind === "list") {
    const questions = sanitizeQuestionList(o.questions);
    if (questions.length === 0) return null;
    return { v: 1, kind, questions };
  }

  if (kind === "level") {
    const SMP = sanitizeQuestionList((o.levels as Record<string, unknown> | undefined)?.SMP);
    const SMA = sanitizeQuestionList((o.levels as Record<string, unknown> | undefined)?.SMA);
    if (SMP.length === 0 || SMA.length === 0) return null;
    return { v: 1, kind, levels: { SMP, SMA } };
  }

  const myths = (Array.isArray(o.myths) ? o.myths : [])
    .map(sanitizeMyth)
    .filter((m): m is MythItem => m !== null)
    .slice(0, MAX_QUESTIONS);
  if (myths.length === 0) return null;
  return { v: 1, kind, myths };
}

// ---- Pemeriksaan ringan saat MEMBACA dari database (sebelum dipakai menilai) ----
// Berbeda dari sanitize di atas: di sini kita hanya memastikan bentuknya
// layak pakai — teks TIDAK dipotong/diubah agar sama persis dengan yang
// dilihat peserta di layar.
export function parseBankData(raw: string): QuizBankData | null {
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d || typeof d !== "object") return null;

    if (d.kind === "list" && Array.isArray(d.questions) && d.questions.length > 0) {
      const ok = d.questions.every(
        (q) => q && typeof (q as QuizQuestion).q === "string" && Array.isArray((q as QuizQuestion).options) && (q as QuizQuestion).options.length >= 2
      );
      return ok ? ({ v: 1, kind: "list", questions: d.questions } as ListBankData) : null;
    }
    if (d.kind === "level" && d.levels && typeof d.levels === "object") {
      const lv = d.levels as Record<string, unknown>;
      const good = (arr: unknown) => Array.isArray(arr) && arr.length > 0;
      if (good(lv.SMP) && good(lv.SMA)) return { v: 1, kind: "level", levels: lv as unknown as LevelBankData["levels"] };
      return null;
    }
    if (d.kind === "myths" && Array.isArray(d.myths) && d.myths.length > 0) {
      const ok = d.myths.every(
        (m) => m && typeof (m as MythItem).statement === "string" && typeof (m as MythItem).isFact === "boolean"
      );
      return ok ? ({ v: 1, kind: "myths", myths: d.myths } as MythBankData) : null;
    }
    return null;
  } catch {
    return null;
  }
}
