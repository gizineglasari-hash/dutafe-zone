"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, BadgeCheck, CalendarDays, Crown, Droplets, FileCheck2,
  GraduationCap, HeartPulse, Loader2, MapPin, Phone, ShieldAlert, Sparkles, Trophy, UserRound,
} from "lucide-react";
import { SiteCredit } from "@/components/fezone/ui-bits";
import { BADGES } from "@/lib/constants";
import { trackPage } from "@/lib/track";

// ------------------------------------------------------------
// /dashboard-puskesmas/remaja/[id] (pembaruan 19 Tahap 3)
// Profil remaja versi READ-ONLY untuk petugas Puskesmas.
// Akses diverifikasi server: remaja di luar wilayah kerja
// ditolak 403 ("Anda tidak memiliki akses untuk melihat data
// pengguna ini."). Setiap pembukaan tercatat di AuditLog.
// ------------------------------------------------------------

interface DetailData {
  remaja: {
    id: string; name: string; avatar: string; profilePhotoUrl: string | null;
    age: number; educationLevel: string; school: string; schoolCity: string | null;
    schoolDistrict: string | null; schoolType: string | null; phone: string | null;
    nik: string | null; username: string; joinedAt: string;
    xp: number; level: number; levelName: string; levelIcon: string;
    streakWeeks: number; lastCheckIn: string | null;
    preTestScore: number | null; postTestScore: number | null;
    hbValue: number | null; hbCheckDate: string | null;
    isDutaCandidate: boolean; isDuta: boolean;
  };
  kesehatan: {
    hbRecords: { id: string; checkDate: string; hbValue: number; method: string | null; location: string | null; examiner: string | null }[];
    ttdCount: number; ttdTerakhir: string | null; ttdRiwayat: string[];
  };
  gamifikasi: {
    badges: { key: string; earnedAt: string }[];
    misi: { key: string; title: string; short: string; icon: string; status: string; score: number | null }[];
  };
  aktivitas: { terakhir: string | null };
}

