"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

// ------------------------------------------------------------
// Kartu "Pengingat TTD (Push)" di tab Ringkasan Admin.
// Menampilkan: jumlah perangkat/peserta yang mengaktifkan
// pengingat, yang perlu diingatkan (>= 7 hari tidak check-in),
// jumlah pengingat terkirim + 15 log terakhir, dan tombol
// "Kirim Notifikasi Test" untuk memastikan push sampai ke HP.
// ------------------------------------------------------------

interface PushStats {
  configured: boolean;
  totalSubscriptions: number;
  participantsWithPush: number;
  dueWithPush: number;
  overdueAll: number;
  sentTotal: number;
  sent7d: number;
  recentLogs: {
    id: string;
    name: string;
    school: string;
    sentAt: string;
    success: boolean;
    error: string | null;
    kind: string;
  }[];
}

function waktuLalu(iso: string): string {
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export default function AdminPushCard() {
  const [stats, setStats] = useState<PushStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/push-stats");
      if (!res.ok) {
        setError("Gagal memuat data pengingat.");
        return;
      }
      setStats(await res.json());
    } catch {
      setError("Gagal memuat data pengingat.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function kirimTest() {
    if (!window.confirm("Kirim notifikasi TEST ke SEMUA perangkat yang mengaktifkan pengingat?")) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/push-test", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setTestResult(`Gagal: ${d.message || d.error || "coba lagi"}`);
        return;
      }
      setTestResult(
        d.total === 0
          ? d.message
          : `Terkirim ke ${d.sent} dari ${d.total} perangkat${d.failed > 0 ? ` (${d.failed} gagal)` : ""}. Minta peserta cek HP-mereka ya!`
      );
      load();
    } catch {
      setTestResult("Gagal mengirim test. Coba lagi.");
    } finally {
      setTesting(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-5">
        <p className="font-display text-lg font-extrabold text-[#3d1526]">🔔 Pengingat TTD (Push)</p>
        <p className="mt-1 text-xs font-semibold text-[#3d1526]/60">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center gap-2 rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-5 text-xs font-bold text-[#3d1526]/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat data pengingat...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-lg">🔔</span>
          <div>
            <p className="font-display text-lg font-extrabold text-[#3d1526]">Pengingat TTD (Push Notification)</p>
            <p className="text-[11px] font-semibold text-[#3d1526]/50">
              Server mengirim &ldquo;💊 Saatnya Ingat TTD!&rdquo; otomatis setiap pagi (09.00 WIB) ke peserta yang &ge; 7 hari tidak check-in
            </p>
          </div>
        </div>
        <button
          onClick={kirimTest} disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#3d1526] bg-white px-3 py-2 text-xs font-extrabold text-[#3d1526] transition hover:bg-amber-100 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Kirim Notifikasi Test
        </button>
      </div>

      {!stats.configured && (
        <div className="mb-3 rounded-2xl border-2 border-amber-400 bg-amber-100 p-3 text-xs font-bold leading-relaxed text-amber-900">
          ⚠️ Sistem pengingat <b>belum aktif</b>: kunci VAPID belum diatur. Tambahkan environment variables
          <b> VAPID_PUBLIC_KEY</b> dan <b>VAPID_PRIVATE_KEY</b> di Vercel (Project → Settings → Environment Variables), lalu Redeploy. Kuncinya ada di instruksi pembaruan 9.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat value={stats.totalSubscriptions} label="Perangkat Terdaftar" icon="📱" />
        <MiniStat value={stats.participantsWithPush} label="Peserta Aktifkan Pengingat" icon="🔔" />
        <MiniStat value={stats.dueWithPush} label="Perlu Diingatkan (≥7 hari, punya push)" icon="⏰" />
        <MiniStat value={stats.sentTotal} label="Pengingat Terkirim (total)" sub={`${stats.sent7d} dalam 7 hari terakhir`} icon="📨" />
      </div>

      <p className="mt-2 text-[11px] font-semibold text-[#3d1526]/45">
        Catatan: {stats.overdueAll} peserta (dari seluruh peserta) saat ini &ge; 7 hari tidak check-in TTD. Yang belum mengaktifkan pengingat tidak bisa dikirimi notifikasi — ingatkan lewat kelompok/kesekolahannya.
      </p>

      {testResult && (
        <p className="mt-3 rounded-2xl bg-white/80 p-3 text-xs font-bold text-[#3d1526]/80">{testResult}</p>
      )}

      {stats.recentLogs.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#3d1526]/50">15 pengiriman terakhir</p>
          <div className="overflow-hidden rounded-2xl border border-[#3d1526]/10 bg-white/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#3d1526]/10 text-[10px] font-extrabold uppercase text-[#3d1526]/45">
                  <th className="px-3 py-2">Peserta</th>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2">Waktu</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((l) => (
                  <tr key={l.id} className="border-b border-[#3d1526]/5 last:border-0">
                    <td className="px-3 py-2 font-bold text-[#3d1526]">
                      {l.name}
                      <span className="block text-[10px] font-semibold text-[#3d1526]/40">{l.school}</span>
                    </td>
                    <td className="px-3 py-2 text-[#3d1526]/70">{l.kind === "test" ? "Test" : "Pengingat mingguan"}</td>
                    <td className="px-3 py-2 text-[#3d1526]/70">{waktuLalu(l.sentAt)}</td>
                    <td className="px-3 py-2">
                      {l.success ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Terkirim</span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700" title={l.error ?? ""}>Gagal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label, sub, icon }: { value: number; label: string; sub?: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-3">
      <p className="text-lg">{icon}</p>
      <p className="font-display text-2xl font-extrabold text-[#3d1526]">{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] font-semibold text-[#3d1526]/40">{sub}</p>}
    </div>
  );
}
