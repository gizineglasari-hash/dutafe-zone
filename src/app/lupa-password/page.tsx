"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, Loader2, MailCheck, Sparkles } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// Halaman "Lupa Password" (peserta)
// Alur: masukkan email -> tautan reset dikirim ke email
// -> peserta membuka /reset-password dari tautan tersebut.
// ------------------------------------------------------------

type Result =
  | { type: "sent"; message: string }
  | { type: "manual"; message: string }
  | { type: "mailfail"; message: string };

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Lupa Password — FE-ZONE";
    trackPage("/lupa-password");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan");
        setBusy(false);
        return;
      }
      if (data.emailConfigured === false) {
        setResult({ type: "manual", message: data.message });
      } else if (data.emailSent === false) {
        setResult({ type: "mailfail", message: data.message });
      } else {
        setResult({ type: "sent", message: data.message });
      }
    } catch {
      setError("Koneksi bermasalah. Coba lagi ya!");
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
            href="/?view=auth"
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-fez-ink/60 transition hover:bg-white hover:text-fez-rose"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Halaman Masuk
          </a>

          <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33] sm:p-8">
            {!result ? (
              <>
                <div className="mb-5 text-center">
                  <span className="mx-auto mb-2 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 text-2xl text-white sticker-sm">
                    🔑
                  </span>
                  <h1 className="font-display text-2xl font-extrabold text-fez-ink sm:text-3xl">Lupa Password?</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tenang, ini ibarat kehilangan PIN kartu perpustakaan — petugas bisa
                    membuatkan yang baru. Masukkan <b>email yang kamu daftarkan</b>, nanti kami
                    kirim tautan untuk membuat password baru.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-bold text-fez-ink">Email Terdaftar *</Label>
                    <Input
                      id="email" required type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cth. bunga@email.com" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
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
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                    KIRIM TAUTAN RESET
                  </Button>

                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    🛡️ Tautan reset berlaku <b>1 jam</b> dan hanya bisa dipakai <b>satu kali</b>.
                    Jangan bagikan tautan itu ke siapa pun.
                  </p>
                </form>
              </>
            ) : result.type === "sent" ? (
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-emerald-100 text-3xl">
                  <MailCheck className="h-8 w-8 text-emerald-600" />
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">Cek Emailmu! 📬</h1>
                <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">{result.message}</p>
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-left text-xs font-semibold leading-relaxed text-fez-ink/80">
                  <p className="font-extrabold">📬 Tips:</p>
                  <p className="mt-1">
                    Tidak menemukan emailnya? Cek folder <b>Spam/Promosi</b>. Tunggu 1-2 menit
                    karena email kadang tersendat. Bisa juga coba lagi dengan email yang benar.
                  </p>
                </div>
                <a href="/?view=auth" className="mt-5 block">
                  <Button className="h-13 w-full rounded-2xl border-2 border-fez-ink bg-fez-ink py-3 font-extrabold text-white hover:bg-[#5c2040]">
                    Kembali ke Halaman Masuk
                  </Button>
                </a>
              </div>
            ) : (
              <div className="text-center">
                <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-fez-ink bg-amber-100 text-3xl">
                  {result.type === "manual" ? "📮" : <Eye className="h-8 w-8 text-amber-600" />}
                </span>
                <h1 className="font-display text-2xl font-extrabold text-fez-ink">
                  {result.type === "manual" ? "Layanan Email Belum Aktif" : "Email Gagal Terkirim"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-fez-ink/70">{result.message}</p>
                {result.type === "manual" && (
                  <ol className="mt-4 space-y-2 text-left text-xs font-semibold leading-relaxed text-fez-ink/80">
                    <li className="flex gap-2 rounded-xl bg-cream/70 p-2.5"><b>1.</b> Siapkan email yang kamu daftarkan dan nama sekolahmu.</li>
                    <li className="flex gap-2 rounded-xl bg-cream/70 p-2.5"><b>2.</b> Hubungi guru/pembina atau petugas program FE-ZONE.</li>
                    <li className="flex gap-2 rounded-xl bg-cream/70 p-2.5"><b>3.</b> Pengelola me-reset password-mu lewat panel admin &amp; memberi password sementara.</li>
                  </ol>
                )}
                <a href="/?view=auth" className="mt-5 block">
                  <Button className="h-12 w-full rounded-2xl border-2 border-fez-ink bg-fez-ink py-3 font-extrabold text-white hover:bg-[#5c2040]">
                    Kembali ke Halaman Masuk
                  </Button>
                </a>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] font-bold text-fez-ink/40">
            Admin program?{" "}
            <a href="/admin/pulihkan" className="text-fez-rose/70 underline-offset-2 hover:text-fez-rose hover:underline">
              Pulihkan akses admin di sini
            </a>
          </p>
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
