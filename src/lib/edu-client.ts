"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { EDUKASI, type EduCategory } from "@/lib/content-edukasi";

// ------------------------------------------------------------
// Konten edukasi dinamis (PAKET C — Editor Konten Admin)
//
// Analogi: konten bawaan di file itu seperti "buku cetakan"
// yang selalu ada di rak. Kalau admin pernah menyimpan hasil
// editan di database, versi database itu yang dipakai (seperti
// "edisi revisi"). Kalau database kosong / internet gagal /
// server bermasalah → otomatis kembali ke buku cetakan.
// Jadi Pojok Edukasi TIDAK PERNAH bisa kosong karena salah edit.
// ------------------------------------------------------------

interface EduState {
  override: EduCategory[] | null; // hasil editan admin dari database
  loaded: boolean;
  load: () => Promise<void>; // ambil sekali saja (cache)
  reload: () => Promise<void>; // paksa ambil ulang (dipakai setelah admin simpan)
}

export const useEduStore = create<EduState>((set, get) => ({
  override: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    await get().reload();
  },
  reload: async () => {
    try {
      const res = await fetch("/api/content/edukasi", { cache: "no-store" });
      if (res.ok) {
        const d = (await res.json()) as { categories?: EduCategory[] | null };
        if (Array.isArray(d.categories) && d.categories.length > 0) {
          set({ override: d.categories, loaded: true });
          return;
        }
      }
    } catch {
      // offline / server bermasalah → diam-diam pakai bawaan
    }
    set({ override: null, loaded: true });
  },
}));

// Hook untuk komponen: selalu mengembalikan daftar kategori yang
// SIAP PAKAI (versi database kalau ada, kalau tidak konten bawaan).
export function useEdu(): EduCategory[] {
  const override = useEduStore((s) => s.override);
  const loaded = useEduStore((s) => s.loaded);
  const load = useEduStore((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  return override && override.length > 0 ? override : EDUKASI;
}

// Dipanggil admin setelah SIMPAN / RESET agar perubahan langsung
// tampil tanpa perlu refresh halaman.
export async function invalidateEdu(): Promise<void> {
  await useEduStore.getState().reload();
}
