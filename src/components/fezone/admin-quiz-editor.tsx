"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { invalidateQuiz } from "@/lib/quiz-client";
import type { MythItem, QuizQuestion } from "@/lib/content-quizzes";
import {
  ArrowLeft, FileQuestion, Loader2, Plus, RotateCcw, Save, Trash2,
} from "lucide-react";

// ============================================================
// Editor Soal / Bank Kuis (PAKET C)
// Admin bisa mengubah soal Pre-Test, Post-Test, kuis misi,
// pernyataan Mitos/Fakta, dan Final Quiz — tanpa coding.
// Penilaian TETAP dilakukan server, jadi tidak bisa diakali.
// ============================================================

const MAX_QUESTIONS = 30;
const MAX_OPTIONS = 6;

type BankData = QuizQuestion[] | { SMP: QuizQuestion[]; SMA: QuizQuestion[] } | MythItem[];

const BANK_DEFS: { key: string; label: string; kind: "list" | "level" | "myths"; icon: string; desc: string }[] = [
  { key: "PRETEST", label: "Pre-Test", kind: "list", icon: "🧪", desc: "Soal pengukuran awal peserta" },
  { key: "POSTTEST", label: "Post-Test", kind: "list", icon: "🎯", desc: "Soal peningkatan pengetahuan" },
  { key: "M1", label: "Kuis Mission 1 (Anemia)", kind: "level", icon: "🩸", desc: "Soal misi pertama — ada versi SMP & SMA" },
  { key: "M2", label: "Kuis Mission TTD", kind: "level", icon: "💊", desc: "Soal Mission 3 — ada versi SMP & SMA" },
  { key: "MITOS", label: "Mitos atau Fakta", kind: "myths", icon: "🧠", desc: "Pernyataan MITOS/FAKTA (Mission 6)" },
  { key: "FINAL_QUIZ", label: "Final Quiz Duta", kind: "list", icon: "👑", desc: "Tahap 2 Duta Challenge" },
];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export default function AdminQuizEditor() {
  const [banks, setBanks] = useState<Record<string, BankData> | null>(null);
  const [editedKeys, setEditedKeys] = useState<string[]>([]);
  const [sel, setSel] = useState<string>("PRETEST");
  const [level, setLevel] = useState<"SMP" | "SMA">("SMP");
  const [draft, setDraft] = useState<QuizQuestion[] | MythItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  const def = BANK_DEFS.find((b) => b.key === sel)!;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quiz", { cache: "no-store" });
      const d = await res.json();
      setBanks((d.banks ?? {}) as Record<string, BankData>);
      setEditedKeys(Array.isArray(d.editedKeys) ? d.editedKeys : []);
      return d.banks as Record<string, BankData> | undefined;
    } catch {
      toast({ title: "Gagal memuat soal", description: "Coba lagi dengan menekan tombol Muat Ulang." });
      setBanks({});
      return undefined;
    }
  }, []);

  // Muat ulang draft saat bank/level yang dipilih berubah
  useEffect(() => {
    if (!banks) return;
    const data = banks[sel];
    if (def.kind === "level") {
      const lv = (data as { SMP: QuizQuestion[]; SMA: QuizQuestion[] }) ?? { SMP: [], SMA: [] };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(clone(lv[level] ?? []));
    } else if (def.kind === "myths") {
      setDraft(clone((data as MythItem[]) ?? []));
    } else {
      setDraft(clone((data as QuizQuestion[]) ?? []));
    }
  }, [sel, level, banks]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      let data: unknown;
      if (def.kind === "level") {
        // Simpan dua-duanya: level yang diedit pakai draft, level satuan tetap
        const cur = (banks?.[sel] ?? { SMP: [], SMA: [] }) as { SMP: QuizQuestion[]; SMA: QuizQuestion[] };
        data = { levels: { SMP: level === "SMP" ? draft : cur.SMP, SMA: level === "SMA" ? draft : cur.SMA } };
      } else if (def.kind === "myths") {
        data = { myths: draft };
      } else {
        data = { questions: draft };
      }
      const res = await fetch("/api/admin/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sel, data }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: "✅ Soal tersimpan", description: "Peserta akan mengerjakan soal versi baru — penilaian tetap oleh server." });
        await invalidateQuiz();
        const fresh = await load();
        if (fresh) {
          // segarkan draft dari data tersimpan
          if (def.kind === "level") setDraft(clone(((fresh[sel] as { SMP: QuizQuestion[]; SMA: QuizQuestion[] }) ?? { SMP: [], SMA: [] })[level] ?? []));
          else setDraft(clone((fresh[sel] as QuizQuestion[] | MythItem[]) ?? []));
        }
      } else {
        toast({ title: "Gagal menyimpan", description: d.message || "Periksa kembali isian soal, lalu coba lagi." });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Internet atau server sedang tidak bisa dihubungi. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm(`Kembalikan "${def.label}" ke soal bawaan? Editan yang tersimpan akan dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/quiz?key=${encodeURIComponent(sel)}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "↩️ Kembali ke bawaan", description: `"${def.label}" sudah memakai soal asli.` });
        await invalidateQuiz();
        const fresh = await load();
        if (fresh) {
          if (def.kind === "level") setDraft(clone(((fresh[sel] as { SMP: QuizQuestion[]; SMA: QuizQuestion[] }) ?? { SMP: [], SMA: [] })[level] ?? []));
          else setDraft(clone((fresh[sel] as QuizQuestion[] | MythItem[]) ?? []));
        }
      } else {
        toast({ title: "Gagal reset", description: "Coba lagi beberapa saat." });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Coba lagi beberapa saat." });
    }
  }

  // ---- manipulasi soal pilihan ganda ----
  function patchQ(qi: number, patch: Partial<QuizQuestion>) {
    setDraft((cur) => (cur ? (cur as QuizQuestion[]).map((q, i) => (i === qi ? { ...q, ...patch } : q)) : cur));
  }
  function setOption(qi: number, oi: number, text: string) {
    setDraft((cur) =>
      cur ? (cur as QuizQuestion[]).map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? text : o)) } : q)) : cur
    );
  }
  function setAnswer(qi: number, oi: number) {
    setDraft((cur) => (cur ? (cur as QuizQuestion[]).map((q, i) => (i === qi ? { ...q, answer: oi } : q)) : cur));
  }
  function addOption(qi: number) {
    setDraft((cur) =>
      cur
        ? (cur as QuizQuestion[]).map((q, i) =>
            i === qi && q.options.length < MAX_OPTIONS ? { ...q, options: [...q.options, `Pilihan ${q.options.length + 1}`] } : q
          )
        : cur
    );
  }
  function removeOption(qi: number, oi: number) {
    setDraft((cur) =>
      cur
        ? (cur as QuizQuestion[]).map((q, i) => {
            if (i !== qi || q.options.length <= 2) return q;
            const options = q.options.filter((_, j) => j !== oi);
            const answer = q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer;
            return { ...q, options, answer };
          })
        : cur
    );
  }
  function addQuestion() {
    setDraft((cur) => {
      if (!cur) return cur;
      if (cur.length >= MAX_QUESTIONS) {
        toast({ title: `Maksimal ${MAX_QUESTIONS} soal per bank` });
        return cur;
      }
      return [
        ...(cur as QuizQuestion[]),
        { q: "Tulis pertanyaan di sini", options: ["Jawaban benar", "Jawaban salah"], answer: 0, explain: "" } as QuizQuestion,
      ];
    });
  }
  function removeQuestion(qi: number) {
    setDraft((cur) => (cur ? (cur as QuizQuestion[]).filter((_, i) => i !== qi) : cur));
  }

  // ---- manipulasi pernyataan mitos/fakta ----
  function patchM(mi: number, patch: Partial<MythItem>) {
    setDraft((cur) => (cur ? (cur as MythItem[]).map((m, i) => (i === mi ? { ...m, ...patch } : m)) : cur));
  }
  function addMyth() {
    setDraft((cur) => {
      if (!cur) return cur;
      if (cur.length >= MAX_QUESTIONS) {
        toast({ title: `Maksimal ${MAX_QUESTIONS} pernyataan` });
        return cur;
      }
      return [...(cur as MythItem[]), { statement: "Tulis pernyataan di sini", isFact: false, explain: "" } as MythItem];
    });
  }
  function removeMyth(mi: number) {
    setDraft((cur) => (cur ? (cur as MythItem[]).filter((_, i) => i !== mi) : cur));
  }

  // Validasi ringan sebelum simpan (server memvalidasi ulang)
  function validate(): string | null {
    if (!draft || draft.length === 0) return "Minimal harus ada 1 soal/pernyataan.";
    if (def.kind === "list" || def.kind === "level") {
      for (let i = 0; i < (draft as QuizQuestion[]).length; i++) {
        const q = (draft as QuizQuestion[])[i];
        if (!q.q.trim()) return `Soal #${i + 1}: pertanyaan masih kosong.`;
        if (q.options.filter((o) => o.trim()).length < 2) return `Soal #${i + 1}: minimal 2 pilihan jawaban yang terisi.`;
        if (q.answer < 0 || q.answer >= q.options.length) return `Soal #${i + 1}: pilih dulu jawaban yang benar.`;
      }
    } else {
      for (let i = 0; i < (draft as MythItem[]).length; i++) {
        if (!(draft as MythItem[])[i].statement.trim()) return `Pernyataan #${i + 1}: masih kosong.`;
      }
    }
    return null;
  }

  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  // ============================================================
  // TAMPILAN EDITOR
  // ============================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-xl">📝</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Editor Soal</h1>
            <p className="text-xs font-semibold text-[#3d1526]/50">Ubah soal Pre/Post-Test, kuis misi, Mitos/Fakta & Final Quiz tanpa coding</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
          <RotateCcw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-4 text-xs font-semibold leading-relaxed text-[#3d1526]/75">
        <p className="mb-1 font-extrabold text-[#3d1526]">📖 Cara pakai:</p>
        <p>1. Pilih bank soal di bawah → ubah teks soal, pilihan, dan tandai jawaban benar (klik lingkaran di sebelah pilihan yang benar).</p>
        <p>2. Tekan <b>Simpan Perubahan</b> → peserta akan mengerjakan soal versi baru. Nilai &amp; XP tetap dihitung server (aman dari kecurangan).</p>
        <p>3. Salah ubah? Tekan <b>Reset ke Bawaan</b> → soal asli kembali. Catatan: peserta yang SUDAH mengerjakan tetap menyimpan nilai lamanya.</p>
      </div>

      {/* Pilih bank */}
      <div className="flex flex-wrap gap-1.5">
        {BANK_DEFS.map((b) => (
          <button
            key={b.key}
            onClick={() => setSel(b.key)}
            className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-extrabold transition ${
              sel === b.key ? "border-[#3d1526] bg-amber-300 text-[#3d1526]" : "border-[#3d1526]/15 text-[#3d1526]/60 hover:border-amber-300"
            }`}
          >
            {b.icon} {b.label}
            {editedKeys.includes(b.key) && <span className="ml-1 text-emerald-600">✓</span>}
          </button>
        ))}
      </div>

      {/* Sub-pilih level untuk bank SMP/SMA */}
      {def.kind === "level" && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#3d1526]/10 bg-white p-3">
          <p className="text-xs font-extrabold text-[#3d1526]/60">Versi jenjang:</p>
          {(["SMP", "SMA"] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition ${
                level === lv ? "border-[#3d1526] bg-[#3d1526] text-white" : "border-[#3d1526]/20 text-[#3d1526]/60 hover:border-[#3d1526]/40"
              }`}
            >
              {lv === "SMP" ? "🏫 SMP" : "🎓 SMA"}
            </button>
          ))}
        </div>
      )}

      {banks === null || draft === null ? (
        <div className="flex items-center justify-center rounded-3xl border-2 border-dashed border-[#3d1526]/15 bg-white p-10 text-[#3d1526]/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat soal...
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-lg font-extrabold text-[#3d1526]">
                {def.icon} {def.label}
                {def.kind === "level" && <span className="ml-1 text-sm text-[#3d1526]/50">({level})</span>}
              </p>
              <p className="text-[11px] font-semibold text-[#3d1526]/50">
                {def.desc} · {draft.length} {def.kind === "myths" ? "pernyataan" : "soal"}
                {editedKeys.includes(sel) && <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">✏️ sudah diedit</span>}
              </p>
            </div>
            <div className="flex gap-1.5">
              {editedKeys.includes(sel) && (
                <Button variant="outline" size="sm" onClick={reset} className="h-9 rounded-xl border-2 border-rose-200 px-3 text-[11px] font-extrabold text-rose-600 hover:bg-rose-50">
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset ke Bawaan
                </Button>
              )}
              <Button onClick={save} disabled={saving} className="h-9 rounded-xl bg-amber-300 px-4 text-xs font-extrabold text-[#3d1526] hover:bg-amber-200">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>

          {def.kind === "myths" ? (
            <div className="space-y-3">
              {(draft as MythItem[]).map((m, mi) => (
                <div key={mi} className="rounded-3xl border-2 border-[#3d1526]/15 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-extrabold text-[#3d1526]">Pernyataan #{mi + 1}</p>
                    <Button variant="ghost" size="sm" onClick={() => removeMyth(mi)} className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  </div>
                  <Textarea value={m.statement} onChange={(e) => patchM(mi, { statement: e.target.value })} rows={2} maxLength={300} className="mt-2" placeholder="Tulis pernyataannya..." />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-[#3d1526]/60">Jawaban benar:</p>
                    <button
                      onClick={() => patchM(mi, { isFact: false })}
                      className={`rounded-xl border-2 px-3 py-1 text-xs font-extrabold transition ${m.isFact === false ? "border-rose-500 bg-rose-500 text-white" : "border-[#3d1526]/15 text-[#3d1526]/55"}`}
                    >
                      ❌ MITOS
                    </button>
                    <button
                      onClick={() => patchM(mi, { isFact: true })}
                      className={`rounded-xl border-2 px-3 py-1 text-xs font-extrabold transition ${m.isFact === true ? "border-teal-600 bg-teal-600 text-white" : "border-[#3d1526]/15 text-[#3d1526]/55"}`}
                    >
                      ✅ FAKTA
                    </button>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs font-bold text-[#3d1526]/70">Pembahasan (tampil saat peserta lulus)</Label>
                    <Textarea value={m.explain} onChange={(e) => patchM(mi, { explain: e.target.value })} rows={2} maxLength={400} className="mt-1" />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addMyth} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
                <Plus className="h-4 w-4" /> Tambah Pernyataan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(draft as QuizQuestion[]).map((q, qi) => (
                <div key={qi} className="rounded-3xl border-2 border-[#3d1526]/15 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-extrabold text-[#3d1526]">Soal #{qi + 1}</p>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" /> Hapus soal
                    </Button>
                  </div>
                  <Textarea value={q.q} onChange={(e) => patchQ(qi, { q: e.target.value })} rows={2} maxLength={300} className="mt-2 font-semibold" placeholder="Tulis pertanyaannya..." />
                  <div className="mt-3">
                    <Label className="text-xs font-bold text-[#3d1526]/70">Pilihan jawaban — klik lingkaran di pilihan yang BENAR:</Label>
                    <div className="mt-1.5 space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            onClick={() => setAnswer(qi, oi)}
                            aria-label={`Tandai pilihan ${LETTERS[oi]} sebagai jawaban benar`}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold transition ${
                              q.answer === oi ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#3d1526]/25 bg-white text-[#3d1526]/45 hover:border-emerald-400"
                            }`}
                          >
                            {LETTERS[oi]}
                          </button>
                          <Input value={opt} onChange={(e) => setOption(qi, oi, e.target.value)} maxLength={160} className="h-9" />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qi, oi)} className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Hapus pilihan">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.options.length < MAX_OPTIONS && (
                      <Button variant="ghost" size="sm" onClick={() => addOption(qi)} className="mt-1 h-7 text-[11px] font-bold text-[#3d1526]/60">
                        <Plus className="mr-1 h-3 w-3" /> Tambah pilihan
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs font-bold text-[#3d1526]/70">Pembahasan (opsional — tampil saat peserta lulus)</Label>
                    <Textarea value={q.explain} onChange={(e) => patchQ(qi, { explain: e.target.value })} rows={2} maxLength={400} className="mt-1" />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addQuestion} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
                <Plus className="h-4 w-4" /> Tambah Soal
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <FileQuestion className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Jumlah soal bebas 1–{MAX_QUESTIONS}. Batas lulus tetap nilai ≥80 dan XP tetap mengikuti aturan program. Yang belum bisa diedit di paket ini: game Iron Food Hunt & Menu Builder.
            </p>
          </div>
        </>
      )}

      {sel !== "PRETEST" && (
        <Button variant="ghost" size="sm" onClick={() => setSel("PRETEST")} className="text-[11px] font-bold text-[#3d1526]/50">
          <ArrowLeft className="mr-1 h-3 w-3" /> mulai dari bank pertama
        </Button>
      )}
    </div>
  );
}
