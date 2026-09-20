"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, BadgeCheck, CalendarDays, Crown, Droplets, FileCheck2,
  GraduationCap, HeartPulse, Home, Loader2, MapPin, Pencil, Phone, Plus,
  ShieldAlert, Sparkles, Trash2, Trophy, UserRound, X,
} from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { BADGES } from "@/lib/constants";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// /dashboard-puskesmas/remaja/[id] (pembaruan 19 Tahap 3 & 4)
// Tahap 3: profil remaja untuk petugas Puskesmas. Akses
//          diverifikasi server: remaja di luar wilayah kerja
//          ditolak 403 ("Anda tidak memiliki akses untuk
//          melihat data pengguna ini."). Setiap pembukaan
//          tercatat di AuditLog.
// Tahap 4: petugas dapat MENGINPUT hasil pemeriksaan Hb di
//          halaman ini. Nama pemeriksa otomatis = petugas yang
//          login. Interpretasi otomatis (standar Kemenkes:
//          Berat <9 | Sedang 9-10,9 | Ringan 11-11,9 | Normal
//          >=12). Rekaman Puskesmas sendiri bisa diubah/hapus.
// ------------------------------------------------------------

interface HbRecord {
  id: string; checkDate: string; hbValue: number;
  method: string | null; location: string | null; examiner: string | null;
  notes: string | null; puskesmasId: string | null; bisaKelola: boolean;
}

interface DetailData {
  remaja: {
    id: string; name: string; avatar: string; profilePhotoUrl: string | null;
    age: number; educationLevel: string; school: string; schoolCity: string | null;
    schoolDistrict: string | null; schoolType: string | null; phone: string | null;
    domisiliKecamatan: string | null; domisiliKelurahan: string | null;
    nik: string | null; username: string; joinedAt: string;
    xp: number; level: number; levelName: string; levelIcon: string;
    streakWeeks: number; lastCheckIn: string | null;
    preTestScore: number | null; postTestScore: number | null;
    hbValue: number | null; hbCheckDate: string | null;
    isDutaCandidate: boolean; isDuta: boolean;
  };
  kesehatan: {
    hbRecords: HbRecord[];
    ttdCount: number; ttdTerakhir: string | null; ttdRiwayat: string[];
  };
  gamifikasi: {
    badges: { key: string; earnedAt: string }[];
    misi: { key: string; title: string; short: string; icon: string; status: string; score: number | null }[];
  };
  aktivitas: { terakhir: string | null };
}

