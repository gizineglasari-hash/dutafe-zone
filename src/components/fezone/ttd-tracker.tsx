"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ProgressBar, SectionTitle } from "@/components/fezone/ui-bits";
import PushReminderCard from "@/components/fezone/push-reminder";
import { Loader2 } from "lucide-react";

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function TTDTrackerView({ data, refresh }: { data: DashData; refresh: () => void }) {
  const { celebrate } = useFez();
  const [busy, setBusy] = useState(false);
  const [weekMsg, setWeekMsg] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const checkinSet = useMemo(() => new Set(data.checkins), [data.checkins]);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  // Awal minggu (Senin) — sinkron dengan validasi server (isoWeekStart)
  function mondayOf(d: Date): Date {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay() || 7; // Sen=1..Min=7
    if (day !== 1) date.setDate(date.getDate() - (day - 1));
    return date;
  }
  const thisWeekStart = mondayOf(new Date());
  const lastCheckInDate = data.checkins[0] ?? data.profile.lastCheckIn ?? null;
  const thisWeekDone = data.checkins.some((d) => {
    const dd = new Date(d + "T12:00:00");
    return dd >= thisWeekStart && dd < new Date(thisWeekStart.getTime() + 7 * 24 * 3600 * 1000);
  });

  // Kalender bulan ini (mulai Senin)
  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const day = first.getDay() || 7; // Sen=1..Min=7
    const cells: (string | null)[] = [];
    for (let i = 1; i < day; i++) cells.push(null);
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [cursor]);

  // Progress mingguan: 4 minggu terakhir (mulai Senin)
  const weekly = useMemo(() => {
    const result: { label: string; done: boolean; current: boolean }[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = mondayOf(new Date());
      start.setDate(start.getDate() - w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const done = data.checkins.some((d) => {
        const dd = new Date(d + "T12:00:00");
        return dd >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
               dd <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
      });
      result.push({
        label: w === 0 ? "Minggu ini" : `Mgg -${w}`,
        done, current: w === 0,
      });
    }
    return result;
  }, [data.checkins]);

  async function checkIn() {
    setBusy(true);
    setWeekMsg(null);
    const res = await fetch("/api/participant/ttd", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      return;
    }
    await refresh();
    if (d.ok) {
      celebrate("Saya sudah mengonsumsi TTD minggu ini! 💊", d.xpEarned ?? 10, null);
      if (d.streakBonusAwarded) {
        celebrate("🔥 BONUS IRON STREAK! 4 minggu berturut-turut — +20 XP!", 20, "CONSISTENCY_QUEEN");
      }
    } else {
      // Server menolak (sudah check-in minggu ini) → tampilkan pesan + tanggal terakhir
      setWeekMsg(d.message ?? "Kamu sudah check-in TTD minggu ini. Check-in berikutnya tersedia minggu depan.");
    }
  }

  function prevMonth() { setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1)); }
  function nextMonth() { setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1)); }

  return (
    <div className="space-y-6">
      <SectionTitle icon="💊" title="TTD TRACKER" sub="Catat konsumsi Tablet Tambah Darah-mu di sini" />

      {/* Warning/disclaimer */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
        ⚠️ <span className="font-extrabold">Catatan penting:</span> Fitur ini hanya alat <span className="font-bold">pencatatan &amp; pengingat</span> untuk membantu konsistensimu —
        <span className="font-bold"> bukan pengganti pengawasan tenaga kesehatan</span>. Jadwal &amp; dosis TTD tetap mengikuti anjuran petugas kesehatan/sekolah (umumnya 1 tablet seminggu untuk pencegahan).
      </div>

      {/* Check-in utama — 1× per minggu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-teal-50 to-emerald-50 p-6 text-center shadow-[5px_5px_0_0_#4a1d33]"
      >
        {thisWeekDone ? (
          <>
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }} className="text-6xl">✅</motion.p>
            <p className="mt-2 font-display text-xl font-extrabold text-teal-700">Kamu sudah check-in TTD minggu ini.</p>
            <p className="mt-1 text-sm text-teal-600">Check-in berikutnya tersedia minggu depan.</p>
            {lastCheckInDate && (
              <p className="mt-2 inline-block rounded-xl bg-white/80 px-3 py-1 text-xs font-extrabold text-fez-ink/70">
                🗓️ Check-in terakhir: {new Date(lastCheckInDate + "T12:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            <div className="mt-3">
              <Button disabled className="h-14 cursor-not-allowed rounded-2xl border-2 border-gray-300 bg-gray-200 px-8 text-lg font-extrabold text-gray-500">
                ☑️ CHECK-IN MINGGU INI SELESAI
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-6xl">💊</p>
            <p className="mt-2 font-display text-xl font-extrabold text-fez-ink">&ldquo;Saya sudah mengonsumsi TTD minggu ini.&rdquo;</p>
            <p className="mt-1 text-sm text-muted-foreground">Check-in hanya 1× dalam 1 minggu. Tekan tombol jika kamu benar-benar sudah minum TTD ya (jujur itu keren! 😄)</p>
            <Button
              onClick={checkIn} disabled={busy}
              className="mt-4 h-14 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-teal-500 to-emerald-400 px-8 text-lg font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-50"
            >
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "☑️"} CHECK-IN MINGGU INI (+10 XP)
            </Button>
          </>
        )}
        {weekMsg && (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">
            ⚠️ {weekMsg}
            {lastCheckInDate && (
              <> (Check-in terakhir: {new Date(lastCheckInDate + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })})</>
            )}
          </p>
        )}
      </motion.div>

      {/* Pengingat otomatis (push notification) */}
      <PushReminderCard />

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon="💊" value={String(data.totalCheckins)} label="Total Check-in" color="from-teal-100 to-emerald-50" />
        <StatBox icon="🔥" value={`${data.profile.streakWeeks} mgg`} label="Streak Sekarang" color="from-orange-100 to-amber-50" />
        <StatBox icon="🗓️" value={`${weekly.filter((w) => w.done).length}/4`} label="4 Minggu Terakhir" color="from-rose-100 to-pink-50" />
      </div>

      {/* Progress mingguan */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="mb-3 font-display text-lg font-extrabold text-fez-ink">📊 Progress Mingguan</p>
        <div className="grid grid-cols-4 gap-2">
          {weekly.map((w) => (
            <div key={w.label} className={`rounded-2xl border-2 p-3 text-center ${w.current ? "border-fez-rose" : "border-fez-ink/10"}`}>
              <p className="text-2xl">{w.done ? "🔥" : "⭕"}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase text-fez-ink/60">{w.label}</p>
              <p className={`text-[11px] font-extrabold ${w.done ? "text-teal-600" : "text-muted-foreground"}`}>
                {w.done ? "TTD ✔" : "Belum"}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Target program: check-in 1× per minggu (sesuai anjuran 1 TTD/minggu). Streak 4 minggu berturut-turut = BONUS +20 XP (sekali per periode bulan) + badge 🔥 CONSISTENCY QUEEN!
        </p>
      </div>

      {/* Kalender */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-xl border-2 border-fez-ink/15 px-3 py-1.5 text-sm font-extrabold text-fez-ink hover:border-fez-rose">←</button>
          <p className="font-display text-lg font-extrabold text-fez-ink">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button onClick={nextMonth} className="rounded-xl border-2 border-fez-ink/15 px-3 py-1.5 text-sm font-extrabold text-fez-ink hover:border-fez-rose">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {DAY_LABELS.map((d) => (
            <p key={d} className="text-[10px] font-extrabold uppercase text-muted-foreground">{d}</p>
          ))}
          {calendarCells.map((date, i) => {
            if (!date) return <span key={`e${i}`} />;
            const done = checkinSet.has(date);
            const isToday = date === todayStr;
            const dayNum = parseInt(date.slice(8), 10);
            return (
              <motion.div
                key={date}
                initial={{ scale: done ? 1 : 0.9 }} animate={{ scale: 1 }}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 text-sm font-extrabold transition ${
                  done ? "border-teal-500 bg-gradient-to-br from-teal-400 to-emerald-400 text-white"
                  : isToday ? "border-fez-rose bg-rose-50 text-fez-rose"
                  : "border-fez-ink/10 text-fez-ink/60"
                }`}
                title={done ? "Check-in TTD ✓" : undefined}
              >
                {done ? "💊" : dayNum}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1"><span className="flex h-4 w-4 items-center justify-center rounded-md border border-teal-500 bg-teal-400 text-[8px] text-white">✓</span> Sudah minum TTD</span>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-md border-2 border-fez-rose bg-rose-50" /> Hari ini</span>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className={`rounded-2xl border-2 border-fez-ink/10 bg-gradient-to-br ${color} p-3 text-center`}>
      <p className="text-xl">{icon}</p>
      <p className="font-display text-xl font-extrabold text-fez-ink">{value}</p>
      <p className="text-[10px] font-bold uppercase text-fez-ink/50">{label}</p>
    </div>
  );
}
