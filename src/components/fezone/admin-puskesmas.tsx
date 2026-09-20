"use client";

// ============================================================
// 🏥 DATA INDUK PUSKESMAS (pembaruan 19) — tab admin
// Daftar 80 UPT Puskesmas resmi Kota Bandung (seed data resmi
// Dinkes, BUKAN dummy) · statistik kelurahan terpetakan
// · pencarian · tambah/ubah/nonaktifkan · kelola wilayah kerja
// (petakan kelurahan ke Puskesmas; 1 kelurahan = 1 Puskesmas).
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, MapPin, Plus, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface KecamatanRow { id: string; nama: string; isActive: boolean; }
interface KelurahanRow {
  id: string; nama: string; kecamatanId: string; kecamatanNama: string; isActive: boolean;
  dipetakanKe: { puskesmasId: string; puskesmasNama: string } | null;
}
interface PuskesmasRow {
  id: string; nama: string; alamat: string | null; telp: string | null; isActive: boolean;
  kecamatan: { id: string; nama: string } | null;
  kelurahanCount: number; staffCount: number;
  kelurahan: string[];
}

export default function AdminPuskesmasTab() {
  const [loading, setLoading] = useState(true);
  const [kecamatan, setKecamatan] = useState<KecamatanRow[]>([]);
  const [kelurahan, setKelurahan] = useState<KelurahanRow[]>([]);
  const [puskesmas, setPuskesmas] = useState<PuskesmasRow[]>([]);
  const [q, setQ] = useState("");

  // modal tambah/ubah
  const [edit, setEdit] = useState<{ mode: "baru" | "ubah"; row?: PuskesmasRow } | null>(null);
  const [form, setForm] = useState({ nama: "", alamat: "", telp: "", kecamatanId: "" });
  const [saving, setSaving] = useState(false);

  // modal wilayah
  const [wil, setWil] = useState<PuskesmasRow | null>(null);
  const [wilQ, setWilQ] = useState("");
  const [wilPick, setWilPick] = useState("");
  const [wilBusy, setWilBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/puskesmas");
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memuat");
      setKecamatan(d.kecamatan || []);
      setKelurahan(d.kelurahan || []);
      setPuskesmas(d.puskesmas || []);
    } catch (e) {
      toast({ title: "Gagal memuat data induk", description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const terpetakan = kelurahan.filter((k) => k.dipetakanKe).length;
  const aktif = puskesmas.filter((p) => p.isActive).length;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return puskesmas;
    return puskesmas.filter((p) =>
      [p.nama, p.alamat, p.telp, p.kecamatan?.nama, ...(p.kelurahan || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [puskesmas, q]);

  const kelurahanUntukWilayah = useMemo(() => {
    const s = wilQ.trim().toLowerCase();
    return kelurahan.filter((k) => {
      const cocok = !s || k.nama.toLowerCase().includes(s) || k.kecamatanNama.toLowerCase().includes(s);
      const milikIni = k.dipetakanKe?.puskesmasId === wil?.id;
      const belumDipetakan = !k.dipetakanKe;
      // tampilkan semua yang cocok, tandai yang sudah dipetakan ke Puskesmas lain
      return cocok && (belumDipetakan || milikIni || Boolean(k.dipetakanKe));
    });
  }, [kelurahan, wilQ, wil]);

  const kelurahanDipilih = wil ? kelurahan.filter((k) => k.dipetakanKe?.puskesmasId === wil.id) : [];

  async function simpan() {
    if (!edit) return;
    if (!form.nama.trim()) { toast({ title: "Nama Puskesmas wajib diisi" }); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/puskesmas", {
        method: edit.mode === "baru" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          edit.mode === "baru"
            ? { nama: form.nama, alamat: form.alamat, telp: form.telp, kecamatanId: form.kecamatanId || null }
            : { id: edit.row!.id, nama: form.nama, alamat: form.alamat, telp: form.telp, kecamatanId: form.kecamatanId || null }
        ),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal menyimpan");
      toast({ title: edit.mode === "baru" ? "Puskesmas ditambahkan" : "Perubahan disimpan" });
      setEdit(null);
      load();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktif(p: PuskesmasRow) {
    try {
      const r = await fetch("/api/admin/puskesmas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal");
      toast({ title: p.isActive ? `${p.nama} dinonaktifkan` : `${p.nama} diaktifkan kembali` });
      load();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    }
  }

  async function petakan(kelurahanId: string, pindahkan: boolean) {
    if (!wil) return;
    setWilBusy(true);
    try {
      const r = await fetch("/api/admin/puskesmas/wilayah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puskesmasId: wil.id, kelurahanId, pindahkan }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memetakan");
      toast({ title: "Wilayah kerja diperbarui" });
      setWilPick("");
      load();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setWilBusy(false);
    }
  }

  async function tombolPetakan() {
    if (!wil || !wilPick) return;
    const k = kelurahan.find((x) => x.id === wilPick);
    if (k?.dipetakanKe && k.dipetakanKe.puskesmasId !== wil.id) {
      const yakin = window.confirm(
        `Kelurahan ${k.nama} saat ini dipetakan ke ${k.dipetakanKe.puskesmasNama}.\nPindahkan ke ${wil.nama}?`
      );
      if (!yakin) return;
      return petakan(wilPick, true);
    }
    return petakan(wilPick, false);
  }

  async function lepaskan(kelurahanId: string) {
    if (!wil) return;
    setWilBusy(true);
    try {
      const r = await fetch(`/api/admin/puskesmas/wilayah?kelurahanId=${encodeURIComponent(kelurahanId)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal melepas");
      toast({ title: "Kelurahan dilepas dari wilayah kerja" });
      load();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setWilBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">🏥 Data Induk Puskesmas</h1>
          <p className="text-xs text-[#3d1526]/60">
            Daftar resmi UPT Puskesmas Dinkes Kota Bandung (bukan data uji). Fondasi untuk akun petugas & monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526] hover:bg-rose-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Segarkan
          </Button>
          <Button
            onClick={() => { setForm({ nama: "", alamat: "", telp: "", kecamatanId: "" }); setEdit({ mode: "baru" }); }}
            className="rounded-xl bg-rose-600 font-extrabold text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" /> Tambah Puskesmas
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Puskesmas Aktif</p>
          <p className="font-display text-2xl font-extrabold text-[#3d1526]">{aktif}<span className="text-sm text-[#3d1526]/40"> / {puskesmas.length}</span></p>
        </div>
        <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Kelurahan Terpetakan</p>
          <p className="font-display text-2xl font-extrabold text-teal-600">{terpetakan}<span className="text-sm text-[#3d1526]/40"> / {kelurahan.length}</span></p>
        </div>
        <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Kecamatan</p>
          <p className="font-display text-2xl font-extrabold text-[#3d1526]">{kecamatan.length}</p>
        </div>
        <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Belum Terpetakan</p>
          <p className="font-display text-2xl font-extrabold text-amber-600">{kelurahan.length - terpetakan}</p>
        </div>
      </div>

      {/* Pencarian + tabel */}
      <div className="rounded-2xl border border-[#3d1526]/10 bg-white">
        <div className="border-b border-[#3d1526]/10 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d1526]/40" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama Puskesmas, alamat, kecamatan, atau kelurahan…"
              className="rounded-xl border-[#3d1526]/15 pl-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-[#3d1526]/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data induk…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b-2 border-[#3d1526]/10 bg-[#faf0e8]">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-extrabold [&>th]:uppercase [&>th]:text-[10px] [&>th]:text-[#3d1526]/50">
                  <th>Puskesmas</th><th>Kecamatan</th><th>Alamat & Telepon</th><th>Kelurahan</th><th>Petugas</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d1526]/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-rose-50/40">
                    <td className="px-3 py-2.5 font-extrabold text-[#3d1526]">🏥 {p.nama}</td>
                    <td className="px-3 py-2.5 text-[#3d1526]/70">{p.kecamatan?.nama ?? "–"}</td>
                    <td className="px-3 py-2.5 text-[#3d1526]/70">
                      {p.alamat ?? "–"}
                      {p.telp && <span className="block text-[10px] text-[#3d1526]/40">☎ {p.telp}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 font-extrabold text-teal-700">{p.kelurahanCount} kelurahan</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#3d1526]/70">{p.staffCount}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 font-extrabold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-[#3d1526]/10 text-[#3d1526]/50"}`}>
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => { setWil(p); setWilQ(""); setWilPick(""); }}
                          className="rounded-lg bg-teal-100 px-2 py-1 text-[10px] font-extrabold text-teal-700 hover:bg-teal-200"
                        >
                          <MapPin className="mr-0.5 inline h-3 w-3" /> Wilayah
                        </button>
                        <button
                          onClick={() => { setForm({ nama: p.nama, alamat: p.alamat ?? "", telp: p.telp ?? "", kecamatanId: p.kecamatan?.id ?? "" }); setEdit({ mode: "ubah", row: p }); }}
                          className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-700 hover:bg-amber-200"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => toggleAktif(p)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-extrabold ${p.isActive ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                        >
                          {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-[#3d1526]/40">Tidak ada yang cocok dengan pencarian.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Modal Tambah/Ubah ============ */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-[#3d1526]">
                {edit.mode === "baru" ? "Tambah Puskesmas" : "Ubah Puskesmas"}
              </h2>
              <button onClick={() => setEdit(null)} aria-label="Tutup"><X className="h-5 w-5 text-[#3d1526]/40" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-[#3d1526]">Nama Puskesmas *</Label>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="mis. Puskesmas Cibangkong" className="mt-1 rounded-xl border-[#3d1526]/15" />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#3d1526]">Kecamatan (lokasi)</Label>
                <select
                  value={form.kecamatanId}
                  onChange={(e) => setForm({ ...form, kecamatanId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#3d1526]/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="">– Pilih kecamatan –</option>
                  {kecamatan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold text-[#3d1526]">Alamat</Label>
                <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="mis. Jl. Cianjur" className="mt-1 rounded-xl border-[#3d1526]/15" />
              </div>
              <div>
                <Label className="text-xs font-bold text-[#3d1526]">Telepon</Label>
                <Input value={form.telp} onChange={(e) => setForm({ ...form, telp: e.target.value })} placeholder="mis. (022) 1234567" className="mt-1 rounded-xl border-[#3d1526]/15" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEdit(null)} className="rounded-xl border-[#3d1526]/15">Batal</Button>
                <Button onClick={simpan} disabled={saving} className="rounded-xl bg-rose-600 font-extrabold text-white hover:bg-rose-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                  {edit.mode === "baru" ? "Tambah" : "Simpan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Modal Wilayah Kerja ============ */}
      {wil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !wilBusy && setWil(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-[#3d1526]">🗺️ Wilayah Kerja — {wil.nama}</h2>
              <button onClick={() => setWil(null)} aria-label="Tutup"><X className="h-5 w-5 text-[#3d1526]/40" /></button>
            </div>
            <p className="mb-4 text-xs text-[#3d1526]/60">
              Satu Puskesmas bisa melayani banyak kelurahan; setiap kelurahan hanya dipetakan ke satu Puskesmas.
            </p>

            {/* daftar kelurahan milik puskesmas ini */}
            <div className="mb-4 rounded-xl border border-[#3d1526]/10 bg-[#faf5f0] p-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase text-[#3d1526]/50">Kelurahan dalam wilayah ({kelurahanDipilih.length})</p>
              {kelurahanDipilih.length === 0 ? (
                <p className="text-xs text-[#3d1526]/40">Belum ada kelurahan yang dipetakan.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {kelurahanDipilih.map((k) => (
                    <span key={k.id} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                      {k.nama} <span className="text-teal-600/60">· {k.kecamatanNama}</span>
                      <button onClick={() => lepaskan(k.id)} disabled={wilBusy} className="ml-0.5 font-extrabold text-rose-600 hover:text-rose-700" aria-label={`Lepas ${k.nama}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* tambah pemetaan */}
            <div className="rounded-xl border border-[#3d1526]/10 p-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase text-[#3d1526]/50">Tambah kelurahan</p>
              <Input value={wilQ} onChange={(e) => setWilQ(e.target.value)} placeholder="Cari kelurahan / kecamatan…" className="mb-2 rounded-xl border-[#3d1526]/15" />
              <select value={wilPick} onChange={(e) => setWilPick(e.target.value)} className="w-full rounded-xl border border-[#3d1526]/15 bg-white px-3 py-2 text-sm">
                <option value="">– Pilih kelurahan –</option>
                {kelurahanUntukWilayah.map((k) => {
                  const diLain = k.dipetakanKe && k.dipetakanKe.puskesmasId !== wil.id;
                  return (
                    <option key={k.id} value={k.id} disabled={k.dipetakanKe?.puskesmasId === wil.id}>
                      {k.nama} · Kec. {k.kecamatanNama}{diLain ? ` (sudah di ${k.dipetakanKe!.puskesmasNama})` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={tombolPetakan}
                  disabled={!wilPick || wilBusy}
                  className="rounded-xl bg-teal-600 font-extrabold text-white hover:bg-teal-700"
                >
                  {wilBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Petakan
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-[#3d1526]/40">
                Catatan: jika kelurahan sudah dipetakan ke Puskesmas lain, sistem akan menanyakan konfirmasi pemindahan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
