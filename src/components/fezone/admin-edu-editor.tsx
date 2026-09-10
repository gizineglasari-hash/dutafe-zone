"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { invalidateEdu } from "@/lib/edu-client";
import type { EduCategory } from "@/lib/content-edukasi";
import {
  ArrowLeft, BookOpen, CheckCircle2, Loader2, Plus, RotateCcw, Save, Trash2,
} from "lucide-react";

// ============================================================
// Editor Konten Pojok Edukasi (PAKET C)
// Admin bisa mengubah teks materi edukasi TANPA hubungi
// programmer: judul, ikon, kartu materi, poin-poin, dan tips.
// "Reset ke Bawaan" mengembalikan teks asli kapan saja.
// ============================================================

const TONE_OPTIONS = [
  { v: "rose", label: "🌹 Merah muda" },
  { v: "teal", label: "🌊 Toska" },
  { v: "amber", label: "🌅 Kuning" },
  { v: "green", label: "🌿 Hijau" },
  { v: "violet", label: "💜 Ungu" },
  { v: "cyan", label: "💙 Biru" },
];

interface Row extends EduCategory {
  edited: boolean; // true = ada editan tersimpan di database
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export default function AdminEduEditor() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<EduCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/edukasi", { cache: "no-store" });
      const d = await res.json();
      const editedKeys: string[] = Array.isArray(d.editedKeys) ? d.editedKeys : [];
      const cats: EduCategory[] = Array.isArray(d.categories) ? d.categories : [];
      setRows(cats.map((c) => ({ ...c, edited: editedKeys.includes(c.key) })));
    } catch {
      toast({ title: "Gagal memuat konten", description: "Coba lagi dengan menekan tombol Muat Ulang." });
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/edukasi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editing.key, data: editing }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: "✅ Konten tersimpan", description: "Perubahan langsung tampil di aplikasi peserta & landing page." });
        setEditing(null);
        await invalidateEdu();
        await load();
      } else {
        toast({ title: "Gagal menyimpan", description: d.message || "Periksa kembali isian, lalu coba lagi." });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Internet atau server sedang tidak bisa dihubungi. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  async function reset(row: Row) {
    if (!window.confirm(`Kembalikan kategori "${row.title}" ke teks bawaan? Editan yang tersimpan akan dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/edukasi?key=${encodeURIComponent(row.key)}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "↩️ Kembali ke bawaan", description: `Kategori "${row.title}" sudah memakai teks asli.` });
        await invalidateEdu();
        await load();
      } else {
        toast({ title: "Gagal reset", description: "Coba lagi beberapa saat." });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Coba lagi beberapa saat." });
    }
  }

  // ---- manipulasi kartu di dalam form edit ----
  function patchCard(idx: number, patch: Partial<{ icon: string; title: string; tone: string; pointsText: string }>) {
    setEditing((cur) => {
      if (!cur) return cur;
      const cards = cur.cards.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c } as EduCategory["cards"][number] & { pointsText?: string };
        if (patch.icon !== undefined) next.icon = patch.icon;
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.tone !== undefined) next.tone = patch.tone as EduCategory["cards"][number]["tone"];
        if (patch.pointsText !== undefined) {
          // satu baris = satu poin (gampang dipahami admin)
          (next as { points?: string[] }).points = patch.pointsText.split("\n");
          next.pointsText = patch.pointsText;
        }
        return next as (typeof cur.cards)[number];
      });
      return { ...cur, cards };
    });
  }

  function addCard() {
    setEditing((cur) => {
      if (!cur) return cur;
      if (cur.cards.length >= 12) {
        toast({ title: "Maksimal 12 kartu per kategori" });
        return cur;
      }
      return {
        ...cur,
        cards: [...cur.cards, { icon: "✨", title: "Kartu Baru", tone: "rose", points: ["Tulis poin pertama di sini"] } as (typeof cur.cards)[number]],
      };
    });
  }

  function removeCard(idx: number) {
    setEditing((cur) => (cur ? { ...cur, cards: cur.cards.filter((_, i) => i !== idx) } : cur));
  }

  function pointsTextOf(card: EduCategory["cards"][number] & { pointsText?: string }): string {
    if (typeof card.pointsText === "string") return card.pointsText;
    return card.points.join("\n");
  }

  // ============================================================
  // TAMPILAN FORM EDIT
  // ============================================================
  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(null)}
            className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali (belum simpan)
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-xl bg-amber-300 font-extrabold text-[#3d1526] hover:bg-amber-200">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>

        <div className="rounded-3xl border-2 border-amber-300/60 bg-white p-5">
          <p className="font-display text-lg font-extrabold text-[#3d1526]">Kategori</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs font-bold text-[#3d1526]/70">Ikon (emoji)</Label>
              <Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} maxLength={8} className="mt-1 text-center text-xl" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-[#3d1526]/70">Judul kategori</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={80} className="mt-1 font-bold" />
            </div>
            <div>
              <Label className="text-xs font-bold text-[#3d1526]/70">Key (tetap)</Label>
              <Input value={editing.key} disabled className="mt-1 font-mono text-xs text-[#3d1526]/40" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs font-bold text-[#3d1526]/70">Subjudul (satu kalimat di bawah judul)</Label>
            <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} maxLength={160} className="mt-1" />
          </div>
          <div className="mt-3">
            <Label className="text-xs font-bold text-[#3d1526]/70">Tahukah kamu? (tips di bagian bawah kategori)</Label>
            <Textarea value={editing.tip} onChange={(e) => setEditing({ ...editing, tip: e.target.value })} maxLength={320} rows={2} className="mt-1" />
          </div>
        </div>

        <div className="space-y-4">
          {editing.cards.map((card, i) => (
            <div key={i} className="rounded-3xl border-2 border-[#3d1526]/15 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-extrabold text-[#3d1526]">Kartu #{i + 1}</p>
                <Button variant="ghost" size="sm" onClick={() => removeCard(i)} className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="h-4 w-4" /> Hapus kartu
                </Button>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-6">
                <div>
                  <Label className="text-xs font-bold text-[#3d1526]/70">Ikon</Label>
                  <Input value={card.icon} onChange={(e) => patchCard(i, { icon: e.target.value })} maxLength={8} className="mt-1 text-center text-xl" />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs font-bold text-[#3d1526]/70">Judul kartu</Label>
                  <Input value={card.title} onChange={(e) => patchCard(i, { title: e.target.value })} maxLength={80} className="mt-1 font-bold" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold text-[#3d1526]/70">Warna</Label>
                  <select
                    value={card.tone ?? "rose"}
                    onChange={(e) => patchCard(i, { tone: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    {TONE_OPTIONS.map((t) => (
                      <option key={t.v} value={t.v}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs font-bold text-[#3d1526]/70">Poin-poin (satu baris = satu poin, maks 12 baris)</Label>
                <Textarea
                  value={pointsTextOf(card)}
                  onChange={(e) => patchCard(i, { pointsText: e.target.value })}
                  rows={4}
                  maxLength={2900}
                  className="mt-1 leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border-2 border-dashed border-[#3d1526]/20 bg-white/60 p-4">
          <p className="text-xs font-semibold text-[#3d1526]/60">
            Jumlah kartu sekarang: {editing.cards.length} (maks 12). Poin kosong otomatis dibuang saat disimpan.
          </p>
          <Button variant="outline" onClick={addCard} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
            <Plus className="h-4 w-4" /> Tambah Kartu
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // TAMPILAN DAFTAR KATEGORI
  // ============================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-xl">📚</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Editor Edukasi</h1>
            <p className="text-xs font-semibold text-[#3d1526]/50">Ubah isi Pojok Edukasi tanpa coding — perubahan langsung tampil di website</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
          <RotateCcw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-4 text-xs font-semibold leading-relaxed text-[#3d1526]/75">
        <p className="mb-1 font-extrabold text-[#3d1526]">📖 Cara pakai (mudah, tanpa coding):</p>
        <p>1. Tekan <b>Edit</b> pada kategori yang mau diubah → ubah teksnya seperti mengisi formulir biasa.</p>
        <p>2. Tekan <b>Simpan Perubahan</b> → peserta &amp; halaman depan langsung menampilkan versi baru.</p>
        <p>3. Salah ubah? Tekan <b>Reset ke Bawaan</b> → teks asli kembali seperti semula. Website tidak akan pernah rusak.</p>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center rounded-3xl border-2 border-dashed border-[#3d1526]/15 bg-white p-10 text-[#3d1526]/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat konten...
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-start gap-3 rounded-3xl border-2 border-[#3d1526]/10 bg-white p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#3d1526]/10 bg-amber-50 text-2xl">{row.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-display text-sm font-extrabold text-[#3d1526]">{row.title}</p>
                  {row.edited ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">✏️ sudah diedit</span>
                  ) : (
                    <span className="rounded-full bg-[#3d1526]/5 px-2 py-0.5 text-[10px] font-extrabold text-[#3d1526]/50">bawaan</span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-[#3d1526]/55">{row.subtitle}</p>
                <p className="mt-0.5 text-[10px] font-bold text-[#3d1526]/40">{row.cards.length} kartu materi</p>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" onClick={() => setEditing(clone(row))} className="h-8 rounded-lg bg-[#3d1526] px-3 text-[11px] font-extrabold text-white hover:bg-[#3d1526]/85">
                    <BookOpen className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  {row.edited && (
                    <Button variant="outline" size="sm" onClick={() => reset(row)} className="h-8 rounded-lg border-2 border-rose-200 px-3 text-[11px] font-extrabold text-rose-600 hover:bg-rose-50">
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset ke Bawaan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Yang bisa diedit di paket ini: 7 kategori Pojok Edukasi. Soal quiz &amp; misi masih dikelola programmer supaya skor dan XP tetap aman.</p>
      </div>
    </div>
  );
}
