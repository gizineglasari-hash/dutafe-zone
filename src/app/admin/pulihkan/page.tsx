"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";

// ------------------------------------------------------------
// Halaman "Lupa Password Admin?" — Prosedur Pemulihan
//
// CARA A (mandiri): email admin + KODE PEMULIHAN + password baru.
//   Kode pemulihan diset oleh pengelola sendiri di Vercel
//   (Environment Variable: ADMIN_RECOVERY_CODE).
// CARA B (darurat): hubungi pengembang program untuk reset
//   langsung melalui database Supabase.
// ------------------------------------------------------------

export default function AdminPulihkanPage() {
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Pemulihan Password Admin — FE-ZONE";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password minimal 6 karakter ya!");
      return;
    }
    if (newPassword !== confirm) {
      setError("Konfirmasi password belum sama. Cek lagi ya!");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan");
        setBusy(false);
        return;
      }
      setDone(data.message || "Password admin berhasil diatur ulang.");
    } catch {
      setError("Koneksi bermasalah. Coba lagi ya!");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#3d1526] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <a href="/?view=admin" className="mb-3 inline-block text-sm font-bold text-white/40 hover:text-white/80">
          ← Kembali ke Login Admin
        </a>

        <div className="rounded-[2rem] border-2 border-amber-300/40 bg-white p-6 shadow-2xl sm:p-8">
          {!done ? (
            <>
              <div className="mb-5 text-center">
                <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3d1526] text-2xl">
                  <KeyRound className="h-6 w-6 text-amber-300" />
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">Lupa Password Admin?</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Tenang — ini ibarat kehilangan kunci utama kantor: ada <b>kunci cadangan</b>
                  {" "}(kode pemulihan) dan ada <b>tukang kunci</b> (pengembang program).
                </p>
              </div>

              {/* CARA A */}
              <div className="rounded-2xl border-2 border-fez-ink bg-amber-50 p-4">
                <p className="font-display text-base font-extrabold text-fez-ink">
                  Cara A · Pakai Kode Pemulihan <span className="text-xs font-extrabold text-emerald-600">(mandiri, disarankan)</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-fez-ink/60">
                  Isi 3 data di bawah. Kode pemulihan adalah kode rahasia yang pengelola atur
                  sendiri di pengaturan Vercel (ADMIN_RECOVERY_CODE) saat fitur ini diaktifkan.
                </p>
                <form onSubmit={submit} className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="adm-email" className="text-xs font-extrabold text-fez-ink">Email Admin *</Label>
                    <Input
                      id="adm-email" required value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin@fezone.id" className="mt-1 h-11 rounded-xl border-2 bg-white" />
                  </div>
                  <div>
                    <Label htmlFor="adm-code" className="text-xs font-extrabold text-fez-ink">Kode Pemulihan *</Label>
                    <Input
                      id="adm-code" required type="password" value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Kode rahasia yang pengelola atur sendiri" className="mt-1 h-11 rounded-xl border-2 bg-white" autoComplete="off" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="adm-pass" className="text-xs font-extrabold text-fez-ink">Password Baru *</Label>
                      <div className="relative mt-1">
                        <Input
                          id="adm-pass" required type={showPass ? "text" : "password"} value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 karakter" className="h-11 rounded-xl border-2 bg-white pr-10" />
                        <button
                          type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fez-ink/40 hover:text-fez-ink"
                          aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="adm-confirm" className="text-xs font-extrabold text-fez-ink">Ulangi Password *</Label>
                      <Input
                        id="adm-confirm" required type={showPass ? "text" : "password"} value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Ketik ulang" className="mt-1 h-11 rounded-xl border-2 bg-white" />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                      ⚠️ {error}
                    </p>
                  )}

                  <Button
                    type="submit" disabled={busy}
                    className="h-12 w-full rounded-2xl bg-[#3d1526] font-extrabold text-white hover:bg-[#5c2040] disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                    ATUR ULANG PASSWORD ADMIN
                  </Button>
                </form>
              </div>

              {/* CARA B */}
              <div className="mt-4 rounded-2xl border-2 border-dashed border-fez-ink/30 bg-cream/60 p-4">
                <p className="font-display text-base font-extrabold text-fez-ink">Cara B · Hubungi Pengembang Program</p>
                <ol className="mt-2 space-y-2 text-xs font-semibold leading-relaxed text-fez-ink/80">
                  <li className="flex gap-2 rounded-xl bg-white p-2.5">
                    <b>1.</b> Hubungi pengembang FE-ZONE (Rahmadiani Putri — Poltekkes Kemenkes Bandung)
                    dan sampaikan bahwa akses admin terkunci.
                  </li>
                  <li className="flex gap-2 rounded-xl bg-white p-2.5">
                    <b>2.</b> Pengembang memverifikasi kepemilikan program, lalu mengatur ulang
                    password admin <b>langsung dari database</b> (prosedur &ldquo;Rencana B&rdquo;).
                  </li>
                  <li className="flex gap-2 rounded-xl bg-white p-2.5">
                    <b>3.</b> Setelah password baru diterima, segera login dan simpan baik-baik.
                  </li>
                </ol>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-fez-ink/50">
                  🛡️ Catatan keamanan: tidak ada pihak — termasuk pengembang — yang bisa melihat
                  password lama Anda. Password hanya bisa diganti, tidak bisa dibaca.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-emerald-100">
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
              </span>
              <h1 className="font-display text-2xl font-extrabold text-fez-ink">Berhasil! 🎉</h1>
              <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">{done}</p>
              <a href="/?view=admin" className="mt-5 block">
                <Button className="h-13 w-full rounded-2xl bg-[#3d1526] py-3 font-extrabold text-white hover:bg-[#5c2040]">
                  Ke Halaman Login Admin →
                </Button>
              </a>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] font-bold text-white/30">
          Halaman khusus pengelola program FE-ZONE · Dinas Kesehatan Kota Bandung
        </p>
      </motion.div>
      <div className="mt-6 w-full text-center">
        <SiteCredit />
      </div>
    </div>
  );
}
