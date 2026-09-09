"use client";

import { motion } from "framer-motion";
import type { DashData } from "@/components/fezone/app-shell";
import { useFez } from "@/lib/store";
import { BADGES } from "@/lib/constants";
import { BadgeVisual, SectionTitle } from "@/components/fezone/ui-bits";
import { BadgeCheck, Lock } from "lucide-react";

export default function BadgesView({ data }: { data: DashData }) {
  const { setTab } = useFez();
  const earned = data.badges;

  return (
    <div className="space-y-6">
      <SectionTitle icon="🎖" title="KOLEKSI BADGE" sub="Koleksi semua badge sebagai bukti perjalananmu!" />

      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-amber-100 via-rose-100 to-violet-100 p-5 text-center">
        <p className="font-display text-4xl font-extrabold text-fez-ink">
          {earned.length}<span className="text-xl text-muted-foreground">/{BADGES.length}</span>
        </p>
        <p className="text-sm font-bold text-fez-ink/70">badge terkumpul</p>
        <div className="mx-auto mt-3 flex max-w-xs justify-center gap-1.5">
          {BADGES.map((b) => (
            <span
              key={b.key}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-base ${earned.includes(b.key) ? "border-fez-ink bg-white" : "border-gray-300 bg-gray-100 opacity-50 grayscale"}`}
            >
              {earned.includes(b.key) ? b.icon : <Lock className="h-3 w-3 text-gray-400" />}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b, i) => (
          <motion.div key={b.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
            <BadgeVisual def={b} earned={earned.includes(b.key)} />
          </motion.div>
        ))}
      </div>

      {/* Cara mendapat badge */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-fez-ink">
          <BadgeCheck className="h-5 w-5 text-fez-rose" /> Cara Mendapatkannya
        </p>
        <ul className="space-y-2 text-sm text-fez-ink/75">
          {BADGES.map((b) => (
            <li key={b.key} className="flex items-start gap-2.5 rounded-xl bg-cream/50 p-2.5">
              <span className="text-xl">{b.icon}</span>
              <span>
                <span className="font-extrabold text-fez-ink">{b.name}</span> — {b.how}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setTab("missions")} className="rounded-xl border-2 border-fez-ink bg-fez-rose px-4 py-2 text-xs font-extrabold text-white hover:bg-fez-berry">
            🎯 Pergi ke Mission Center
          </button>
          <button onClick={() => setTab("ttd")} className="rounded-xl border-2 border-fez-ink bg-teal-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-teal-600">
            💊 Buka TTD Tracker
          </button>
        </div>
      </div>
    </div>
  );
}
