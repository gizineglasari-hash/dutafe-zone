"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEdu } from "@/lib/edu-client";
import { SectionTitle } from "@/components/fezone/ui-bits";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlayCircle } from "lucide-react";

const TONES: Record<string, { bg: string; border: string; chip: string }> = {
  rose: { bg: "from-rose-50 to-pink-50", border: "border-rose-200", chip: "bg-rose-100" },
  teal: { bg: "from-teal-50 to-cyan-50", border: "border-teal-200", chip: "bg-teal-100" },
  amber: { bg: "from-amber-50 to-yellow-50", border: "border-amber-200", chip: "bg-amber-100" },
  green: { bg: "from-emerald-50 to-lime-50", border: "border-emerald-200", chip: "bg-emerald-100" },
  violet: { bg: "from-violet-50 to-purple-50", border: "border-violet-200", chip: "bg-violet-100" },
  cyan: { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200", chip: "bg-cyan-100" },
};

export default function EdukasiView() {
  const { setTab } = useFez();
  const EDU = useEdu(); // konten editan admin (fallback: konten bawaan)
  const [active, setActive] = useState<string | null>(null);
  const cat = EDU.find((c) => c.key === active);

  if (cat) {
    const tone = TONES[cat.cards[0].tone ?? "rose"] ?? TONES.rose;
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setActive(null)} className="mb-4 rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
          <ChevronLeft className="h-4 w-4" /> Semua Kategori
        </Button>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`mb-5 rounded-3xl border-2 border-fez-ink bg-gradient-to-br ${tone.bg} p-5`}>
            <p className="text-4xl">{cat.icon}</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-fez-ink">{cat.title}</h2>
            <p className="text-sm text-fez-ink/60">{cat.subtitle}</p>
          </div>

          <div className="space-y-4">
            {cat.cards.map((card, i) => {
              const t = TONES[card.tone ?? "rose"] ?? TONES.rose;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className={`rounded-3xl border-2 border-fez-ink bg-gradient-to-br ${t.bg} p-4 sm:p-5`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-fez-ink ${t.chip} text-xl`}>{card.icon}</span>
                    <p className="font-display text-lg font-extrabold text-fez-ink">{card.title}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {card.points.map((pt, j) => (
                      <div key={j} className="flex items-start gap-2 rounded-xl border border-fez-ink/10 bg-white/80 p-2.5">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.chip} text-[10px] font-extrabold text-fez-ink`}>{j + 1}</span>
                        <p className="text-[13px] leading-snug text-fez-ink/80">{pt}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 rounded-3xl border-2 border-dashed border-fez-rose/50 bg-rose-50/50 p-4 text-center">
            <p className="text-sm font-bold text-fez-ink">💡 <span className="font-extrabold">Tahukah kamu?</span> {cat.tip}</p>
            <Button onClick={() => setTab("missions")} className="mt-3 h-11 rounded-2xl border-2 border-fez-ink bg-fez-rose px-5 font-extrabold text-white hover:bg-fez-berry">
              <PlayCircle className="mr-1.5 h-5 w-5" /> Uji Pemahamanmu di Mission Center
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon="📚" title="POJOK EDUKASI" sub="Materi seru dalam potongan kecil — gampang dicerna!" />

      {/* Banner edukasi interaktif */}
      <div className="mb-5 overflow-hidden rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 p-5 text-white">
        <p className="font-display text-xl font-extrabold">🩸 Fakta Cepat:</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={0}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-1 text-sm leading-relaxed text-white/90"
          >
            Sekitar <span className="font-extrabold text-amber-200">1 dari 3 remaja putri di Indonesia mengalami anemia</span> —
            dan kebanyakan tidak menyadarinya! Gejala awalnya cuma lemas &amp; pucat. Cek dirimu dan teman-temanmu, ya!
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EDU.map((c, i) => (
          <motion.button
            key={c.key}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setActive(c.key)}
            className="card-pop flex items-start gap-3 rounded-3xl border-2 border-fez-ink bg-white p-4 text-left"
          >
            <span className="flex h-14 w-14 shrink-0 rotate-[-3deg] items-center justify-center rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-amber-100 to-rose-100 text-3xl sticker-sm">
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-extrabold text-fez-ink">{c.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{c.subtitle}</p>
              <p className="mt-1.5 text-[11px] font-extrabold text-fez-rose">{c.cards.length} kartu materi →</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
