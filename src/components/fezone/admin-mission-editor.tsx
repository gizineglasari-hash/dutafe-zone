"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, Loader2, Pencil, Plus, Power, Star, Trash2, X,
} from "lucide-react";

// ============================================================
// Misi Buatan Admin (pembaruan 15)
// Admin membuat misi tambahan yang muncul di Mission Center
// peserta dengan tombol "Tandai Sudah Dikerjakan" (+XP sekali).
// ============================================================

interface CMission {
  id: string;
  title: string;
  icon: string;
  description: string;
  xp: number;
  active: boolean;
  createdAt: string;
  completedCount: number;
}

const ICON_PRESETS = ["⭐", "🎯", "🏆", "📚", "🩸", "💊", "🥗", "🏃", "🎨", "📢", "📝", "🤝"];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AdminMissionEditor() {
  const [missions, setMissions] = useState<CMission[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = mode buat baru
  const [icon, setIcon] = useState("⭐");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState("50");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/custom-missions", { cache: "no-store" });
      const d = await res.json();
      setMissions(Array.isArray(d.missions) ? d.missions : []);
    } catch {
      toast({ title: "Gagal memuat misi", description: "Tekan tombol Muat Ulang untuk mencoba lagi." });
      setMissions([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setIcon("⭐");
    setTitle("");
    setDescription("");
    setXp("50");
  }

  function startEdit(m: CMission) {
    setEditingId(m.id);
    setIcon(m.icon);
    setTitle(m.title);
    setDescription(m.description);
    setXp(String(m.xp));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (busy) return;
    if (!title.trim()) {
      toast({ title: "Judul misi masih kosong", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Deskripsi misi masih kosong", description: "Tulis petunjuk yang jelas untuk peserta.", variant: "destructive" });
      return;
    }
    const xpNum = parseInt(xp, 10);
    if (!Number.isFinite(xpNum) || xpNum < 0 || xpNum > 500) {
      toast({ title: "XP harus angka 0-500", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload = { id: editingId, title, description, xp: xpNum, icon };
      const res = await fetch("/api/admin/custom-missions", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: editingId ? "✅ Misi diperbarui" : "✅ Misi baru dibuat!", description: "Misi langsung tampil di Mission Center peserta yang aktif." });
        resetForm();
        await load();
      } else {
        toast({ title: "Gagal menyimpan", description: d.message || "Coba lagi.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Coba lagi beberapa saat.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: CMission) {
    try {
      const res = await fetch("/api/admin/custom-missions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, active: !m.active }),
      });
      if (res.ok) {
        toast({ title: m.active ? "Misi disembunyikan dari peserta" : "Misi ditampilkan ke peserta" });
        await load();
      }
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    }
  }

  async function remove(m: CMission) {
    if (!window.confirm(`Hapus misi "${m.title}"? Status "selesai" milik peserta untuk misi ini juga dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/custom-missions?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Misi dihapus" });
        if (editingId === m.id) resetForm();
        await load();
      }
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-200 text-xl">🧩</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Misi Buatan</h1>
            <p className="text-xs font-semibold text-[#3d1526]/50">Buat misi tambahan sendiri — langsung tampil di Mission Center peserta</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="rounded-xl border-2 border-[#3d1526] bg-white font-bold text-[#3d1526]">
          <Power className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      <div className="rounded-3xl border-2 border-violet-300/60 bg-gradient-to-br from-violet-50 to-rose-50 p-4 text-xs font-semibold leading-relaxed text-[#3d1526]/75">
        <p className="mb-1 font-extrabold text-[#3d1526]">📖 Cara pakai:</p>
        <p>1. Isi judul, petunjuk, dan hadiah XP → <b>Buat Misi</b>. Misi muncul di bagian &quot;⭐ Misi Tambahan&quot; pada Mission Center peserta.</p>
        <p>2. Peserta yang sudah mengerjakannya menekan <b>&quot;Tandai Sudah Dikerjakan&quot;</b> → dapat XP <b>hanya sekali</b> (tidak bisa diulang untuk XP ganda).</p>
        <p>3. Misi bisa dinonaktifkan (disembunyikan), diedit, atau dihapus kapan saja. Misi buatanmu TIDAK mengubah perhitungan 9 misi utama, skor Duta, dan sertifikat.</p>
      </div>

      {/* ---- Form buat/edit ---- */}
      <div className="rounded-3xl border-2 border-[#3d1526]/15 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-extrabold text-[#3d1526]">
            {editingId ? "✏️ Edit Misi" : "➕ Buat Misi Baru"}
          </p>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 text-xs font-bold text-[#3d1526]/60">
              <X className="mr-1 h-3.5 w-3.5" /> Batal edit
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-[11px] font-extrabold text-[#3d1526]/70">Ikon (emoji)</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`h-8 w-8 rounded-lg border-2 text-base transition ${icon === ic ? "border-[#3d1526] bg-amber-200" : "border-[#3d1526]/10 hover:border-amber-300"}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] font-extrabold text-[#3d1526]/70">Judul misi (maks 80 huruf)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} maxLength={80} placeholder="cth. Lomba Poster Bebas Anemia" className="mt-1 h-10 rounded-xl border-2 border-[#3d1526]/15 font-bold" />
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-[11px] font-extrabold text-[#3d1526]/70">Petunjuk untuk peserta (maks 600 huruf)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 600))}
            rows={3}
            maxLength={600}
            placeholder={"cth. Buat poster edukasi anemia, lalu kirimkan ke koordinator sekolahmu sebelum 30 Juni. Setelah itu tekan tombol di bawah."}
            className="mt-1"
          />
          <p className="mt-1 text-right text-[10px] font-bold text-[#3d1526]/35">{description.length}/600</p>
        </div>

        <div className="mt-1 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Label className="text-[11px] font-extrabold text-[#3d1526]/70">Hadiah XP (0-500)</Label>
            <Input type="number" min={0} max={500} value={xp} onChange={(e) => setXp(e.target.value)} className="mt-1 h-10 rounded-xl border-2 border-[#3d1526]/15 font-bold" />
          </div>
          <Button onClick={save} disabled={busy} className="h-10 rounded-xl bg-violet-500 px-5 text-xs font-extrabold text-white hover:bg-violet-600">
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {editingId ? "Simpan Perubahan" : "Buat Misi"}
          </Button>
        </div>
      </div>

      {/* ---- Daftar misi ---- */}
      {missions === null ? (
        <div className="flex items-center justify-center rounded-3xl border-2 border-dashed border-[#3d1526]/15 bg-white p-10 text-[#3d1526]/50">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat misi...
        </div>
      ) : missions.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[#3d1526]/15 bg-white p-10 text-center">
          <p className="text-4xl">🧩</p>
          <p className="mt-2 font-display font-extrabold text-[#3d1526]">Belum ada misi buatan</p>
          <p className="text-xs font-semibold text-[#3d1526]/50">Buat misi pertamamu dengan form di atas!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {missions.map((m) => (
            <div key={m.id} className={`rounded-2xl border-2 bg-white p-3.5 ${m.active ? "border-[#3d1526]/15" : "border-gray-200 opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#3d1526]/15 bg-amber-100 text-2xl">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold text-[#3d1526]">{m.title}</p>
                    <p className="line-clamp-2 text-[11px] font-semibold text-[#3d1526]/55">{m.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">+{m.xp} XP</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">✅ {m.completedCount} peserta selesai</span>
                      <span className="rounded-full bg-[#3d1526]/5 px-2 py-0.5 text-[#3d1526]/50">dibuat {fmtDate(m.createdAt)}</span>
                      {!m.active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-500">DIMATIKAN</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => startEdit(m)} className="h-8 rounded-lg border-2 border-[#3d1526]/15 px-2 text-[10px] font-extrabold text-[#3d1526]/70 hover:bg-amber-50">
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(m)} className="h-8 rounded-lg border-2 border-[#3d1526]/15 px-2 text-[10px] font-extrabold text-[#3d1526]/70 hover:bg-violet-50">
                    <Star className="mr-1 h-3 w-3" /> {m.active ? "Matikan" : "Aktifkan"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(m)} className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Misi yang dimatikan disembunyikan dari peserta, tapi datanya tetap aman — aktifkan lagi kapan saja.</p>
          </div>
        </div>
      )}
    </div>
  );
}
