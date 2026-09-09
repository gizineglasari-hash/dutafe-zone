"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";

export default function AuthPage() {
  const { authMode, setAuthMode, setView, setUser } = useFez();
  const isRegister = authMode === "register";

  const [form, setForm] = useState({ name: "", age: "", school: "", educationLevel: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister ? form : { username: form.username, password: form.password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Ups! 😅", description: data.error || "Terjadi kesalahan", variant: "destructive" });
        setLoading(false);
        return;
      }
      setUser({
        id: data.user.id,
        username: data.user.username,
        role: "PARTICIPANT",
        name: data.user.name,
        educationLevel: data.user.educationLevel,
      });
      if (isRegister) {
        setWelcome(data.message);
        setLoading(false);
      } else {
        setView("app");
      }
    } catch {
      toast({ title: "Koneksi bermasalah", description: "Coba lagi ya!", variant: "destructive" });
      setLoading(false);
    }
  }

  // ---------- Welcome screen setelah registrasi ----------
  if (welcome) {
    return (
      <div className="bg-hero-blob flex min-h-screen items-center justify-center bg-fez-cream px-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-full max-w-md rounded-[2rem] border-2 border-fez-ink bg-white p-8 text-center shadow-[8px_8px_0_0_#4a1d33]"
        >
          <p className="text-6xl">🎉</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-gradient-iron">Selamat datang!</h1>
          <p className="mt-2 text-lg font-bold text-fez-ink">{welcome}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kamu resmi menjadi <span className="font-extrabold text-fez-rose">Pejuang Fe-Zone — {useFez.getState().user?.educationLevel}</span>!
          </p>
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-fez-ink/80">
            <p className="font-bold">🎯 Misi pertamamu:</p>
            <p>Mission 1 (Kenali Musuhmu) &amp; Mission 2 (TTD Tracker) sudah TERBUKA — mulai sekarang! Misi berikutnya terbuka setelah kamu LULUS (nilai ≥80).</p>
          </div>
          <Button
            onClick={() => setView("app")}
            className="mt-5 h-13 w-full rounded-2xl border-2 border-fez-ink bg-fez-rose py-3 text-lg font-extrabold text-white hover:bg-fez-berry"
          >
            Masuk ke Dashboard →
          </Button>
        </motion.div>
        <div className="mt-4 w-full text-center">
          <SiteCredit />
        </div>
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
        className="w-full max-w-lg"
      >
        <button
          onClick={() => setView("landing")}
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-fez-ink/60 transition hover:bg-white hover:text-fez-rose"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </button>

        <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33] sm:p-8">
          <div className="mb-5 text-center">
            <span className="mx-auto mb-2 flex h-14 w-14 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 font-display text-xl font-extrabold text-white sticker-sm">
              Fe
            </span>
            <h1 className="font-display text-2xl font-extrabold text-fez-ink sm:text-3xl">
              {isRegister ? "Daftar sebagai Pejuang Fe-Zone 💪" : "Selamat Datang Kembali! 👋"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRegister
                ? "Isi data dirimu untuk memulai perjalanan jadi Duta Fe-Zone."
                : "Masuk untuk melanjutkan misimu."}
            </p>
          </div>

          {/* Toggle login/daftar */}
          <div className="mb-5 grid grid-cols-2 rounded-2xl border-2 border-fez-ink bg-muted p-1">
            {(["register", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAuthMode(m)}
                className={`rounded-xl py-2 text-sm font-extrabold transition ${
                  authMode === m ? "bg-fez-rose text-white shadow" : "text-fez-ink/60 hover:text-fez-ink"
                }`}
              >
                {m === "register" ? "Daftar Baru" : "Masuk"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <Label htmlFor="name" className="text-sm font-bold text-fez-ink">Nama Lengkap *</Label>
                  <Input
                    id="name" required value={form.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="cth. Aulia Rahma" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="age" className="text-sm font-bold text-fez-ink">Usia *</Label>
                    <Input
                      id="age" required type="number" min={10} max={25} value={form.age}
                      onChange={(e) => set("age", e.target.value)}
                      placeholder="cth. 14" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold text-fez-ink">Tingkat Pendidikan *</Label>
                    <RadioGroup
                      value={form.educationLevel}
                      onValueChange={(v) => set("educationLevel", v)}
                      className="mt-1 flex gap-2"
                    >
                      {(["SMP", "SMA"] as const).map((lv) => (
                        <label
                          key={lv}
                          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-extrabold transition ${
                            form.educationLevel === lv
                              ? "border-fez-rose bg-rose-50 text-fez-rose"
                              : "border-fez-ink/20 bg-white text-fez-ink/50 hover:border-fez-ink/40"
                          }`}
                        >
                          <RadioGroupItem value={lv} id={`lv-${lv}`} className="sr-only" />
                          <span>{lv === "SMP" ? "🏫" : "🎓"} {lv}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                <div>
                  <Label htmlFor="school" className="text-sm font-bold text-fez-ink">Nama Sekolah *</Label>
                  <Input
                    id="school" required value={form.school} onChange={(e) => set("school", e.target.value)}
                    placeholder="cth. SMPN 1 Harapan Bangsa" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                </div>
                <div>
                  <Label htmlFor="username" className="text-sm font-bold text-fez-ink">Email / Username *</Label>
                  <Input
                    id="username" required type="email" value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="cth. aulia@email.com" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-bold text-fez-ink">Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password" required type={showPass ? "text" : "password"} value={form.password}
                      onChange={(e) => set("password", e.target.value)}
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
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  🔒 Data yang diminta hanya yang diperlukan program: nama, usia, sekolah, tingkat pendidikan, dan akun
                  login. Tidak ada data pribadi sensitif lainnya. Password kamu dienkripsi (tidak disimpan sebagai teks biasa).
                </p>
              </>
            )}

            {!isRegister && (
              <>
                <div>
                  <Label htmlFor="username-l" className="text-sm font-bold text-fez-ink">Email / Username</Label>
                  <Input
                    id="username-l" required value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="Email yang kamu daftarkan" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                </div>
                <div>
                  <Label htmlFor="password-l" className="text-sm font-bold text-fez-ink">Password</Label>
                  <Input
                    id="password-l" required type="password" value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Password kamu" className="mt-1 h-12 rounded-xl border-2 bg-cream/50" />
                </div>
              </>
            )}

            <Button
              type="submit" disabled={loading}
              className="h-14 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 text-lg font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-60"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
              {isRegister ? "DAFTAR SEKARANG!" : "MASUK"}
            </Button>
          </form>
        </div>
      </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
