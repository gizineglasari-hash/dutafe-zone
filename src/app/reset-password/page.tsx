"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// Halaman "Reset Password" (dibuka dari tautan di email)
// URL: /reset-password?token=xxxx
// Token diverifikasi server: berlaku 1 jam, sekali pakai.
// ------------------------------------------------------------

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Reset Password — FE-ZONE";
    trackPage("/reset-password");
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    setChecked(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password minimal 6 karakter ya!");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password belum sama. Cek lagi ya!");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Koneksi bermasalah. Coba lagi ya!");
      setBusy(false);
    }
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fez-cream">
        <Loader2 className="h-8 w-8 animate-spin text-fez-rose" />
      </div>
    );
  }

  return (
    <div className="bg-hero-blob flex min-h-screen flex-col bg-fez-cream px-4 py-8">
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {!done && (
            <a
              href="/?view=auth"
              className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-fez-ink/60 transition hover:bg-white hover:text-fez-rose"
            >
              ← Kembali ke Halaman Masuk
            </a>
          )}

          <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33] sm:p-8">
            {!token ? (
              // Token tidak ada di URL
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-red-100">
                  <XCircle className="h-8 w-8 text-red-500" />
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">Tautan Tidak Valid</h1>
                <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">
                  Tautan reset tidak ditemukan. Buka kembali tautan terbaru dari email kami,
                  atau minta tautan baru lewat halaman Lupa Password.
                </p>
                <a href="/lupa-password" className="mt-5 block">
                  <Button className="h-12 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose py-3 font-extrabold text-white hover:bg-fez-berry">
                    🔑 Buka Halaman Lupa Password
                  </Button>
                </a>
              </div>
            ) : done ? (
              // Sukses
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-emerald-100">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">Password Berhasil Diubah! 🎉</h1>
                <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">
                  Password barumu sudah aktif. Untuk keamanan, kamu akan diminta masuk ulang
                  dengan password yang baru.
                </p>
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-left text-xs font-semibold leading-relaxed text-fez-ink/80">
                  💡 Simpan password barumu di tempat aman. Kalau lupa lagi, gunakan lagi fitur
                  &ldquo;Lupa password?&rdquo; di halaman masuk.
                </div>
                <a href="/?view=auth" className="mt-5 block">
                  <Button className="h-13 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose py-3 text-lg font-extrabold text-white hover:bg-fez-berry">
                    Masuk Sekarang →
                  </Button>
                </a>
              </div>
            ) : (
              // Form password baru
              <>
                <div className="mb-5 text-center">
                  <span className="mx-auto mb-2 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 text-2xl text-white sticker-sm">
                    🔒
                  </span>
                  <h1 className="font-display text-2xl font-extrabold text-fez-ink sm:text-3xl">Buat Password Baru</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Pilih password baru untuk akun FE-ZONE-mu. Minimal 6 karakter.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label htmlFor="newpass" className="text-sm font-bold text-fez-ink">Password Baru *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="newpass" required type={showPass ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter" className="h-12 rounded-xl border-2 bg-cream/50 pr-12" />
                      <button
                        type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-fez-ink/40 hover:text-fez-ink"
                        aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmpass" className="text-sm font-bold text-fez-ink">Ulangi Password Baru *</Label>
                    <Input
                      id="confirmpass" required type={showPass ? "text" : "password"} value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Ketik ulang password yang sama" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                  </div>

                  {error && (
                    <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                      ⚠️ {error}
                    </p>
                  )}

                  <Button
                    type="submit" disabled={busy}
                    className="h-14 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 text-lg font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                    SIMPAN PASSWORD BARU
                  </Button>

                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    🛡️ Setelah password diubah, semua perangkat yang tadinya masuk otomatis
                    akan diminta login ulang. Itu normal demi keamanan akunmu.
                  </p>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
