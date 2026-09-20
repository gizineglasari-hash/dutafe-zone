"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Eye, EyeOff, Hourglass, Loader2, ShieldX, X } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// /login-puskesmas (pembaruan 19 Tahap 2)
// Halaman login khusus petugas Puskesmas (terpisah dari login
// remaja & admin). Berhasil -> diarahkan ke /dashboard-puskesmas.
// Akun PENDING/REJECTED/DISABLED tidak bisa masuk dan diberi
// pesan status yang jelas.
// ------------------------------------------------------------

export default function LoginPuskesmasPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kode, setKode] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login Petugas Puskesmas — FE-ZONE";
    trackPage("/login-puskesmas");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setKode(null);
    try {
      const r = await fetch("/api/auth/login-puskesmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Terjadi kesalahan");
        setKode(d.code ?? null);
        setBusy(false);
        return;
      }
      // sukses -> dashboard petugas
      window.location.href = "/dashboard-puskesmas";
    } catch {
      setError("Koneksi bermasalah. Coba lagi!");
      setBusy(false);
    }
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
          <a
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-fez-ink/60 transition hover:bg-white hover:text-fez-rose"
          >
            <X className="h-4 w-4" /> Tutup
          </a>

          <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33] sm:p-8">
            <div className="mb-5 text-center">
              <span className="mx-auto mb-2 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-teal-500 to-emerald-400 text-2xl text-white sticker-sm">
                🏥
              </span>
              <h1 className="font-display text-2xl font-extrabold text-fez-ink sm:text-3xl">Login Petugas Puskesmas</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Istimewa untuk tenaga kesehatan Puskesmas pendamping program
                Duta Remaja Putri Bebas Anemia.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm font-bold text-fez-ink">Email Terdaftar *</Label>
                <Input
                  id="username" required type="email" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cth. puskesmas@email.com" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-bold text-fez-ink">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password" required type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password akun petugas" className="h-12 rounded-xl border-2 bg-cream/50 pr-10" />
                  <button type="button" onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fez-ink/40 hover:text-fez-ink"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className={`rounded-xl border-2 p-3 text-xs font-bold leading-relaxed ${
                    kode === "PENDING"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  <span className="mr-1 inline-flex h-4 w-4 items-center justify-center align-[-2px]">
                    {kode === "PENDING" ? <Hourglass className="h-4 w-4" /> : kode ? <ShieldX className="h-4 w-4" /> : null}
                  </span>
                  {error}
                </div>
              )}

              <Button
                type="submit" disabled={busy}
                className="h-14 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-teal-500 to-emerald-400 text-lg font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-60"
              >
                {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Building2 className="mr-2 h-5 w-5" />}
                MASUK
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                🛡️ Akun petugas hanya aktif setelah <b>diverifikasi Admin program</b>.
                Belum punya akun? Daftar lewat tombol di bawah.
              </p>
            </form>

            <a href="/register-puskesmas" className="mt-1 block">
              <Button className="h-12 w-full rounded-2xl border-2 border-fez-ink bg-white py-3 font-extrabold text-fez-ink hover:bg-cream">
                Daftar Akun Petugas Baru
              </Button>
            </a>
          </div>

          <p className="mt-4 text-center text-[11px] font-bold text-fez-ink/40">
            Remaja putri peserta program?{" "}
            <a href="/?view=auth" className="text-fez-rose/70 underline-offset-2 hover:text-fez-rose hover:underline">
              Login peserta di sini
            </a>
          </p>
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
