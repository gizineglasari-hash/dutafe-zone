// ============================================================
// FE-ZONE — Simulasi TEST 1-10 sesuai spesifikasi kelulusan
// Dijalankan: bun run scripts/run-spec-tests.ts
// ============================================================
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
let cookie = "";
const results: { test: string; pass: boolean; note: string }[] = [];

function log(test: string, pass: boolean, note: string) {
  results.push({ test, pass, note });
  console.log(`${pass ? "✅" : "❌"} ${test} — ${note}`);
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let body: Record<string, unknown> = {};
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

// Bank soal (untuk menyusun jawaban benar/salah)
const Q = await import("../src/lib/content-quizzes");

function answersFor(bank: { answer: number }[], correctCount: number) {
  return bank.map((q, i) => (i < correctCount ? q.answer : (q.answer + 1) % q.options.length ?? (q.answer + 1)));
}

async function main() {
  const uname = `tester_${Date.now()}@test.id`;
  // Registrasi peserta baru (SMP)
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Tester Spesifikasi", age: 13, school: "SMP Tester", educationLevel: "SMP", username: uname, password: "tes12345" }),
  });
  if (reg.status !== 200) { console.error("Registrasi gagal", reg.body); process.exit(1); }
  console.log(`Peserta uji terdaftar: ${uname}\n`);

  const p = await db.participant.findUniqueOrThrow({ where: { userId: (reg.body as { user: { id: string } }).user.id } });
  const xp0 = p.xp;

  // ===== TEST 1 — Nilai tepat 80 = LULUS (pre-test 8/10 = 80) =====
  let r = await api("/api/participant/quiz", {
    method: "POST",
    body: JSON.stringify({ quizKey: "PRETEST", level: "SMP", answers: answersFor(Q.QUIZ_PRETEST, 8) }),
  });
  const t1 = r.body as { passed: boolean; score: number; xpEarned: number; showAnswerKey: boolean; detail: unknown[] | null };
  log("TEST 1 (nilai 80)", t1.passed === true && t1.score === 80 && t1.xpEarned === 40 && t1.showAnswerKey === true && Array.isArray(t1.detail),
    `score=80 → PASSED, XP=round(50×80/100)=40 (dapat ${t1.xpEarned}), kunci jawaban=${t1.showAnswerKey}`);

  // ===== TEST 2 — Tepat di bawah batas (pre-test tetap <80 setelah retake dengan 7/10=70) =====
  r = await api("/api/participant/quiz", {
    method: "POST",
    body: JSON.stringify({ quizKey: "PRETEST", level: "SMP", answers: answersFor(Q.QUIZ_PRETEST, 7) }),
  });
  const t2 = r.body as { passed: boolean; score: number; xpEarned: number; showAnswerKey: boolean; detail: unknown[] | null; correct: unknown };
  log("TEST 2 (nilai <80)", t2.passed === false && t2.score === 70 && t2.xpEarned === 0 && t2.showAnswerKey === false && t2.detail === null && t2.correct === null,
    `score=70 → FAILED, XP=0 (dapat ${t2.xpEarned}), kunci disembunyikan=${!t2.showAnswerKey && t2.detail === null}`);

  // ===== Unlock: M1 terbuka, M3-M9 terkunci di awal =====
  let m = await api("/api/participant/missions");
  let missions = (m.body as { missions: { key: string; status: string }[] }).missions;
  const st = (k: string) => missions.find((x) => x.key === k)?.status ?? "MISSING";
  log("Kondisi awal misi", st("M1") !== "LOCKED" && st("M2") !== "LOCKED" && ["M3","M4","M5","M6","M7","M8","M9"].every((k) => st(k) === "LOCKED"),
    `M1=${st("M1")} M2=${st("M2")} M3=${st("M3")} M4=${st("M4")} M5=${st("M5")} M6=${st("M6")} M7=${st("M7")} M8=${st("M8")} M9=${st("M9")}`);

  // Anti-manipulasi: quiz M3 (senjata) harus ditolak selagi terkunci
  r = await api("/api/participant/quiz", { method: "POST", body: JSON.stringify({ quizKey: "M2", level: "SMP", answers: answersFor(Q.QUIZ_M2.SMP, 6) }) });
  log("Anti-manipulasi (quiz misi terkunci)", r.status === 403, `POST quiz M3 saat terkunci → HTTP ${r.status}`);

  // Anti-manipulasi: start misi terkunci ditolak
  r = await api("/api/participant/missions", { method: "POST", body: JSON.stringify({ missionKey: "M4", action: "start" }) });
  log("Anti-manipulasi (start misi terkunci)", r.status === 403, `start M4 saat terkunci → HTTP ${r.status}`);

  // ===== TEST 6 — Gagal dulu (M1), lalu lulus =====
  r = await api("/api/participant/quiz", { method: "POST", body: JSON.stringify({ quizKey: "M1", level: "SMP", answers: answersFor(Q.QUIZ_M1.SMP, 3) }) });
  const t6a = r.body as { passed: boolean; xpEarned: number; score: number; showAnswerKey: boolean };
  log("TEST 6a (M1 gagal 50)", t6a.passed === false && t6a.xpEarned === 0 && t6a.showAnswerKey === false, `score=${t6a.score} → FAILED, XP=${t6a.xpEarned}, kunci=${t6a.showAnswerKey}`);

  r = await api("/api/participant/quiz", { method: "POST", body: JSON.stringify({ quizKey: "M1", level: "SMP", answers: answersFor(Q.QUIZ_M1.SMP, 5) }) });
  const t6b = r.body as { passed: boolean; xpEarned: number; score: number; missionCompleted: boolean };
  const xpAfterM1 = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  log("TEST 6b (M1 lulus 83)", t6b.passed === true && t6b.xpEarned === 83 && t6b.missionCompleted === true,
    `score=${t6b.score} → PASSED, XP=round(100×83/100)=83 (dapat ${t6b.xpEarned}); XP total ${xp0}→${xpAfterM1}`);

  m = await api("/api/participant/missions");
  missions = (m.body as { missions: { key: string; status: string }[] }).missions;
  log("Unlock rantai (M1 lulus → M3 terbuka)", st("M3") === "STARTED" && st("M4") === "LOCKED", `M3=${st("M3")}, M4=${st("M4")}`);

  // ===== TEST 8 — XP ganda dicegah (ulang M1 lulus lagi) =====
  r = await api("/api/participant/quiz", { method: "POST", body: JSON.stringify({ quizKey: "M1", level: "SMP", answers: answersFor(Q.QUIZ_M1.SMP, 6) }) });
  const t8 = r.body as { passed: boolean; xpEarned: number; alreadyRewarded: boolean; score: number };
  const mp1 = await db.missionProgress.findUniqueOrThrow({ where: { participantId_missionKey: { participantId: p.id, missionKey: "M1" } } });
  log("TEST 8 (tanpa XP ganda)", t8.xpEarned === 0 && t8.alreadyRewarded === true && mp1.xpAwarded === 83,
    `ulang M1 score=${t8.score} → XP=${t8.xpEarned} (alreadyRewarded=${t8.alreadyRewarded}); xpAwarded DB tetap ${mp1.xpAwarded}`);

  // ===== M3 — lulus → M4 terbuka; TEST 3/4 ekuivalen via proporsional =====
  r = await api("/api/participant/quiz", { method: "POST", body: JSON.stringify({ quizKey: "M2", level: "SMP", answers: answersFor(Q.QUIZ_M2.SMP, 6) }) });
  const t3 = r.body as { passed: boolean; xpEarned: number; score: number; showAnswerKey: boolean };
  log("TEST 3/4 (M3 lulus 100)", t3.passed === true && t3.score === 100 && t3.xpEarned === 100 && t3.showAnswerKey === true,
    `score=${t3.score} → PASSED, XP=${t3.xpEarned} (round(100×100/100)), kunci terbuka=${t3.showAnswerKey}`);

  // ===== M4 Food Hunt — gagal lalu lulus (XP proporsional sekali) =====
  r = await api("/api/participant/foodhunt", { method: "POST", body: JSON.stringify({ picked: [0, 1] }) });
  const tf = r.body as { passed: boolean; xpEarned: number; score: number };
  log("M4 gagal", tf.passed === false && tf.xpEarned === 0, `score=${tf.score} → FAILED, XP=${tf.xpEarned}`);
  r = await api("/api/participant/foodhunt", { method: "POST", body: JSON.stringify({ picked: [0, 1, 2, 3, 4, 5, 6, 7] }) });
  const tf2 = r.body as { passed: boolean; xpEarned: number; score: number; badge: string | null };
  log("M4 lulus (8 benar, 0 salah → 100)", tf2.passed === true && tf2.score === 100 && tf2.xpEarned === 100 && tf2.badge === "IRON_FOOD_HUNTER",
    `score=${tf2.score} → PASSED, XP=${tf2.xpEarned}, badge=${tf2.badge}`);
  r = await api("/api/participant/foodhunt", { method: "POST", body: JSON.stringify({ picked: [0, 1, 2, 3, 4, 5, 6, 7] }) });
  const tf3 = r.body as { xpEarned: number };
  log("M4 tanpa XP ganda", tf3.xpEarned === 0, `ulang → XP=${tf3.xpEarned}`);

  // ===== M5 Menu — nilai tepat 80 → LULUS (uji batas >=) =====
  // highIron≥3 (40) + vitC≥1 (25) + 1 blocker (0) + junk≤1 (15) = 80
  const menu80 = [
    { slot: "Sarapan", pick: "Nasi + telur dadar + tumis bayam" },      // high
    { slot: "Snack Pagi", pick: "Segelas jus jambu biji" },             // vitC
    { slot: "Makan Siang", pick: "Nasi + ikan bakar + capcay sayur hijau" }, // high
    { slot: "Snack Sore", pick: "Susu + biskuit" },                     // blocker
    { slot: "Makan Malam", pick: "Nasi + tumis hati ayam + brokoli" },  // high
  ];
  r = await api("/api/participant/menu", { method: "POST", body: JSON.stringify({ menu: menu80 }) });
  const tm = r.body as { completed: boolean; score: number; xpEarned: number; passed?: boolean };
  log("TEST 1-ekuivalen (menu nilai tepat 80)", tm.completed === true && tm.score === 80 && tm.xpEarned === 120,
    `grade=${tm.score} (tepat 80) → PASSED (membuktikan >=, bukan >), XP=round(150×80/100)=120 (dapat ${tm.xpEarned})`);

  // ===== M6 Mitos — gagal → tanpa kunci; lulus → kunci + XP =====
  r = await api("/api/participant/myth", { method: "POST", body: JSON.stringify({ answers: Q.MYTHS.map(() => true) }) });
  const ty1 = r.body as { passed: boolean; xpEarned: number; showAnswerKey: boolean; detail: unknown[] | null; score: number };
  log("M6 gagal tanpa kunci", ty1.passed === false && ty1.xpEarned === 0 && ty1.showAnswerKey === false && ty1.detail === null,
    `score=${ty1.score} → FAILED, kunci=${ty1.showAnswerKey}, detail=${ty1.detail === null ? "null" : "ada"}`);
  r = await api("/api/participant/myth", { method: "POST", body: JSON.stringify({ answers: Q.MYTHS.map((m2) => m2.isFact) }) });
  const ty2 = r.body as { passed: boolean; xpEarned: number; showAnswerKey: boolean; detail: unknown[] | null; score: number };
  log("M6 lulus 100 + kunci", ty2.passed === true && ty2.score === 100 && ty2.xpEarned === 100 && ty2.showAnswerKey === true && Array.isArray(ty2.detail),
    `score=${ty2.score} → PASSED, XP=${ty2.xpEarned}, pembahasan terbuka=${Array.isArray(ty2.detail)}`);

  // ===== M7 Spread — WhatsApp saja, target 5 =====
  r = await api("/api/participant/spread", { method: "POST", body: JSON.stringify({ platform: "instagram", contentId: "EDU_X" }) });
  log("M7 tolak non-WhatsApp", r.status === 400, `platform instagram → HTTP ${r.status}`);
  for (let i = 1; i <= 4; i++) {
    r = await api("/api/participant/spread", { method: "POST", body: JSON.stringify({ platform: "whatsapp", contentId: `EDU_${i}` }) });
  }
  const ts4 = r.body as { total: number; completed: boolean; xpEarned: number };
  log("M7 progress 4/5 belum lulus", ts4.total === 4 && ts4.completed === false && ts4.xpEarned === 0, `total=${ts4.total}/5, completed=${ts4.completed}`);
  r = await api("/api/participant/spread", { method: "POST", body: JSON.stringify({ platform: "whatsapp", contentId: "EDU_5" }) });
  const ts5 = r.body as { total: number; completed: boolean; xpEarned: number; badge: string | null };
  log("M7 share ke-5 → LULUS +200 XP", ts5.total === 5 && ts5.completed === true && ts5.xpEarned === 200 && ts5.badge === "PEER_EDUCATOR",
    `total=${ts5.total}/5 → completed, XP=${ts5.xpEarned}, badge=${ts5.badge}`);
  m = await api("/api/participant/missions");
  missions = (m.body as { missions: { key: string; status: string }[] }).missions;
  log("Unlock berantai (M4-M8 terbuka, M9 terkunci)", ["M4", "M5", "M6", "M7", "M8"].every((k) => st(k) !== "LOCKED") && st("M9") === "LOCKED",
    `M4=${st("M4")} M5=${st("M5")} M6=${st("M6")} M7=${st("M7")} M8=${st("M8")} M9=${st("M9")} (M9 baru terbuka setelah M8 LULUS)`);

  // ===== TEST 9 — TTD 1×/minggu =====
  r = await api("/api/participant/ttd", { method: "POST" });
  const tk1 = r.body as { ok: boolean; xpEarned: number };
  log("TEST 9a (check-in minggu ini +10)", tk1.ok === true && tk1.xpEarned === 10, `XP=${tk1.xpEarned}`);
  r = await api("/api/participant/ttd", { method: "POST" });
  const tk2 = r.body as { ok: boolean; xpEarned: number; message: string };
  log("TEST 9b (check-in kedua ditolak)", tk2.ok === false && tk2.xpEarned === 0 && tk2.message.includes("minggu ini"),
    `ditolak: "${tk2.message}"`);

  // ===== TEST 10 — Iron Streak 4 minggu → bonus +20 sekali =====
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const back = (days: number) => fmt(new Date(Date.now() - days * 24 * 3600 * 1000));
  await db.tTDCheckIn.createMany({
    data: [back(7), back(14), back(21)].map((date) => ({ participantId: p.id, date, xp: 10 })),
  });
  const xpBeforeBonus = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  r = await api("/api/participant/ttd", { method: "POST" }); // masih ditolak (sudah check-in minggu ini)
  // trigger checkTrackerMissions via GET ttd (streak kini 4)
  r = await api("/api/participant/ttd");
  const tb = r.body as { streak: number };
  const xpAfterBonus = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  const bonusLogs = await db.activityLog.count({ where: { participantId: p.id, type: "STREAK_BONUS" } });
  log("TEST 10a (streak 4 → bonus +20 sekali)", tb.streak === 4 && xpAfterBonus - xpBeforeBonus === 20 && bonusLogs === 1,
    `streak=${tb.streak}, XP +${xpAfterBonus - xpBeforeBonus} (bonus 20 sekali), log STREAK_BONUS=${bonusLogs}`);

  // refresh → tidak ada bonus tambahan
  await api("/api/participant/missions");
  await api("/api/participant/ttd");
  const xpAfterRefresh = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  const bonusLogs2 = await db.activityLog.count({ where: { participantId: p.id, type: "STREAK_BONUS" } });
  log("TEST 10b (refresh tanpa bonus tambahan)", xpAfterRefresh === xpAfterBonus && bonusLogs2 === 1,
    `XP tetap ${xpAfterRefresh}, log bonus tetap ${bonusLogs2}`);

  // ===== M8 — video peer educator butuh M8 terbuka (sudah) & approve admin dengan XP 0-300 =====
  // (kiriman multipart disimulasikan langsung via DB karena fokus = aturan XP)
  const content = await db.communityContent.create({
    data: { participantId: p.id, contentType: "peer_educator", title: "Video Uji XP Admin", platform: "youtube", externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", status: "PENDING" },
  });
  // login admin
  cookie = "";
  await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin@fezone.id", password: "admin123", mode: "admin" }) });
  r = await api("/api/admin/community", { method: "POST", body: JSON.stringify({ action: "approve", contentId: content.id, xpAward: 999 }) });
  log("M8 tolak XP > 300", r.status === 400, `xpAward=999 → HTTP ${r.status}`);
  r = await api("/api/admin/community", { method: "POST", body: JSON.stringify({ action: "approve", contentId: content.id, xpAward: 250 }) });
  const tadm = r.body as { xpDelta: number };
  const xpAfterAdmin = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  log("M8 approve + XP admin 250 (sekali)", tadm.xpDelta === 250 && xpAfterAdmin === xpAfterRefresh + 250,
    `xpDelta=${tadm.xpDelta}, XP ${xpAfterRefresh}→${xpAfterAdmin}`);
  r = await api("/api/admin/community", { method: "POST", body: JSON.stringify({ action: "approve", contentId: content.id, xpAward: 250 }) });
  const xpAfterReApprove = (await db.participant.findUniqueOrThrow({ where: { id: p.id } })).xp;
  const tadm2 = r.body as { xpDelta: number };
  log("M8 re-approve tanpa XP ganda", tadm2.xpDelta === 0 && xpAfterReApprove === xpAfterAdmin,
    `re-approve → xpDelta=${tadm2.xpDelta}, XP tetap ${xpAfterReApprove}`);

  // ===== Ringkasan =====
  const failed = results.filter((x) => !x.pass);
  console.log(`\n========== HASIL: ${results.length - failed.length}/${results.length} LOLOS ==========`);
  if (failed.length) { failed.forEach((f) => console.log(`❌ ${f.test}: ${f.note}`)); process.exitCode = 1; }
}

main().finally(() => db.$disconnect());
