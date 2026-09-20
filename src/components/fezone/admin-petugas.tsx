"use client";

// ============================================================
// 👥 MANAJEMEN PETUGAS PUSKESMAS (pembaruan 19 Tahap 2) — tab admin
// 9 operasi: setujui · tolak(+alasan) · nonaktifkan(+alasan) ·
// aktifkan kembali · pindah Puskesmas · ubah data · reset
// password · hapus · lihat detail + jejak audit.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight, Ban, Check, Eye, KeyRound, Loader2, Pencil, RefreshCw,
  RotateCcw, Search, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface PetugasRow {
  id: string;
  userId: string;
  email: string;
  nama: string;
  jabatan: string | null;
  profesi: string;
  status: string;
  catatanAdmin: string | null;
  createdAt: string;
  verifiedAt: string | null;
  puskesmas: { id: string; nama: string };
  wilayahCount: number;
}
interface Stats { total: number; PENDING: number; ACTIVE: number; DISABLED: number; REJECTED: number; }
interface AuditRow { id: string; action: string; actorRole: string | null; createdAt: string; meta: string | null; }

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Verifikasi",
  ACTIVE: "Aktif",
  DISABLED: "Nonaktif",
  REJECTED: "Ditolak",
};
const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  DISABLED: "bg-slate-200 text-slate-600",
  REJECTED: "bg-rose-100 text-rose-700",
};

function fmtDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPetugasTab({ onChanged }: { onChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PetugasRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  // modal alasan (tolak / nonaktif)
  const [alasan, setAlasan] = useState<{ mode: "reject" | "disable"; row: PetugasRow } | null>(null);
  const [teksAlasan, setTeksAlasan] = useState("");
  // modal pindah Puskesmas
  const [pindah, setPindah] = useState<{ row: PetugasRow; target: string; list: { id: string; nama: string }[] } | null>(null);
  // modal ubah data
  const [ubah, setUbah] = useState<{ row: PetugasRow; nama: string; jabatan: string; profesi: string } | null>(null);
  const [daftarProfesi, setDaftarProfesi] = useState<string[]>([]);
  // modal reset password
  const [reset, setReset] = useState<{ row: PetugasRow; pass: string } | null>(null);
  // modal detail
  const [detail, setDetail] = useState<{ row: PetugasRow; auditLogs: AuditRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/petugas");
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memuat");
      setRows(d.rows || []);
      setStats(d.stats || null);
    } catch (e) {
      toast({ title: "Gagal memuat data petugas", description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = rows;
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    if (s) {
      out = out.filter((r) =>
        [r.nama, r.email, r.jabatan, r.profesi, r.puskesmas.nama].filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }
    return out;
  }, [rows, statusFilter, q]);

  function selesai(msg: string) {
    toast({ title: msg });
    load();
    onChanged?.();
  }

  async function aksi(row: PetugasRow, action: string, extra: Record<string, unknown> = {}, pesan?: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/petugas/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memproses aksi");
      selesai(pesan || d.message || "Berhasil");
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function hapus(row: PetugasRow) {
    const yakin = window.confirm(
      `Hapus akun petugas "${row.nama}" (${row.email})?\n\nAkun dan akses login-nya akan dihapus permanen. Riwayat audit tetap tersimpan.`
    );
    if (!yakin) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/petugas/${row.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal menghapus");
      selesai(d.message || "Petugas dihapus");
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function bukaPindah(row: PetugasRow) {
    try {
      const r = await fetch("/api/admin/puskesmas");
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memuat daftar Puskesmas");
      const list: { id: string; nama: string }[] = (d.puskesmas || [])
        .filter((p: { isActive: boolean }) => p.isActive && p.id !== row.puskesmas.id)
        .map((p: { id: string; nama: string }) => ({ id: p.id, nama: p.nama }));
      setPindah({ row, target: "", list });
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    }
  }

  async function bukaUbah(row: PetugasRow) {
    setUbah({ row, nama: row.nama, jabatan: row.jabatan ?? "", profesi: row.profesi });
    if (daftarProfesi.length === 0) {
      try {
        const r = await fetch("/api/puskesmas/directory");
        const d = await r.json();
        if (r.ok) setDaftarProfesi(d.profesi || []);
      } catch { /* biarkan kosong */ }
    }
  }

  async function bukaDetail(row: PetugasRow) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await fetch(`/api/admin/petugas/${row.id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Gagal memuat detail");
      setDetail({ row: d.row, auditLogs: d.auditLogs || [] });
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : undefined });
    } finally {
      setDetailLoading(false);
    }
  }

  const ADM_PESAN: Record<string, string> = {
    PETUGAS_APPROVE: "Pendaftaran disetujui",
    PETUGAS_REGISTER: "Petugas mendaftar",
    PETUGAS_REJECT: "Pendaftaran ditolak",
    PETUGAS_DISABLE: "Akun dinonaktifkan",
    PETUGAS_ENABLE: "Akun diaktifkan kembali",
    PETUGAS_MOVE: "Dipindahkan Puskesmas",
    PETUGAS_UPDATE: "Data petugas diubah",
    PETUGAS_RESET_PASSWORD: "Password direset",
    PETUGAS_DELETE: "Akun dihapus",
    LOGIN_PETUGAS: "Login petugas",
    LOGIN_PETUGAS_DIBLOKIR: "Percobaan login diblokir",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">👥 Manajemen Petugas Puskesmas</h1>
          <p className="text-xs text-[#3d1526]/60">
            Setujui pendaftaran, kelola akun petugas, dan pantau jejak aktivitasnya.
          </p>
        </div>
        <Button variant="outline" onClick={load} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526] hover:bg-rose-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Segarkan
        </Button>
      </div>

      {/* Statistik */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-[10px] font-extrabold uppercase text-amber-700/70">Menunggu Verifikasi</p>
            <p className="font-display text-2xl font-extrabold text-amber-600">{stats.PENDING}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-[10px] font-extrabold uppercase text-emerald-700/70">Aktif</p>
            <p className="font-display text-2xl font-extrabold text-emerald-600">{stats.ACTIVE}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">Nonaktif</p>
            <p className="font-display text-2xl font-extrabold text-slate-600">{stats.DISABLED}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
            <p className="text-[10px] font-extrabold uppercase text-rose-700/70">Ditolak</p>
            <p className="font-display text-2xl font-extrabold text-rose-600">{stats.REJECTED}</p>
          </div>
          <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Total Akun</p>
            <p className="font-display text-2xl font-extrabold text-[#3d1526]">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Filter + cari */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: "", label: "Semua" },
          { k: "PENDING", label: "Menunggu" },
          { k: "ACTIVE", label: "Aktif" },
          { k: "DISABLED", label: "Nonaktif" },
          { k: "REJECTED", label: "Ditolak" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setStatusFilter(f.k)}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
              statusFilter === f.k ? "bg-amber-300 text-[#3d1526]" : "border border-[#3d1526]/15 bg-white text-[#3d1526]/60 hover:bg-rose-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d1526]/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, email, Puskesmas…"
            className="rounded-xl border-[#3d1526]/15 pl-9"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto rounded-2xl border border-[#3d1526]/10 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-[#3d1526]/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data petugas…
          </div>
        ) : (
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-b-2 border-[#3d1526]/10 bg-[#faf0e8]">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-extrabold [&>th]:uppercase [&>th]:text-[10px] [&>th]:text-[#3d1526]/50">
                <th>Petugas</th><th>Jabatan</th><th>Profesi</th><th>Puskesmas</th><th>Wilayah</th><th>Status</th><th>Tgl Daftar</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d1526]/5">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-rose-50/40">
                  <td className="px-3 py-2.5 font-extrabold text-[#3d1526]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧑‍⚕️</span>
                      <div>
                        {r.nama}
                        <p className="text-[10px] font-semibold text-[#3d1526]/40">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[#3d1526]/70">{r.jabatan ?? "–"}</td>
                  <td className="px-3 py-2.5 text-[#3d1526]/70">{r.profesi}</td>
                  <td className="px-3 py-2.5 text-[#3d1526]/70">🏥 {r.puskesmas.nama}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 font-extrabold text-teal-700">{r.wilayahCount} kel.</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 font-extrabold ${STATUS_BADGE[r.status] ?? ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.catatanAdmin && (
                      <p className="mt-0.5 max-w-[140px] truncate text-[10px] italic text-[#3d1526]/40" title={r.catatanAdmin}>
                        “{r.catatanAdmin}”
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[#3d1526]/60">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.status === "PENDING" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => aksi(r, "approve", {}, `${r.nama} disetujui`)}
                            title="Setujui pendaftaran — akun langsung bisa login"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" /> Setujui
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => { setTeksAlasan(""); setAlasan({ mode: "reject", row: r }); }}
                            title="Tolak pendaftaran (boleh diberi alasan)"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" /> Tolak
                          </button>
                        </>
                      )}
                      {r.status === "ACTIVE" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => { setTeksAlasan(""); setAlasan({ mode: "disable", row: r }); }}
                            title="Nonaktifkan akun (petugas tidak bisa login)"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                          >
                            <Ban className="h-3 w-3" /> Nonaktifkan
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => bukaPindah(r)}
                            title="Pindahkan ke Puskesmas lain"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                          >
                            <ArrowLeftRight className="h-3 w-3" /> Pindah
                          </button>
                        </>
                      )}
                      {(r.status === "DISABLED" || r.status === "REJECTED") && (
                        <button
                          disabled={busy}
                          onClick={() => aksi(r, "enable", {}, `${r.nama} kembali aktif`)}
                          title="Aktifkan kembali akun ini"
                          className="inline-flex items-center gap-1 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" /> {r.status === "REJECTED" ? "Setujui" : "Aktifkan"}
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => bukaUbah(r)}
                        title="Ubah nama / jabatan / profesi"
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setReset({ row: r, pass: "" })}
                        title="Reset password akun petugas"
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                      >
                        <KeyRound className="h-3 w-3" /> Reset
                      </button>
                      <button
                        disabled={busy || detailLoading}
                        onClick={() => bukaDetail(r)}
                        title="Lihat detail + jejak audit"
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                      >
                        <Eye className="h-3 w-3" /> Detail
                      </button>
                      {(r.status === "DISABLED" || r.status === "REJECTED") && (
                        <button
                          disabled={busy}
                          onClick={() => hapus(r)}
                          title="Hapus akun secara permanen"
                          className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center font-bold text-[#3d1526]/40">
                    {rows.length === 0
                      ? "Belum ada petugas yang mendaftar"
                      : "Tidak ada petugas yang cocok dengan filter"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Modal alasan (tolak / nonaktifkan) ===== */}
      {alasan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setAlasan(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-[#3d1526]/20 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-extrabold text-[#3d1526]">
              {alasan.mode === "reject" ? `Tolak pendaftaran ${alasan.row.nama}?` : `Nonaktifkan akun ${alasan.row.nama}?`}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#3d1526]/60">
              {alasan.mode === "reject"
                ? "Petugas tidak bisa login dan melihat pesan penolakan ini saat mencoba masuk."
                : "Sesi petugas yang sedang login langsung diakhiri sampai akun diaktifkan kembali."}
            </p>
            <Label className="mt-3 block text-xs font-extrabold text-[#3d1526]/60">Alasan (opsional, tampil ke petugas)</Label>
            <textarea
              value={teksAlasan}
              onChange={(e) => setTeksAlasan(e.target.value)}
              rows={3}
              placeholder={alasan.mode === "reject" ? "cth. Silakan daftar ulang dengan email dinas Puskesmas" : "cth. Menunggu surat tugas resmi dari Puskesmas"}
              className="mt-1 w-full rounded-xl border-2 border-[#3d1526]/15 bg-cream/40 p-3 text-sm text-[#3d1526] focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setAlasan(null)} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]">
                Batal
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  const mode = alasan.mode;
                  const row = alasan.row;
                  setAlasan(null);
                  await aksi(row, mode, { reason: teksAlasan.trim() || null },
                    mode === "reject" ? `Pendaftaran ${row.nama} ditolak` : `Akun ${row.nama} dinonaktifkan`);
                }}
                className={`rounded-xl font-extrabold text-white ${alasan.mode === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-500 hover:bg-slate-600"}`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {alasan.mode === "reject" ? "Tolak" : "Nonaktifkan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal pindah Puskesmas ===== */}
      {pindah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setPindah(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-[#3d1526]/20 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-extrabold text-[#3d1526]">Pindahkan {pindah.row.nama}</h3>
            <p className="mt-1 text-xs font-semibold text-[#3d1526]/60">
              Saat ini bertugas di <b>🏥 {pindah.row.puskesmas.nama}</b>. Pilih Puskesmas tujuan:
            </p>
            <select
              value={pindah.target}
              onChange={(e) => setPindah({ ...pindah, target: e.target.value })}
              className="mt-3 h-11 w-full rounded-xl border-2 border-[#3d1526]/15 bg-cream/40 px-3 text-sm text-[#3d1526] focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <option value="">— Pilih Puskesmas tujuan —</option>
              {pindah.list.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setPindah(null)} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]">
                Batal
              </Button>
              <Button
                disabled={busy || !pindah.target}
                onClick={async () => {
                  const { row, target } = pindah;
                  setPindah(null);
                  await aksi(row, "move", { puskesmasId: target }, `${row.nama} dipindahkan`);
                }}
                className="rounded-xl bg-teal-600 font-extrabold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />} Pindahkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ubah data ===== */}
      {ubah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setUbah(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-[#3d1526]/20 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-extrabold text-[#3d1526]">Ubah Data Petugas</h3>
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs font-extrabold text-[#3d1526]/60">Nama Lengkap</Label>
                <Input value={ubah.nama} onChange={(e) => setUbah({ ...ubah, nama: e.target.value })} className="mt-1 rounded-xl border-[#3d1526]/15" />
              </div>
              <div>
                <Label className="text-xs font-extrabold text-[#3d1526]/60">Jabatan</Label>
                <Input value={ubah.jabatan} onChange={(e) => setUbah({ ...ubah, jabatan: e.target.value })} placeholder="cth. Kepala UPT" className="mt-1 rounded-xl border-[#3d1526]/15" />
              </div>
              <div>
                <Label className="text-xs font-extrabold text-[#3d1526]/60">Profesi</Label>
                <select
                  value={ubah.profesi}
                  onChange={(e) => setUbah({ ...ubah, profesi: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border-2 border-[#3d1526]/15 bg-cream/40 px-3 text-sm text-[#3d1526] focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {daftarProfesi.includes(ubah.profesi) ? null : <option value={ubah.profesi}>{ubah.profesi}</option>}
                  {daftarProfesi.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setUbah(null)} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]">
                Batal
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  const { row, ...form } = ubah;
                  setUbah(null);
                  await aksi(row, "update", form, `Data ${row.nama} diperbarui`);
                }}
                className="rounded-xl bg-amber-400 font-extrabold text-[#3d1526] hover:bg-amber-500"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal reset password ===== */}
      {reset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setReset(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-[#3d1526]/20 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-extrabold text-[#3d1526]">Reset Password {reset.row.nama}</h3>
            <p className="mt-1 text-xs font-semibold text-[#3d1526]/60">
              Ibarat gembok baru untuk kunci lama yang hilang — password lama langsung tidak berlaku
              dan petugas harus login ulang. <b>Sampaikan password baru ini ke petugas</b>.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={reset.pass}
                onChange={(e) => setReset({ ...reset, pass: e.target.value })}
                placeholder="Password baru (minimal 6 karakter)"
                className="rounded-xl border-[#3d1526]/15"
              />
              <Button
                variant="outline"
                onClick={() => setReset({ ...reset, pass: "fezone-" + Math.random().toString(36).slice(2, 8) })}
                className="shrink-0 rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]"
                title="Sarankan password otomatis"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setReset(null)} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]">
                Batal
              </Button>
              <Button
                disabled={busy || reset.pass.length < 6}
                onClick={async () => {
                  const { row, pass } = reset;
                  setReset(null);
                  await aksi(row, "reset-password", { newPassword: pass }, `Password ${row.nama} direset`);
                }}
                className="rounded-xl bg-amber-400 font-extrabold text-[#3d1526] hover:bg-amber-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal detail + jejak audit ===== */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="thin-scroll max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-[#3d1526]/20 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-[#3d1526]/50">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail…
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-[#3d1526]">🧑‍⚕️ {detail.row.nama}</h3>
                    <p className="text-xs font-semibold text-[#3d1526]/50">{detail.row.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 font-extrabold ${STATUS_BADGE[detail.row.status] ?? ""}`}>
                    {STATUS_LABEL[detail.row.status] ?? detail.row.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Jabatan:</b> {detail.row.jabatan ?? "–"}</p>
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Profesi:</b> {detail.row.profesi}</p>
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Puskesmas:</b> {detail.row.puskesmas?.nama}</p>
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Wilayah:</b> {detail.row.wilayah?.length ?? 0} kelurahan</p>
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Daftar:</b> {fmtDate(detail.row.createdAt)}</p>
                  <p className="rounded-xl bg-cream/60 p-2.5 font-semibold text-[#3d1526]/70"><b>Input Hb:</b> {detail.row.hbCount}× pemeriksaan</p>
                </div>
                {detail.row.catatanAdmin && (
                  <p className="mt-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-2.5 text-xs font-bold text-amber-700">
                    Catatan admin: {detail.row.catatanAdmin}
                  </p>
                )}
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/40">Jejak aktivitas (50 terakhir)</p>
                <div className="mt-1 space-y-1">
                  {detail.auditLogs.length === 0 ? (
                    <p className="text-xs font-semibold italic text-[#3d1526]/40">Belum ada aktivitas tercatat.</p>
                  ) : (
                    detail.auditLogs.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-cream/40 px-2.5 py-1.5 text-[11px]">
                        <span className="font-extrabold text-[#3d1526]">{ADM_PESAN[a.action] ?? a.action}</span>
                        <span className="font-semibold text-[#3d1526]/40">
                          {new Date(a.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setDetail(null)} className="rounded-xl border-[#3d1526]/15 bg-white text-[#3d1526]">
                    Tutup
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
