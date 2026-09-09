import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { PASS_SCORE } from "@/lib/constants";
import { assertMissionUnlocked, completeMission, syncMissionUnlocks } from "@/lib/gamification";

// Mission 5 — Menu Bebas Anemia (evaluasi server-side + feedback edukatif)
// LULUS jika nilai menu >= 80 — XP = 150 × nilai/100, hanya sekali saat lulus pertama.
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  // Validasi unlock server-side (anti manipulasi API/URL)
  const unlocked = await assertMissionUnlocked(pid, "M5");
  if (!unlocked) {
    return NextResponse.json({ error: "Mission 5 masih terkunci. Lulus Mission 4 dulu!" }, { status: 403 });
  }

  const { menu } = await req.json();
  if (!Array.isArray(menu) || menu.length !== 5) {
    return NextResponse.json({ error: "Menu tidak lengkap (5 waktu makan)" }, { status: 400 });
  }

  const { MENU_SLOTS } = await import("@/lib/content-quizzes");

  const pickedNames: string[] = menu.map((m: { slot: string; pick: string }) => m.pick);

  let highIron = 0;
  let vitC = 0;
  let blockers = 0;
  let junk = 0;

  MENU_SLOTS.forEach((slot, idx) => {
    const opt = slot.options.find((o) => o.name === pickedNames[idx]);
    if (!opt) return;
    if (opt.iron === "high") highIron += 1;
    if (opt.iron === "medium") highIron += 0.5;
    if (opt.vitC) vitC += 1;
    if (opt.blocker) blockers += 1;
    if (opt.iron === "none" && !opt.vitC) junk += 1;
  });

  // Penilaian server-side (0-100)
  const lines: string[] = [];
  let grade = 0;

  if (highIron >= 3) {
    grade += 40;
    lines.push(`💪 Mantap! Kamu memilih ${Math.round(highIron)} menu kaya zat besi (bayam, tempe, hati, ikan, telur, kacang). Ini bahan bakar pembentukan darah terbaik!`);
  } else {
    grade += highIron * 13;
    lines.push(`🥗 Menu kaya zat besi kamu baru ${Math.round(highIron)}. Tambahkan sumber zat besi seperti tempe, telur, atau sayur hijau di makan utama ya!`);
  }

  if (vitC >= 1) {
    grade += 25;
    lines.push("🍊 Pintar! Kamu menyandingkan vitamin C (buah/jus) yang meningkatkan serapan zat besi berkali-kali lipat.");
  } else {
    lines.push("🍊 Coba tambahkan buah kaya vitamin C (jeruk, jambu biji, pepaya) sebagai pencuci mulut — pembantu serapan zat besi!");
  }

  if (blockers === 0) {
    grade += 20;
    lines.push("✅ Tidak ada penghambat penyerapan (teh/kopi/susu) di menumu. Keren!");
  } else {
    lines.push(`☕ Hati-hati, ada ${blockers} pilihan mengandung teh/kopi/susu yang menghambat penyerapan zat besi. Jeda 2 jam dari TTD ya!`);
  }

  if (junk <= 1) {
    grade += 15;
    lines.push("🌟 Menumu seimbang dan minim junk food. Pola makan seperti ini bikin tubuh bugar dan fokus belajar terjaga!");
  } else {
    lines.push(`🍩 Ada ${junk} pilihan kurang bergizi. Sedikit demi sedikit ganti dengan snack sehat kaya zat besi seperti kacang rebus ya!`);
  }

  grade = Math.min(100, Math.round(grade));

  // STEP 2 — batas kelulusan nilai >= 80 (80 dianggap LULUS)
  const passed = grade >= PASS_SCORE;

  const mp = await db.missionProgress.findUnique({
    where: { participantId_missionKey: { participantId: pid, missionKey: "M5" } },
  });
  const alreadyCompleted = mp?.status === "COMPLETED";

  if (passed) {
    const xp = Math.round((150 * grade) / 100); // reward maks 150 × nilai/100
    const res = await completeMission(pid, "M5", {
      score: grade,
      xpOverride: alreadyCompleted ? null : xp, // XP hanya sekali
      dataJson: JSON.stringify({ menu: pickedNames, grade }),
    });
    await syncMissionUnlocks(pid);
    return NextResponse.json({
      ok: true,
      completed: !res.already,
      score: grade,
      passScore: PASS_SCORE,
      xpEarned: res.xpAwarded,
      alreadyRewarded: res.already,
      feedback: {
        ok: true,
        title: "Menumu Juara! 🌟",
        lines,
      },
    });
  }

  // Belum lulus → 0 XP, feedback umum TANPA membocorkan kombinasi jawaban terbaik
  return NextResponse.json({
    ok: true,
    completed: false,
    score: grade,
    passScore: PASS_SCORE,
    xpEarned: 0,
    feedback: {
      ok: false,
      title: "Belum Lulus — Nilai menu kamu " + grade,
      lines: [
        `❌ Belum Lulus. Nilai menu kamu: ${grade}. Nilai kelulusan: ≥${PASS_SCORE}.`,
        "Susun ulang menumu: pastikan ada menu kaya zat besi di makan utama, vitamin C sebagai pendamping, dan hindari teh/kopi/susu bersama makan.",
        "Silakan susun ulang menu untuk mencapai nilai minimal 80.",
      ],
    },
  });
}