function tgl(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// Cermin interpretasi server (standar default Kemenkes).
function klasifikasiHb(hb: number) {
  if (hb < 9) return { label: "Anemia Berat", cls: "bg-red-100 text-red-700" };
  if (hb < 11) return { label: "Anemia Sedang", cls: "bg-orange-100 text-orange-700" };
  if (hb < 12) return { label: "Anemia Ringan", cls: "bg-amber-100 text-amber-700" };
  return { label: "Normal", cls: "bg-emerald-100 text-emerald-700" };
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
      <p className="mb-3 flex items-center gap-1.5 font-display text-sm font-extrabold text-fez-ink">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

const KOSONG_FORM = { hbValue: "", checkDate: "", method: "", location: "", notes: "" };

export default function DetailRemajaPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Identitas petugas (nama pemeriksa otomatis) ----
  const [petugasNama, setPetugasNama] = useState<string>("");

  // ---- Form input/ubah Hb ----
  const [form, setForm] = useState(KOSONG_FORM);
  const [editId, setEditId] = useState<string | null>(null); // null = input baru
  const [hbBusy, setHbBusy] = useState(false);
  const [hapusId, setHapusId] = useState<string | null>(null);

  const muatDetail = useCallback(async () => {
    const r = await fetch(`/api/puskesmas/remaja/${params.id}`);
    if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Gagal memuat detail");
    setData(d);
  }, [params.id]);

  useEffect(() => {
    document.title = "Detail Remaja — Dashboard Petugas";
    trackPage("/dashboard-puskesmas/remaja");
    (async () => {
      try {
        await muatDetail();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat detail remaja");
      } finally {
        setLoading(false);
      }
    })();
    // Nama petugas untuk label "Diperiksa oleh" (otomatis, read-only)
    fetch("/api/puskesmas/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPetugasNama(d?.staff?.nama || ""))
      .catch(() => {});
  }, [muatDetail]);

  // ---- Pratinjau interpretasi langsung saat mengetik ----
  const nilaiPreview = parseFloat(form.hbValue.replace(",", "."));
  const previewValid = Number.isFinite(nilaiPreview) && nilaiPreview >= 3 && nilaiPreview <= 25;

  function resetForm() {
    setForm(KOSONG_FORM);
    setEditId(null);
  }

  function mulaiEdit(h: HbRecord) {
    setEditId(h.id);
    setForm({
      hbValue: String(h.hbValue).replace(".", ","),
      checkDate: h.checkDate.slice(0, 10),
      method: h.method || "",
      location: h.location || "",
      notes: h.notes || "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function simpanHb() {
    if (hbBusy) return;
    if (!form.hbValue.trim() || !form.checkDate) {
      toast({ title: "Lengkapi dulu", description: "Nilai Hb dan tanggal pemeriksaan wajib diisi.", variant: "destructive" });
      return;
    }
    setHbBusy(true);
    try {
      const url = editId
        ? `/api/puskesmas/remaja/${params.id}/hemoglobin/${editId}`
        : `/api/puskesmas/remaja/${params.id}/hemoglobin`;
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hbValue: form.hbValue.replace(",", "."),
          checkDate: form.checkDate,
          method: form.method || null,
          location: form.location || null,
          notes: form.notes || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          title: editId ? "✅ Rekaman diperbarui" : "✅ Hasil pemeriksaan tersimpan",
          description: `Kategori: ${d.interpretasi?.label ?? "—"} — remaja akan diberi tahu lewat notifikasi.`,
        });
        resetForm();
        await muatDetail();
      } else {
        toast({ title: "Gagal menyimpan", description: d.message || d.error || "Periksa isian, lalu coba lagi.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Internet atau server sedang tidak bisa dihubungi. Coba lagi.", variant: "destructive" });
    } finally {
      setHbBusy(false);
    }
  }

  async function hapusHb(h: HbRecord) {
    if (hapusId) return;
    if (!window.confirm(`Hapus rekaman Hb ${h.hbValue} g/dL (${tgl(h.checkDate)})? Tindakan ini tidak bisa dibatalkan.`)) return;
    setHapusId(h.id);
    try {
      const res = await fetch(`/api/puskesmas/remaja/${params.id}/hemoglobin/${h.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: "Rekaman dihapus", description: "Hb terakhir remaja otomatis disesuaikan." });
        if (editId === h.id) resetForm();
        await muatDetail();
      } else {
        toast({ title: "Gagal menghapus", description: d.error || "Coba lagi.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Koneksi bermasalah", variant: "destructive" });
    } finally {
      setHapusId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-hero-blob flex min-h-screen items-center justify-center bg-fez-cream">
        <p className="flex items-center gap-2 text-sm font-bold text-fez-ink/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat profil remaja...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-hero-blob min-h-screen bg-fez-cream px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Button
            onClick={() => { window.location.href = "/dashboard-puskesmas"; }}
            variant="outline"
            className="mb-4 rounded-xl border-2 border-fez-ink/20 bg-white font-extrabold text-fez-ink/70 hover:border-fez-teal hover:text-fez-teal"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Dashboard
          </Button>

          {error ? (
            <div className="rounded-[2rem] border-2 border-fez-ink bg-red-50 p-6 shadow-[8px_8px_0_0_#4a1d33]">
              <p className="flex items-center gap-2 font-display font-extrabold text-red-700">
                <ShieldAlert className="h-5 w-5" /> Akses ditolak
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-red-600">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Identitas */}
              <Panel icon={<UserRound className="h-4 w-4 text-fez-teal" />} title="Identitas Remaja">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-fez-ink bg-fez-cream text-3xl">
                    {data.remaja.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.remaja.profilePhotoUrl} alt={data.remaja.name} className="h-full w-full object-cover" />
                    ) : (
                      data.remaja.avatar
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold text-fez-ink">
                      {data.remaja.name}
                      {data.remaja.isDuta && <Crown className="ml-1.5 inline h-5 w-5 text-amber-500" />}
                      {!data.remaja.isDuta && data.remaja.isDutaCandidate && <BadgeCheck className="ml-1.5 inline h-5 w-5 text-sky-500" />}
                    </p>
                    <p className="text-xs font-bold text-fez-ink/50">@{data.remaja.username} · {data.remaja.age} tahun · {data.remaja.educationLevel}</p>
                    <div className="mt-2 space-y-1 text-xs font-semibold text-fez-ink/65">
                      <p className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-fez-teal" /> {data.remaja.school}{data.remaja.schoolType ? ` (${data.remaja.schoolType})` : ""}{data.remaja.schoolCity ? ` — ${data.remaja.schoolCity}` : ""}</p>
                      {data.remaja.schoolDistrict && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-fez-teal" /> Kec. {data.remaja.schoolDistrict}</p>}
                      {data.remaja.domisiliKelurahan && <p className="flex items-center gap-1.5"><Home className="h-3.5 w-3.5 text-fez-rose" /> Domisili: {data.remaja.domisiliKelurahan}, Kec. {data.remaja.domisiliKecamatan}</p>}
                      {data.remaja.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-fez-teal" /> {data.remaja.phone}</p>}
                      {data.remaja.nik && <p className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-fez-teal" /> NIK: {data.remaja.nik}</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-fez-teal/30 bg-teal-50/70 px-4 py-3 text-center">
                    <p className="text-lg">{data.remaja.levelIcon}</p>
                    <p className="font-display text-sm font-extrabold text-fez-ink">Level {data.remaja.level}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/50">{data.remaja.levelName}</p>
                    <p className="mt-1 text-xs font-extrabold text-fez-teal">{data.remaja.xp.toLocaleString("id-ID")} XP</p>
                  </div>
                </div>
              </Panel>

              {/* Form input / ubah hasil Hb (Tahap 4) */}
              <Panel icon={<Droplets className="h-4 w-4 text-rose-500" />} title={editId ? "Ubah Hasil Pemeriksaan Hb" : "Input Hasil Pemeriksaan Hb"}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] font-bold text-fez-ink/70">Nilai Hb (g/dL) *</Label>
                    <Input
                      value={form.hbValue}
                      onChange={(e) => setForm((f) => ({ ...f, hbValue: e.target.value.replace(/[^0-9.,]/g, "") }))}
                      inputMode="decimal"
                      placeholder="cth. 11,5"
                      className="mt-1 h-10 rounded-xl border-2 border-fez-ink/15"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-fez-ink/70">Tanggal pemeriksaan *</Label>
                    <Input
                      type="date"
                      value={form.checkDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setForm((f) => ({ ...f, checkDate: e.target.value }))}
                      className="mt-1 h-10 rounded-xl border-2 border-fez-ink/15"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-fez-ink/70">Metode (opsional)</Label>
                    <Input
                      value={form.method}
                      onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                      placeholder="cth. Hb meter / Autos analyzer"
                      className="mt-1 h-10 rounded-xl border-2 border-fez-ink/15"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-fez-ink/70">Lokasi (opsional)</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="cth. Di Puskesmas / di sekolah"
                      className="mt-1 h-10 rounded-xl border-2 border-fez-ink/15"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] font-bold text-fez-ink/70">Catatan (opsional)</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="cth. Remaja tampak lelah, disarankan kontrol ulang 1 bulan"
                      className="mt-1 h-10 rounded-xl border-2 border-fez-ink/15"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-fez-ink/10 bg-fez-cream/60 px-3 py-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-fez-ink/40">Diperiksa oleh (otomatis)</p>
                  <p className="text-xs font-extrabold text-fez-ink">{petugasNama || "..."}</p>
                  <p className="text-[10px] font-semibold text-fez-ink/45">— nama kamu tercatat otomatis, tidak bisa diganti</p>
                </div>
                {previewValid && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-fez-ink/15 px-3 py-2.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-fez-ink/40">Interpretasi otomatis</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${klasifikasiHb(nilaiPreview).cls}`}>
                      {klasifikasiHb(nilaiPreview).label}
                    </span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={simpanHb} disabled={hbBusy} className="h-10 rounded-xl border-2 border-fez-ink bg-rose-500 px-4 text-xs font-extrabold text-white hover:bg-rose-600">
                    {hbBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : editId ? <Pencil className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
                    {editId ? "Simpan Perubahan" : "Simpan Hasil"}
                  </Button>
                  {editId && (
                    <Button onClick={resetForm} disabled={hbBusy} variant="outline" className="h-10 rounded-xl border-2 border-fez-ink/20 px-4 text-xs font-extrabold text-fez-ink/60">
                      <X className="mr-1 h-4 w-4" /> Batal ubah
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-fez-ink/45">
                  Setiap pemeriksaan disimpan sebagai catatan baru (riwayat tidak tertimpa). Remaja otomatis menerima notifikasi hasil terbaru.
                </p>
              </Panel>

              {/* Kesehatan */}
              <Panel icon={<HeartPulse className="h-4 w-4 text-rose-500" />} title="Kesehatan — Hemoglobin & TTD">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">Hb terakhir</p>
                    {data.remaja.hbValue !== null ? (
                      <>
                        <p className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{data.remaja.hbValue.toFixed(1)} <span className="text-sm">g/dL</span></p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${klasifikasiHb(data.remaja.hbValue).cls}`}>
                          {klasifikasiHb(data.remaja.hbValue).label}
                        </span>
                        <p className="mt-1 text-[11px] font-semibold text-fez-ink/45">Diperiksa {tgl(data.remaja.hbCheckDate)}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-fez-ink/50">Belum ada data pemeriksaan Hb.</p>
                    )}
                  </div>
                  <div className="rounded-2xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
                    <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40"><Droplets className="h-3 w-3" /> Tablet Tambah Darah</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{data.kesehatan.ttdCount} <span className="text-sm">check-in</span></p>
                    <p className="mt-1 text-[11px] font-semibold text-fez-ink/45">
                      {data.kesehatan.ttdTerakhir ? `Terakhir: ${tgl(data.kesehatan.ttdTerakhir)}` : "Belum pernah check-in TTD."}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">
                    Riwayat pemeriksaan Hb ({data.kesehatan.hbRecords.length} terbaru)
                  </p>
                  {data.kesehatan.hbRecords.length === 0 ? (
                    <p className="mt-2 text-xs font-semibold italic text-fez-ink/45">Belum ada riwayat pemeriksaan Hb yang tercatat.</p>
                  ) : (
                    <div className="mt-1.5 space-y-1.5">
                      {data.kesehatan.hbRecords.map((h) => (
                        <div key={h.id} className="rounded-xl border border-fez-ink/10 bg-white px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-fez-ink/70">
                            <span><CalendarDays className="mr-1 inline h-3.5 w-3.5 text-fez-teal" />{tgl(h.checkDate)}</span>
                            <span className="font-extrabold text-fez-ink">{h.hbValue.toFixed(1)} g/dL</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${klasifikasiHb(h.hbValue).cls}`}>{klasifikasiHb(h.hbValue).label}</span>
                            <span className="text-fez-ink/45">{h.method || "—"}{h.examiner ? ` · ${h.examiner}` : ""}</span>
                            {h.bisaKelola && (
                              <span className="flex gap-1.5">
                                <button onClick={() => mulaiEdit(h)} disabled={hbBusy} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-extrabold text-sky-600 hover:bg-sky-100">
                                  <Pencil className="mr-0.5 inline h-3 w-3" /> Ubah
                                </button>
                                <button onClick={() => hapusHb(h)} disabled={hapusId === h.id} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-500 hover:bg-rose-100">
                                  {hapusId === h.id ? <Loader2 className="inline h-3 w-3 animate-spin" /> : <><Trash2 className="mr-0.5 inline h-3 w-3" /> Hapus</>}
                                </button>
                              </span>
                            )}
                          </div>
                          {(h.location || h.notes) && (
                            <p className="mt-1 text-[11px] font-semibold text-fez-ink/45">
                              {h.location ? `📍 ${h.location}` : ""}{h.location && h.notes ? " · " : ""}{h.notes ? `📝 ${h.notes}` : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>

              {/* Gamifikasi: misi + badge */}
              <Panel icon={<Trophy className="h-4 w-4 text-amber-500" />} title="Perjalanan Misi & Lencana">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {data.gamifikasi.misi.map((m) => (
                    <div key={m.key} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${m.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/70" : m.status === "STARTED" ? "border-amber-200 bg-amber-50/70" : "border-fez-ink/10 bg-white"}`}>
                      <span className="text-xs font-extrabold text-fez-ink">{m.icon} {m.short}</span>
                      <span className={`text-[10px] font-extrabold uppercase ${m.status === "COMPLETED" ? "text-emerald-600" : m.status === "STARTED" ? "text-amber-600" : "text-fez-ink/35"}`}>
                        {m.status === "COMPLETED" ? (m.score !== null ? `Lulus ${m.score}` : "Lulus") : m.status === "STARTED" ? "Berjalan" : "Terkunci"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.gamifikasi.badges.length === 0 ? (
                    <p className="text-xs font-semibold italic text-fez-ink/45">Belum memiliki lencana.</p>
                  ) : (
                    data.gamifikasi.badges.map((b) => {
                      const def = BADGES.find((x) => x.key === b.key);
                      return (
                        <span key={b.key} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-fez-ink/75">
                          {def ? `${def.icon} ${def.name}` : `🏅 ${b.key}`}
                        </span>
                      );
                    })
                  )}
                </div>
              </Panel>

              {/* Ringkasan angka lain */}
              <Panel icon={<FileCheck2 className="h-4 w-4 text-violet-500" />} title="Ringkasan Lainnya">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.preTestScore ?? "—"}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Nilai Pre-Test</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.postTestScore ?? "—"}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Nilai Post-Test</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.streakWeeks}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Streak (minggu)</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-fez-ink"><Sparkles className="h-4 w-4 text-amber-400" />{data.gamifikasi.badges.length}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Lencana</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-fez-ink/45">
                  Bergabung {tgl(data.remaja.joinedAt)} · Aktivitas terakhir {tgl(data.aktivitas.terakhir)}
                </p>
              </Panel>
            </div>
          ) : null}
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
