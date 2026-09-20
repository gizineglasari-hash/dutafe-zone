"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building2, LayoutDashboard, Loader2, LogOut, Users } from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";
import PuskesmasOverview from "@/components/fezone/puskesmas-overview";
import PuskesmasRemaja from "@/components/fezone/puskesmas-remaja";

// ------------------------------------------------------------
// /dashboard-puskesmas (pembaruan 19 Tahap 3)
// Dasbor petugas dengan 2 tab:
//   - Ringkasan : 8 kartu statistik + 4 grafik + filter waktu
//   - Data Remaja : tabel wilayah (cari/7 filter/paginasi) ->
//     detail read-only /dashboard-puskesmas/remaja/[id]
// Sesi + status ACTIVE selalu diverifikasi server lewat
// /api/puskesmas/me.
// ------------------------------------------------------------

interface MeStaff {
  nama: string;
  jabatan: string | null;
  profesi: string;
  puskesmas: { id: string; nama: string; alamat: string | null; telp: string | null };
  wilayah: { kelurahan: { nama: string; kecamatan: { nama: string } | null } }[];
}

type Tab = "ringkasan" | "remaja";

export default function DashboardPuskesmasPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<MeStaff | null>(null);
  const [tab, setTab] = useState<Tab>("ringkasan");

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

  return (
    <div className="bg-hero-blob min-h-screen bg-fez-cream px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
            <>
              {/* Sambutan + Puskesmas */}
              <div className="mt-6 rounded-[2rem] border-2 border-fez-ink bg-white p-6 shadow-[8px_8px_0_0_#4a1d33]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-fez-ink/40">Selamat datang kembali</p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{staff.nama}</h2>
                  </div>
                  <div className="rounded-2xl border-2 border-fez-teal/30 bg-teal-50/70 px-4 py-2">
                    <p className="flex items-center gap-1.5 text-sm font-extrabold text-fez-ink">
                      <Building2 className="h-4 w-4 text-fez-teal" /> {staff.puskesmas.nama}
                    </p>
                    <p className="text-[11px] font-semibold text-fez-ink/50">
                      {staff.profesi}{staff.jabatan ? ` · ${staff.jabatan}` : ""} · {staff.wilayah.length} kelurahan
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab navigasi */}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setTab("ringkasan")}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-fez-ink px-4 py-2 text-sm font-extrabold transition-all ${
                    tab === "ringkasan" ? "bg-fez-ink text-white shadow-[4px_4px_0_0_#4a1d33]" : "bg-white text-fez-ink/60 hover:bg-fez-cream"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> Ringkasan
                </button>
                <button
                  onClick={() => setTab("remaja")}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border-2 border-fez-ink px-4 py-2 text-sm font-extrabold transition-all ${
                    tab === "remaja" ? "bg-fez-ink text-white shadow-[4px_4px_0_0_#4a1d33]" : "bg-white text-fez-ink/60 hover:bg-fez-cream"
                  }`}
                >
                  <Users className="h-4 w-4" /> Data Remaja
                </button>
              </div>

              {/* Konten tab */}
              <div className="mt-4">
                {tab === "ringkasan" ? <PuskesmasOverview puskesmasNama={staff.puskesmas.nama} /> : <PuskesmasRemaja />}
              </div>
            </>
          ) : null}
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