function tgl(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function klasifikasiHb(hb: number) {
  if (hb < 9) return { label: "Anemia Berat", cls: "bg-red-100 text-red-700" };
  if (hb < 11) return { label: "Anemia Sedang", cls: "bg-orange-100 text-orange-700" };
  if (hb < 12) return { label: "Anemia Ringan", cls: "bg-amber-100 text-amber-700" };
  return { label: "Normal", cls: "bg-emerald-100 text-emerald-700" };
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border-2 border-fez-ink bg-white p-5 shadow-[8px_8px_0_0_#4a1d33]">
      <p className="mb-3 flex items-center gap-1.5 font-display text-sm font-extrabold text-fez-ink">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

export default function DetailRemajaPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Detail Remaja — Dashboard Petugas";
    trackPage("/dashboard-puskesmas/remaja");
    (async () => {
      try {
        const r = await fetch(`/api/puskesmas/remaja/${params.id}`);
        if (r.status === 401) { window.location.href = "/login-puskesmas"; return; }
        const d = await r.json();
        if (!r.ok) { setError(d?.error || "Gagal memuat detail"); return; }
        setData(d);
      } catch {
        setError("Gagal memuat detail remaja");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div className="bg-hero-blob flex min-h-screen items-center justify-center bg-fez-cream">
        <p className="flex items-center gap-2 text-sm font-bold text-fez-ink/50">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat profil remaja...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-hero-blob min-h-screen bg-fez-cream px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Button
            onClick={() => { window.location.href = "/dashboard-puskesmas"; }}
            variant="outline"
            className="mb-4 rounded-xl border-2 border-fez-ink/20 bg-white font-extrabold text-fez-ink/70 hover:border-fez-teal hover:text-fez-teal"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Dashboard
          </Button>

          {error ? (
            <div className="rounded-[2rem] border-2 border-fez-ink bg-red-50 p-6 shadow-[8px_8px_0_0_#4a1d33]">
              <p className="flex items-center gap-2 font-display font-extrabold text-red-700">
                <ShieldAlert className="h-5 w-5" /> Akses ditolak
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-red-600">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Identitas */}
              <Panel icon={<UserRound className="h-4 w-4 text-fez-teal" />} title="Identitas Remaja">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-fez-ink bg-fez-cream text-3xl">
                    {data.remaja.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.remaja.profilePhotoUrl} alt={data.remaja.name} className="h-full w-full object-cover" />
                    ) : (
                      data.remaja.avatar
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold text-fez-ink">
                      {data.remaja.name}
                      {data.remaja.isDuta && <Crown className="ml-1.5 inline h-5 w-5 text-amber-500" />}
                      {!data.remaja.isDuta && data.remaja.isDutaCandidate && <BadgeCheck className="ml-1.5 inline h-5 w-5 text-sky-500" />}
                    </p>
                    <p className="text-xs font-bold text-fez-ink/50">@{data.remaja.username} · {data.remaja.age} tahun · {data.remaja.educationLevel}</p>
                    <div className="mt-2 space-y-1 text-xs font-semibold text-fez-ink/65">
                      <p className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-fez-teal" /> {data.remaja.school}{data.remaja.schoolType ? ` (${data.remaja.schoolType})` : ""}{data.remaja.schoolCity ? ` — ${data.remaja.schoolCity}` : ""}</p>
                      {data.remaja.schoolDistrict && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-fez-teal" /> Kec. {data.remaja.schoolDistrict}</p>}
                      {data.remaja.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-fez-teal" /> {data.remaja.phone}</p>}
                      {data.remaja.nik && <p className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-fez-teal" /> NIK: {data.remaja.nik}</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-fez-teal/30 bg-teal-50/70 px-4 py-3 text-center">
                    <p className="text-lg">{data.remaja.levelIcon}</p>
                    <p className="font-display text-sm font-extrabold text-fez-ink">Level {data.remaja.level}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/50">{data.remaja.levelName}</p>
                    <p className="mt-1 text-xs font-extrabold text-fez-teal">{data.remaja.xp.toLocaleString("id-ID")} XP</p>
                  </div>
                </div>
              </Panel>

              {/* Kesehatan */}
              <Panel icon={<HeartPulse className="h-4 w-4 text-rose-500" />} title="Kesehatan — Hemoglobin & TTD">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">Hb terakhir</p>
                    {data.remaja.hbValue !== null ? (
                      <>
                        <p className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{data.remaja.hbValue.toFixed(1)} <span className="text-sm">g/dL</span></p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${klasifikasiHb(data.remaja.hbValue).cls}`}>
                          {klasifikasiHb(data.remaja.hbValue).label}
                        </span>
                        <p className="mt-1 text-[11px] font-semibold text-fez-ink/45">Diperiksa {tgl(data.remaja.hbCheckDate)}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-fez-ink/50">Belum ada data pemeriksaan Hb.</p>
                    )}
                  </div>
                  <div className="rounded-2xl border-2 border-fez-ink/10 bg-fez-cream/50 p-4">
                    <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40"><Droplets className="h-3 w-3" /> Tablet Tambah Darah</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{data.kesehatan.ttdCount} <span className="text-sm">check-in</span></p>
                    <p className="mt-1 text-[11px] font-semibold text-fez-ink/45">
                      {data.kesehatan.ttdTerakhir ? `Terakhir: ${tgl(data.kesehatan.ttdTerakhir)}` : "Belum pernah check-in TTD."}
                    </p>
                  </div>
                </div>
                {data.kesehatan.hbRecords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-ink/40">Riwayat pemeriksaan tercatat ({data.kesehatan.hbRecords.length} terbaru)</p>
                    <div className="mt-1.5 space-y-1.5">
                      {data.kesehatan.hbRecords.map((h) => (
                        <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fez-ink/10 bg-white px-3 py-2 text-xs font-bold text-fez-ink/70">
                          <span><CalendarDays className="mr-1 inline h-3.5 w-3.5 text-fez-teal" />{tgl(h.checkDate)}</span>
                          <span className="font-extrabold text-fez-ink">{h.hbValue.toFixed(1)} g/dL</span>
                          <span className="text-fez-ink/45">{h.method || "—"}{h.examiner ? ` · ${h.examiner}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              {/* Gamifikasi: misi + badge */}
              <Panel icon={<Trophy className="h-4 w-4 text-amber-500" />} title="Perjalanan Misi & Lencana">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {data.gamifikasi.misi.map((m) => (
                    <div key={m.key} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${m.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/70" : m.status === "STARTED" ? "border-amber-200 bg-amber-50/70" : "border-fez-ink/10 bg-white"}`}>
                      <span className="text-xs font-extrabold text-fez-ink">{m.icon} {m.short}</span>
                      <span className={`text-[10px] font-extrabold uppercase ${m.status === "COMPLETED" ? "text-emerald-600" : m.status === "STARTED" ? "text-amber-600" : "text-fez-ink/35"}`}>
                        {m.status === "COMPLETED" ? (m.score !== null ? `Lulus ${m.score}` : "Lulus") : m.status === "STARTED" ? "Berjalan" : "Terkunci"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.gamifikasi.badges.length === 0 ? (
                    <p className="text-xs font-semibold italic text-fez-ink/45">Belum memiliki lencana.</p>
                  ) : (
                    data.gamifikasi.badges.map((b) => {
                      const def = BADGES.find((x) => x.key === b.key);
                      return (
                        <span key={b.key} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-fez-ink/75">
                          {def ? `${def.icon} ${def.name}` : `🏅 ${b.key}`}
                        </span>
                      );
                    })
                  )}
                </div>
              </Panel>

              {/* Ringkasan angka lain */}
              <Panel icon={<FileCheck2 className="h-4 w-4 text-violet-500" />} title="Ringkasan Lainnya">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.preTestScore ?? "—"}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Nilai Pre-Test</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.postTestScore ?? "—"}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Nilai Post-Test</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="font-display text-xl font-extrabold text-fez-ink">{data.remaja.streakWeeks}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Streak (minggu)</p>
                  </div>
                  <div className="rounded-2xl border border-fez-ink/10 bg-fez-cream/50 p-3 text-center">
                    <p className="flex items-center justify-center gap-1 font-display text-xl font-extrabold text-fez-ink"><Sparkles className="h-4 w-4 text-amber-400" />{data.gamifikasi.badges.length}</p>
                    <p className="text-[10px] font-extrabold uppercase text-fez-ink/45">Lencana</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-fez-ink/45">
                  Bergabung {tgl(data.remaja.joinedAt)} · Aktivitas terakhir {tgl(data.aktivitas.terakhir)}
                </p>
              </Panel>
            </div>
          ) : null}
        </motion.div>
      </div>
      <SiteCredit />
    </div>
  );
}
