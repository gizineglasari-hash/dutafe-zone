"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle2, ChevronDown, Eye, EyeOff, Loader2, MapPin, Search, X } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// /register-puskesmas (pembaruan 19 Tahap 2)
// Pendaftaran akun petugas Puskesmas. Puskesmas WAJIB dipilih
// dari daftar resmi (pencarian — tidak boleh ketik bebas);
// wilayah kerja terisi otomatis dan hanya-baca; setelah daftar,
// akun berstatus "Menunggu Verifikasi Admin".
// ------------------------------------------------------------

interface PuskesmasDir {
  id: string;
  nama: string;
  alamat: string | null;
  telp: string | null;
  kecamatan: string | null;
  wilayah: { kelurahan: string; kecamatan: string | null }[];
}

export default function RegisterPuskesmasPage() {
  const [loadingDir, setLoadingDir] = useState(true);
  const [dirError, setDirError] = useState<string | null>(null);
  const [puskesmasList, setPuskesmasList] = useState<PuskesmasDir[]>([]);
  const [profesiList, setProfesiList] = useState<string[]>([]);

  // pencarian Puskesmas (dropdown)
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [terpilih, setTerpilih] = useState<PuskesmasDir | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ nama: "", jabatan: "", profesi: "", username: "", phone: "", password: "", konfirmasi: "" });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
    document.title = "Daftar Petugas Puskesmas — FE-ZONE";
    trackPage("/register-puskesmas");
    (async () => {
      try {
        const r = await fetch("/api/puskesmas/directory");
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Gagal memuat daftar");
        setPuskesmasList(d.puskesmas || []);
        setProfesiList(d.profesi || []);
      } catch (e) {
        setDirError(e instanceof Error ? e.message : "Gagal memuat daftar Puskesmas");
      } finally {
        setLoadingDir(false);
      }
    })();
  }, []);

  // tutup dropdown saat klik di luar
  useEffect(() => {
    function klikLuar(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return puskesmasList;
    return puskesmasList.filter((p) =>
      [p.nama, p.alamat, p.kecamatan].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [puskesmasList, q]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terpilih) {
      setError("Pilih Puskesmas dari daftar terlebih dahulu");
      return;
    }
    if (form.password !== form.konfirmasi) {
      setError("Konfirmasi password tidak sama dengan password");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register-puskesmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          jabatan: form.jabatan,
          profesi: form.profesi,
          puskesmasId: terpilih.id,
          username: form.username,
          password: form.password,
          phone: form.phone,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Terjadi kesalahan");
        setBusy(false);
        return;
      }
      setSukses(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Koneksi bermasalah. Coba lagi!");
      setBusy(false);
    }
  }

  return (
    <div className="bg-hero-blob flex min-h-screen flex-col bg-fez-cream px-4 py-8">
      <div className="flex flex-1 items-start justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <a
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-fez-ink/60 transition hover:bg-white hover:text-fez-rose"
          >
            <X className="h-4 w-4" /> Tutup
          </a>

          <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33] sm:p-8">
            {sukses ? (
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-emerald-100 text-3xl">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">Pendaftaran Terkirim! 🎉</h1>
                <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">
                  Akun petugas atas nama <b>{form.nama}</b> berhasil dibuat dan sekarang
                  berstatus <b>Menunggu Verifikasi Admin</b>.
                </p>
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-left text-xs font-semibold leading-relaxed text-fez-ink/80">
                  <p className="font-extrabold">🔔 Apa langkah berikutnya?</p>
                  <p className="mt-1">
                    Ibarat kartu anggota perpustakaan yang masih dicap petugas — akunmu sudah
                    terdaftar, tinggal <b>disetujui Admin program</b>. Setelah disetujui, kamu
                    bisa login di halaman Login Petugas Puskesmas.
                  </p>
                </div>
                <a href="/login-puskesmas" className="mt-5 block">
                  <Button className="h-13 w-full rounded-2xl border-2 border-fez-ink bg-fez-ink py-3 font-extrabold text-white hover:bg-[#5c2040]">
                    Ke Halaman Login Petugas
                  </Button>
                </a>
              </div>
            ) : (
              <>
                <div className="mb-5 text-center">
                  <span className="mx-auto mb-2 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-teal-500 to-emerald-400 text-2xl text-white sticker-sm">
                    🏥
                  </span>
                  <h1 className="font-display text-2xl font-extrabold text-fez-ink sm:text-3xl">Daftar Petugas Puskesmas</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Untuk tenaga kesehatan Puskesmas di Kota Bandung. Pilih <b>Puskesmas tempat
                    bertugas</b> dari daftar resmi — seperti memilih nama sekolah, tidak bisa
                    diketik sembarangan supaya datanya akurat.
                  </p>
                </div>

                {loadingDir ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-fez-ink/50">
                    <Loader2 className="h-5 w-5 animate-spin" /> Memuat daftar Puskesmas...
                  </div>
                ) : dirError ? (
                  <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">⚠️ {dirError}</p>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    {/* Pilih Puskesmas — pencarian dari daftar resmi */}
                    <div ref={boxRef} className="relative">
                      <Label className="text-sm font-bold text-fez-ink">Puskesmas Tempat Bertugas *</Label>
                      {!terpilih ? (
                        <>
                          <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/30" />
                            <Input
                              value={q}
                              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                              onFocus={() => setOpen(true)}
                              placeholder="Ketik nama Puskesmas, cth. Babatan..."
                              className="h-12 rounded-xl border-2 bg-cream/50 pl-9"
                            />
                          </div>
                          {open && (
                            <div className="thin-scroll absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-fez-ink/15 bg-white p-1 shadow-lg">
                              {hasil.length === 0 ? (
                                <p className="p-3 text-xs font-bold leading-relaxed text-fez-ink/60">
                                  Puskesmas tidak ditemukan dalam daftar. Silakan hubungi Admin.
                                </p>
                              ) : (
                                hasil.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { setTerpilih(p); setOpen(false); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-cream"
                                  >
                                    <Building2 className="h-4 w-4 shrink-0 text-fez-teal" />
                                    <span>
                                      <span className="block text-sm font-extrabold text-fez-ink">{p.nama}</span>
                                      {p.kecamatan && (
                                        <span className="block text-[11px] font-semibold text-fez-ink/50">Kec. {p.kecamatan}</span>
                                      )}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-1 rounded-xl border-2 border-fez-teal/40 bg-teal-50/60 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-extrabold text-fez-ink">
                                <Building2 className="h-4 w-4 text-fez-teal" /> {terpilih.nama}
                              </p>
                              {terpilih.kecamatan && (
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-fez-ink/50">
                                  <MapPin className="h-3 w-3" /> Kec. {terpilih.kecamatan}
                                  {terpilih.alamat ? ` · ${terpilih.alamat}` : ""}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setTerpilih(null); setQ(""); }}
                              className="rounded-lg border-2 border-fez-ink/15 bg-white px-2 py-1 text-[10px] font-extrabold text-fez-ink/60 hover:border-fez-rose hover:text-fez-rose"
                            >
                              Ganti
                            </button>
                          </div>
                          {/* Wilayah kerja — otomatis, hanya-baca */}
                          <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">
                            Wilayah kerja (otomatis dari daftar resmi)
                          </p>
                          {terpilih.wilayah.length === 0 ? (
                            <p className="mt-1 text-[11px] font-semibold italic text-fez-ink/50">
                              Belum ada data wilayah kerja yang terpetakan untuk Puskesmas ini.
                            </p>
                          ) : (
                            <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto thin-scroll">
                              {terpilih.wilayah.map((w, i) => (
                                <span key={i} className="rounded-full border border-fez-teal/30 bg-white px-2 py-0.5 text-[10px] font-bold text-fez-ink/70">
                                  Kel. {w.kelurahan}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="nama" className="text-sm font-bold text-fez-ink">Nama Lengkap *</Label>
                        <Input id="nama" required value={form.nama} onChange={set("nama")}
                          placeholder="cth. dr. Rina Kartika" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                      </div>
                      <div>
                        <Label htmlFor="jabatan" className="text-sm font-bold text-fez-ink">Jabatan</Label>
                        <Input id="jabatan" value={form.jabatan} onChange={set("jabatan")}
                          placeholder="cth. Kepala UPT / Staf Gizi" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="profesi" className="text-sm font-bold text-fez-ink">Profesi *</Label>
                        <div className="relative mt-1">
                          <select
                            id="profesi" required value={form.profesi} onChange={set("profesi")}
                            className="h-12 w-full appearance-none rounded-xl border-2 border-input bg-cream/50 px-3 pr-9 text-sm text-fez-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fez-rose/40"
                          >
                            <option value="">— Pilih profesi —</option>
                            {profesiList.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/40" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-sm font-bold text-fez-ink">No. WhatsApp *</Label>
                        <Input id="phone" required inputMode="tel" value={form.phone} onChange={set("phone")}
                          placeholder="cth. 0812xxxxxxx" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="username" className="text-sm font-bold text-fez-ink">Email (dipakai untuk login) *</Label>
                      <Input id="username" required type="email" value={form.username} onChange={set("username")}
                        placeholder="cth. puskesmas@email.com" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="password" className="text-sm font-bold text-fez-ink">Password *</Label>
                        <div className="relative mt-1">
                          <Input id="password" required type={showPass ? "text" : "password"} value={form.password}
                            onChange={set("password")} placeholder="Minimal 6 karakter"
                            className="h-12 rounded-xl border-2 bg-cream/50 pr-10" />
                          <button type="button" onClick={() => setShowPass((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-fez-ink/40 hover:text-fez-ink"
                            aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}>
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="konfirmasi" className="text-sm font-bold text-fez-ink">Ulangi Password *</Label>
                        <Input id="konfirmasi" required type={showPass ? "text" : "password"} value={form.konfirmasi}
                          onChange={set("konfirmasi")} placeholder="Ketik ulang password"
                          className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                      </div>
                    </div>

                    {error && (
                      <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                        ⚠️ {error}
                      </p>
                    )}

                    <Button
                      type="submit" disabled={busy}
                      className="h-14 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-teal-500 to-emerald-400 text-lg font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                      DAFTAR SEKARANG
                    </Button>

                    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                      🛡️ Setelah mendaftar, akun akan <b>ditinjau Admin</b> terlebih dahulu.
                      Pastikan memilih Puskesmas sesuai penempatan resmi Anda.
                    </p>
                  </form>
                )}
              </>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] font-bold text-fez-ink/40">
            Sudah punya akun?{" "}
            <a href="/login-puskesmas" className="text-fez-rose/70 underline-offset-2 hover:text-fez-rose hover:underline">
              Login Petugas di sini
            </a>
          </p>
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
