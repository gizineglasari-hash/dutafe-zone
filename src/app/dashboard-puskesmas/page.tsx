"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building2, Clock3, Loader2, LogOut, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// /dashboard-puskesmas (pembaruan 19 Tahap 2)
// Versi awal dasbor petugas: identitas petugas + Puskesmas +
// wilayah kerja. Statistik remaja, input Hb, rekap & ekspor
// menyusul di Tahap 3-5. Selalu diverifikasi server lewat
// /api/puskesmas/me (sesi + status ACTIVE).
// ------------------------------------------------------------

interface MeStaff {
  nama: string;
  jabatan: string | null;
  profesi: string;
  puskesmas: { id: string; nama: string; alamat: string | null; telp: string | null };
  wilayah: { kelurahan: { nama: string; kecamatan: { nama: string } | null } }[];
}

export default function DashboardPuskesmasPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<MeStaff | null>(null);

  useEffect(() => {
    document.title = "Dashboard Petugas — FE-ZONE";
    trackPage("/dashboard-puskesmas");
    (async () => {
      try {
        const r = await fetch("/api/puskesmas/me");
        if (r.status === 401) {
          window.location.href = "/login-puskesmas";
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Gagal memuat profil");
        setStaff(d.staff);
      } catch {
        window.location.href = "/login-puskesmas";
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login-puskesmas";
  }

  const kecamatanList = staff
    ? Array.from(new Set(staff.wilayah.map((w) => w.kelurahan.kecamatan?.nama).filter(Boolean) as string[]))
    : [];

  return (
    <div className="bg-hero-blob min-h-screen bg-fez-cream px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 rotate-[-6deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-teal-500 to-emerald-400 text-2xl text-white sticker-sm">
                🏥
              </span>
              <div>
                <h1 className="font-display text-xl font-extrabold text-fez-ink sm:text-2xl">Dashboard Petugas</h1>
                <p className="text-xs font-bold text-fez-ink/50">Duta Remaja Putri Bebas Anemia</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="rounded-xl border-2 border-fez-ink/20 bg-white font-extrabold text-fez-ink/60 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Keluar
            </Button>
          </div>

          {loading ? (
            <div className="mt-16 flex items-center justify-center gap-2 text-sm font-bold text-fez-ink/50">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat profil petugas...
            </div>
          ) : staff ? (
            <div className="mt-6 space-y-4">
              {/* Sambutan */}
              <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33]">
                <p className="text-xs font-extrabold uppercase tracking-wide text-fez-ink/40">Selamat datang kembali</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{staff.nama}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-fez-ink/60">
                  <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4 text-fez-teal" />{staff.profesi}</span>
                  {staff.jabatan && (
                    <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-fez-teal" />{staff.jabatan}</span>
                  )}
                </p>
              </div>

              {/* Puskesmas */}
              <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33]">
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-fez-ink/40">
                  <Building2 className="h-3.5 w-3.5" /> Puskesmas Tempat Bertugas
                </p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-fez-ink">{staff.puskesmas.nama}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-fez-ink/60">
                  {staff.puskesmas.alamat && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{staff.puskesmas.alamat}</span>
                  )}
                  {staff.puskesmas.telp && (
                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{staff.puskesmas.telp}</span>
                  )}
                </p>

                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">
                  Wilayah kerja ({staff.wilayah.length} kelurahan · {kecamatanList.length} kecamatan)
                </p>
                {staff.wilayah.length === 0 ? (
                  <p className="mt-1 text-xs font-semibold italic text-fez-ink/50">
                    Belum ada kelurahan yang terpetakan. Hubungi Admin bila wilayah kerja Anda belum sesuai.
                  </p>
                ) : (
                  <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto thin-scroll">
                    {staff.wilayah.map((w, i) => (
                      <span key={i} className="rounded-full border border-fez-teal/30 bg-teal-50/60 px-2.5 py-1 text-[11px] font-bold text-fez-ink/70">
                        Kel. {w.kelurahan.nama}
                        {w.kelurahan.kecamatan ? <span className="ml-1 font-semibold text-fez-ink/40">· {w.kelurahan.kecamatan.nama}</span> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Info tahapan fitur */}
              <div className="rounded-[2rem] border-2 border-fez-ink bg-amber-50 p-6 shadow-[8px_8px_0_0_#4a1d33]">
                <p className="flex items-center gap-1.5 text-sm font-extrabold text-fez-ink">
                  <Clock3 className="h-4 w-4 text-amber-600" /> Fitur pemantauan menyusul
                </p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-fez-ink/70">
                  Data remaja di wilayah Anda, pencatatan hasil pemeriksaan hemoglobin,
                  rekapitulasi, dan ekspor laporan sedang disiapkan dan akan hadir pada
                  pembaruan berikutnya. Akun Anda sudah siap penuh — tidak perlu mendaftar ulang.
                </p>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
