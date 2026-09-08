"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { getLevel, LEVELS } from "@/lib/constants";
import { BadgeVisual, SectionTitle, UserAvatar, XpCounter } from "@/components/fezone/ui-bits";
import { BADGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Download, FileDown, ImageDown, ImageUp, Loader2, LogOut, Share2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AVATARS = ["🌸", "🌟", "🦋", "🌺", "⚡", "🍀", "💖", "🌞", "🌙", "🐉", "🎀", "🦸‍♀️"];

export default function ProfileView({ data, refresh }: { data: DashData; refresh: () => void }) {
  const { setTab, setUser, reset } = useFez();
  const p = data.profile;
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lvl = getLevel(p.xp);

  // Downscale gambar ke max 512px (kotak) agar ringan & konsisten
  function processImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - min) / 2,
          (img.height - min) / 2,
          min, min,
          0, 0, size, size
        );
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("gagal"))), "image/jpeg", 0.85);
      };
      img.onerror = () => reject(new Error("gagal"));
      img.src = url;
    });
  }

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File bukan gambar", description: "Pilih file JPG, PNG, atau WebP.", variant: "destructive" });
      return;
    }
    setPhotoBusy(true);
    try {
      const blob = await processImage(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "foto-profil.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/participant/profile/photo", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal upload", description: d.error, variant: "destructive" });
        return;
      }
      setPhotoPreview(null);
      toast({ title: "✅ Foto profil diperbarui!", description: "Foto tampil di leaderboard & komunitas." });
      await refresh();
    } catch {
      toast({ title: "Gagal memproses gambar", variant: "destructive" });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function deletePhoto() {
    setPhotoBusy(true);
    const res = await fetch("/api/participant/profile/photo", { method: "DELETE" });
    setPhotoBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal menghapus foto", variant: "destructive" });
      return;
    }
    toast({ title: "Foto dihapus", description: "Kembali ke avatar default." });
    await refresh();
  }

  async function pickAvatar(a: string) {
    setBusy(true);
    await fetch("/api/participant/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: a }),
    });
    setBusy(false);
    await refresh();
  }

  function shareAchievement() {
    const text = `🎉 Aku sudah mengumpulkan ${p.xp} XP dan ${data.badges.length} badge di FE-ZONE — program Duta Remaja Putri Bebas Anemia! Levelku: ${lvl.icon} ${lvl.name}. Aku ${data.missionsCompleted}/9 misi selesai & streak TTD 🔥${p.streakWeeks} minggu. Kenali anemia, rutin minum TTD, jadi inspirasi! 💪🩸`;
    if (navigator.share) {
      navigator.share({ title: "Pencapaianku di FE-ZONE", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        toast({ title: "Pencapaian tercopy! 📋", description: "Tempel di media sosialmu dan tag teman-temanmu!" });
      });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    reset();
  }

  const certType = p.isDuta ? "duta" : data.certificate.pejuang ? "pejuang" : null;

  return (
    <div className="space-y-6">
      <SectionTitle icon="👤" title="PROFIL PEJUANG" sub="Data dirimu di FE-ZONE" />

      {/* Kartu profil */}
      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="shrink-0 text-center">
            <div className="relative inline-block">
              <UserAvatar
                photoUrl={photoPreview ?? p.profilePhotoUrl}
                avatar={p.avatar}
                size={96}
                className="sticker-sm"
              />
              {photoBusy && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-fez-ink/50">
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                </span>
              )}
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="h-8 rounded-xl border-2 border-fez-ink bg-amber-300 px-2.5 text-[11px] font-extrabold text-fez-ink hover:bg-amber-200"
              >
                <ImageUp className="mr-1 h-3.5 w-3.5" /> Ubah Foto
              </Button>
              {p.profilePhotoUrl && (
                <Button
                  onClick={deletePhoto}
                  disabled={photoBusy}
                  variant="outline"
                  className="h-8 rounded-xl border-2 border-fez-ink bg-white px-2.5 text-[11px] font-extrabold text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhotoPreview(URL.createObjectURL(f));
                  uploadPhoto(f);
                }
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold text-fez-ink">{p.name}</h2>
            <p className="text-xs font-extrabold text-fez-rose">💊 Pejuang Fe-Zone</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {p.age} tahun · {p.school} · 🏫 {p.educationLevel}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border-2 border-fez-ink bg-violet-100 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">
                {lvl.icon} Level {lvl.level} — {lvl.name}
              </span>
              <span className="rounded-full border-2 border-fez-ink bg-teal-100 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">
                🏫 {p.educationLevel}
              </span>
              {p.isDuta && (
                <span className="rounded-full border-2 border-fez-ink bg-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">
                  👑 DUTA REMAJA PUTRI BEBAS ANEMIA
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold text-gradient-iron"><XpCounter xp={p.xp} /></p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Total XP</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat icon="✅" value={`${data.missionsCompleted}/9`} label="Misi Selesai" />
          <MiniStat icon="🎖" value={`${data.badges.length}/${BADGES.length}`} label="Badge" />
          <MiniStat icon="🔥" value={`${p.streakWeeks} mgg`} label="Streak" />
          <MiniStat icon="💊" value={String(data.totalCheckins)} label="Check-in TTD" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={shareAchievement} className="h-11 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-pink-400 px-4 text-sm font-extrabold text-white">
            <Share2 className="mr-1.5 h-4 w-4" /> Bagikan Pencapaianmu
          </Button>
          {certType && (
            <Button onClick={() => setShowCert(true)} className="h-11 rounded-2xl border-2 border-fez-ink bg-amber-400 px-4 text-sm font-extrabold text-fez-ink hover:bg-amber-300">
              <Download className="mr-1.5 h-4 w-4" /> {p.isDuta ? "Sertifikat Duta Fe-Zone" : "Sertifikat Pejuang Fe-Zone"}
            </Button>
          )}
          <Button onClick={logout} variant="outline" className="h-11 rounded-2xl border-2 border-fez-ink bg-white px-4 text-sm font-extrabold text-fez-ink/60 hover:text-fez-rose">
            <LogOut className="mr-1.5 h-4 w-4" /> Keluar
          </Button>
        </div>

        {!certType && (
          <p className="mt-3 rounded-xl bg-cream/60 p-3 text-[11px] font-semibold text-fez-ink/60">
            🔒 Sertifikat terbuka setelah menyelesaikan 9 misi. Progress kamu: {data.missionsCompleted}/9.
            {!data.postTestUnlocked && " Kerjakan misi inti lalu Post-Test, dan ikuti Final Duta Challenge untuk gelar Duta!"}
          </p>
        )}
      </div>

      {/* Pilih avatar emoji (opsional, dipakai jika tidak ada foto) */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold text-fez-ink">
          <Sparkles className="h-5 w-5 text-fez-rose" /> Avatar Default (emoji)
        </p>
        <p className="mb-3 text-xs text-muted-foreground">Dipakai jika kamu belum mengunggah foto profil. Upload foto untuk tampil lebih personal!</p>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => pickAvatar(a)}
              disabled={busy}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-2xl transition ${
                p.avatar === a ? "border-fez-rose bg-rose-50 shadow-[3px_3px_0_0_#e11d48]" : "border-fez-ink/15 hover:border-fez-rose/50 hover:bg-rose-50/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Level journey */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="mb-3 font-display text-lg font-extrabold text-fez-ink">🚀 Perjalanan Level</p>
        <div className="space-y-2">
          {LEVELS.map((l) => {
            const reached = p.xp >= l.minXp;
            return (
              <div key={l.level} className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${reached ? "border-fez-ink bg-gradient-to-r from-rose-50 to-amber-50" : "border-gray-200 opacity-60"}`}>
                <span className="text-2xl">{reached ? l.icon : "🔒"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-extrabold text-fez-ink">Level {l.level} — {l.name}</p>
                  <p className="text-[11px] text-muted-foreground">{l.minXp}+ XP · {l.desc}</p>
                </div>
                {reached && <span className="text-xs font-extrabold text-emerald-600">✓ Tercapai</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge ringkas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold text-fez-ink">🎖 Badge</p>
          <Button variant="ghost" onClick={() => setTab("badges")} className="text-xs font-bold text-fez-rose">Lihat semua →</Button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {BADGES.map((b) => (
            <BadgeVisual key={b.key} def={b} earned={data.badges.includes(b.key)} />
          ))}
        </div>
      </div>

      {showCert && certType && (
        <CertificateOverlay
          type={certType}
          name={p.name}
          school={p.school}
          level={p.educationLevel}
          xp={p.xp}
          onClose={() => setShowCert(false)}
        />
      )}
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-fez-ink/10 bg-white/80 p-3 text-center">
      <p className="text-lg">{icon}</p>
      <p className="font-display text-lg font-extrabold text-fez-ink">{value}</p>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================
// Sertifikat LANDSCAPE — render canvas → Download PDF & JPG
// ============================================================
const CERT_W = 1754; // A4 landscape @150dpi
const CERT_H = 1240;

function drawCertificate(canvas: HTMLCanvasElement, opts: { type: "pejuang" | "duta"; name: string; school: string; level: string; xp: number; logoUrl: string | null }) {
  const ctx = canvas.getContext("2d")!;
  const W = CERT_W, H = CERT_H;
  canvas.width = W; canvas.height = H;

  // Latar krem + bingkai ganda emas
  ctx.fillStyle = "#fffdf6";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 14;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.strokeStyle = "#f3c53c";
  ctx.lineWidth = 4;
  ctx.strokeRect(58, 58, W - 116, H - 116);

  // Sudut hias
  const corner = (x: number, y: number, sx: number, sy: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.fillStyle = "#e11d48";
    ctx.font = "52px serif";
    ctx.fillText("🩸", 76, 110);
    ctx.restore();
  };
  corner(0, 0, 1, 1);
  // titik-titik halus di tepi
  ctx.fillStyle = "rgba(225,29,72,0.10)";
  for (let x = 90; x < W - 80; x += 34) {
    for (let y = 90; y < H - 80; y += 34) {
      if ((x + y) % 68 === 0) ctx.fillRect(x, y, 4, 4);
    }
  }

  const cx = W / 2;
  const center = (text: string, y: number, font: string, color: string) => {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(text, cx, y);
  };

  const display = `"Baloo 2", "Plus Jakarta Sans", "Segoe UI", sans-serif`;

  // Judul
  center(opts.type === "duta" ? "SERTIFIKAT DUTA FE-ZONE" : "SERTIFIKAT PEJUANG FE-ZONE", 170, `bold 40px ${display}`, "#b45309");
  center("FE-ZONE", 268, `900 92px ${display}`, "#e11d48");
  center("PROGRAM DUTA REMAJA PUTRI BEBAS ANEMIA", 322, `bold 26px ${display}`, "#7c6f64");

  // Garis emas
  ctx.fillStyle = "#f3c53c";
  ctx.fillRect(cx - 110, 350, 220, 5);

  center("Dengan bangga diberikan kepada:", 412, `26px ${display}`, "#7c6f64");
  center(opts.name, 486, `900 76px ${display}`, "#4a1d33");
  center(`${opts.school}  ·  Tingkat ${opts.level}`, 540, `bold 30px ${display}`, "#8b7d74");

  // Narasi
  ctx.textAlign = "center";
  ctx.fillStyle = "#5c5348";
  ctx.font = `26px ${display}`;
  const narasi = opts.type === "duta"
    ? "atas keberhasilan & dedikasinya sebagai DUTA REMAJA PUTRI BEBAS ANEMIA — telah menyelesaikan"
    : "atas keberhasilannya menyelesaikan seluruh 9 misi program dan berpendirian menjadi PEJUANG FE-ZONE —";
  const narasi2 = opts.type === "duta"
    ? "seluruh misi, menunjukkan pengetahuan, konsistensi konsumsi TTD, dan menginspirasi teman-temannya:"
    : "pejuang pencegahan anemia remaja putri dengan semangat:";
  const narasi3 = "\"Kenali Anemia, Rutin Minum TTD, Jadi Inspirasi!\"";
  center(narasi, 608, `26px ${display}`, "#5c5348");
  center(narasi2, 648, `26px ${display}`, "#5c5348");
  center(narasi3, 692, `bold 30px ${display}`, "#e11d48");

  // Status peserta + data otomatis
  const statusLabel = opts.type === "duta" ? "Status: DUTA Fe-Zone 👑" : "Status: PEJUANG Fe-Zone 🛡️";
  center(statusLabel, 770, `bold 32px ${display}`, "#0d9488");
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  center(`Total XP: ${opts.xp.toLocaleString("id-ID")}    •    Tingkat: ${opts.level}    •    Diterbitkan: ${today}`, 826, `bold 24px ${display}`, "#7c6f64");

  // Tanda tangan + logo
  ctx.textAlign = "center";
  ctx.fillStyle = "#4a1d33";
  ctx.fillRect(cx - 330, 1000, 260, 3);
  ctx.font = `bold 22px ${display}`;
  ctx.fillStyle = "#8b7d74";
  ctx.fillText("Panitia Program FE-ZONE", cx - 200, 1032);

  ctx.fillRect(cx + 70, 1000, 260, 3);
  ctx.fillText("Dinas Kesehatan Kota Bandung", cx + 200, 1032);

  // Logo Dinas Kesehatan (ditaruh di tengah antara dua tanda tangan — digambar async oleh pemanggil)
  return { logoX: cx, logoY: 940, logoDone: true };
}

function CertificateOverlay({ type, name, school, level, xp, onClose }: {
  type: "pejuang" | "duta"; name: string; school: string; level: string; xp: number; onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/public/hero")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setLogoUrl(d.dinkesLogoUrl ?? null))
      .catch(() => setLogoUrl(null));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (logoUrl === null) {
      drawCertificate(canvas, { type, name, school, level, xp, logoUrl: null });
      setReady(true);
      return;
    }
    // Gambar logo resmi (di-upload admin) ke tengah sertifikat
    const img = new Image();
    img.onload = () => {
      drawCertificate(canvas, { type, name, school, level, xp, logoUrl: null });
      const ctx = canvas.getContext("2d")!;
      const maxW = 150, maxH = 110;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, CERT_W / 2 - w / 2, 905 - h / 2, w, h);
      setReady(true);
    };
    img.onerror = () => {
      drawCertificate(canvas, { type, name, school, level, xp, logoUrl: null });
      setReady(true);
    };
    img.src = logoUrl;
  }, [logoUrl, type, name, school, level, xp]);

  function dataUrl(): string {
    const canvas = canvasRef.current!;
    return canvas.toDataURL("image/jpeg", 0.93);
  }

  function downloadJPG() {
    const a = document.createElement("a");
    a.href = dataUrl();
    a.download = `Sertifikat-FEZONE-${type === "duta" ? "Duta" : "Pejuang"}-${name.replace(/\s+/g, "_")}.jpg`;
    a.click();
    toast({ title: "✅ Sertifikat JPG terunduh!", description: "Format landscape, resolusi tinggi." });
  }

  async function downloadPDF() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    // A4 landscape: 297 × 210 mm
    pdf.addImage(dataUrl(), "JPEG", 0, 0, 297, 210, undefined, "FAST");
    pdf.save(`Sertifikat-FEZONE-${type === "duta" ? "Duta" : "Pejuang"}-${name.replace(/\s+/g, "_")}.pdf`);
    toast({ title: "✅ Sertifikat PDF terunduh!", description: "Format landscape A4." });
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-fez-ink/60 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl py-6">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button onClick={downloadPDF} disabled={!ready} className="h-11 rounded-2xl border-2 border-fez-ink bg-amber-400 px-5 font-extrabold text-fez-ink hover:bg-amber-300">
            <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={downloadJPG} disabled={!ready} className="h-11 rounded-2xl border-2 border-fez-ink bg-emerald-400 px-5 font-extrabold text-fez-ink hover:bg-emerald-300">
            <ImageDown className="mr-1.5 h-4 w-4" /> Download JPG
          </Button>
          <Button variant="outline" onClick={onClose} className="h-11 rounded-2xl border-2 border-fez-ink bg-white px-4 font-extrabold text-fez-ink">
            Tutup
          </Button>
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border-[6px] border-double border-amber-500 bg-white shadow-2xl">
          <canvas ref={canvasRef} className="h-auto w-full" aria-label={`Sertifikat ${type === "duta" ? "Duta" : "Pejuang"} Fe-Zone atas nama ${name}`} />
        </div>
      </motion.div>
    </div>
  );
}
