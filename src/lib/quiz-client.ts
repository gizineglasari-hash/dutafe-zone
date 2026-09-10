"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { MythItem, QuizQuestion } from "@/lib/content-quizzes";

// ------------------------------------------------------------
// Bank soal dinamis (PAKET C — Editor Soal)
//
// Analogi: soal bawaan di kode itu seperti "naskah ujian cetakan".
// Kalau admin pernah menyimpan editan soal di database, versi
// database itu yang dipakai ("naskah revisi"). Kalau database
// kosong / internet gagal → otomatis pakai naskah cetakan.
// Penilaian TETAP dilakukan server, jadi tidak bisa diakali.
// ------------------------------------------------------------

export interface QuizBanks {
  PRETEST?: QuizQuestion[];
  POSTTEST?: QuizQuestion[];
  FINAL_QUIZ?: QuizQuestion[];
  M1?: Record<"SMP" | "SMA", QuizQuestion[]>;
  M2?: Record<"SMP" | "SMA", QuizQuestion[]>;
  MITOS?: MythItem[];
}

interface QuizState {
  override: QuizBanks | null; // hasil editan admin dari database
  loaded: boolean;
  load: () => Promise<void>; // ambil sekali saja (cache)
  reload: () => Promise<void>; // paksa ambil ulang (setelah admin simpan)
}

export const useQuizStore = create<QuizState>((set, get) => ({
  override: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    await get().reload();
  },
  reload: async () => {
    try {
      const res = await fetch("/api/content/quiz", { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as { banks?: QuizBanks | null };
        if (d.banks && typeof d.banks === "object" && Object.keys(d.banks).length > 0) {
          set({ override: d.banks, loaded: true });
          return;
        }
      }
    } catch {
      // offline / server bermasalah → diam-diam pakai bawaan
    }
    set({ override: null, loaded: true });
  },
}));

// Hook untuk komponen: kembalikan hasil editan admin (atau {} kalau tidak ada).
// Pemakaian: banks.PRETEST ?? QUIZ_PRETEST
export function useQuizBanks(): QuizBanks {
  const override = useQuizStore((s) => s.override);
  const loaded = useQuizStore((s) => s.loaded);
  const load = useQuizStore((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  return override ?? {};
}

// Dipanggil admin setelah SIMPAN / RESET agar perubahan langsung tampil.
export async function invalidateQuiz(): Promise<void> {
  await useQuizStore.getState().reload();
}
