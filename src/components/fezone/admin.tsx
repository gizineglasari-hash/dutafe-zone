"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Activity, BarChart3, BookOpen, CheckCircle2, ClipboardList, Crown, Download, Eye, FileSpreadsheet, Flame, GraduationCap, ImageUp, KeyRound, LayoutDashboard, Loader2,
  LogOut, Pill, RefreshCw, School, Search, Trash2, Trophy, UserCheck, Users, Video, XCircle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DUTA_WEIGHTS } from "@/lib/constants";
import { PLATFORM_LABEL, PLATFORM_ICON } from "@/lib/video";
import { SiteCredit } from "@/components/fezone/ui-bits";
import AdminPushCard from "@/components/fezone/admin-push-card";
import AdminEduEditor from "@/components/fezone/admin-edu-editor";

// ============================================================
// Admin Login
// ============================================================
export function AdminLogin() {
  const { setView, setUser } = useFez();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, mode: "admin" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Akses ditolak", description: data.error, variant: "destructive" });
      return;
    }
    setUser({ id: data.user.id, username: data.user.username, role: "ADMIN" });
    setView("admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#3d1526] px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => setView("landing")} className="mb-3 text-sm font-bold text-white/40 hover:text-white/80">
          ← Kembali ke Beranda
        </button>
        <div className="rounded-[2rem] border-2 border-amber-300/40 bg-white p-8 shadow-2xl">
          <div className="mb-5 text-center">
            <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3d1526] text-2xl">🛡️</span>
            <h1 className="font-display text-2xl font-extrabold text-fez-ink">Login Admin FE-ZONE</h1>
            <p className="mt-1 text-sm text-muted-foreground">Panel pengelolaan program duta</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="font-bold text-fez-ink">Email Admin</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin@fezone.id" className="mt-1 h-12 rounded-xl border-2" required />
            </div>
            <div>
              <Label className="font-bold text-fez-ink">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-12 rounded-xl border-2" required />
            </div>
            <Button disabled={busy} className="h-13 w-full rounded-2xl bg-[#3d1526] py-3 font-extrabold text-white hover:bg-[#5c2040]">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Masuk Panel Admin"}
            </Button>
            <p className="text-center text-[11px] font-semibold text-muted-foreground">
              Halaman khusus pengelola program FE-ZONE
            </p>
            <a
              href="/admin/pulihkan"
              className="mx-auto block text-center text-[11px] font-extrabold text-[#3d1526]/50 underline-offset-2 hover:text-[#3d1526] hover:underline"
            >
              Lupa password admin?
            </a>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Admin Dashboard
// ============================================================
interface Overview {
  stats: {
    total: number; totalSmp: number; totalSma: number; missionsCompleted: number; totalCheckins: number; active: number;
    candidates: number; dutas: number; avgPre: number; avgPost: number; gain: number;
    avgXp: number; totalXp: number; improvementRate: number; bothTests: number;
    ttdParticipants: number; ttdLast7: number; ttdTrendPct: number;
    totalBadges: number; videosPending: number; videosApproved: number;
    contentsPending: number; contentsApproved: number; totalLikes: number;
  };
  charts: {
    smpVsSma: { name: string; value: number }[];
    perSchool: { school: string; SMP: number; SMA: number }[];
    perMission: { mission: string; completed: number; rate: number }[];
    ttdDaily: { date: string; count: number }[];
    prePost: { name: string; value: number }[];
    levelDistribution: { level: string; count: number }[];
    badgeDistribution: { badge: string; count: number }[];
    registrationsTrend: { week: string; count: number }[];
  };
  schoolRanking: { school: string; participants: number; totalXp: number; avgXp: number; avgGain: number | null }[];
  insights: { icon: string; text: string }[];
  dutaCandidates: {
    id: string; name: string; school: string; educationLevel: string; xp: number; level: string;
    score: { knowledge: number; missions: number; ttd: number; peer: number; creativity: number; activity: number; total: number };
    isDuta: boolean;
  }[];
}

interface AdminRow {
  id: string; name: string; age: number; school: string; schoolCity: string | null; schoolDistrict: string | null; schoolType: string | null;
  educationLevel: string; phone: string | null; username: string; joinedAt: string;
  xp: number; level: number; levelName: string; levelIcon: string; badges: string[];
  missionsCompleted: number; streakWeeks: number; preTestScore: number | null; postTestScore: number | null;
  isDutaCandidate: boolean; isDuta: boolean; hasPendingVideo: boolean;
}

interface PendingVideo { id: string; participantId: string; missionKey: string; fileUrl: string; fileName: string; status: string; grade: number | null; participant?: { name: string; school: string } }

// ============================================================
// Ekspor Data Peserta → PDF & Excel
// ============================================================
function fmtDateId(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const EXPORT_HEADERS = [
  "No", "Nama", "Email", "Usia", "Sekolah", "Kota", "Kecamatan", "Status Sekolah", "Tingkat", "Telepon",
  "XP", "Level", "Misi Selesai", "Jumlah Badge", "Streak (pekan)", "Nilai Pre-Test", "Nilai Post-Test",
  "Status Duta", "Tanggal Gabung",
];

function toExportRows(rows: AdminRow[]): (string | number)[][] {
  return rows.map((r, i) => [
    i + 1,
    r.name,
    r.username,
    r.age,
    r.school,
    r.schoolCity ?? "–",
    r.schoolDistrict ?? "–",
    r.schoolType ?? "–",
    r.educationLevel,
    r.phone ?? "–",
    r.xp,
    `Lv${r.level}`,
    `${r.missionsCompleted}/9`,
    r.badges.length,
    r.streakWeeks,
    r.preTestScore ?? "–",
    r.postTestScore ?? "–",
    r.isDuta ? "Duta Terpilih" : r.isDutaCandidate ? "Kandidat Duta" : "Peserta",
    fmtDateId(r.joinedAt),
  ]);
}

async function exportExcel(rows: AdminRow[]): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...toExportRows(rows)]);
  ws["!cols"] = [
    { wch: 4 }, { wch: 26 }, { wch: 28 }, { wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 17 }, { wch: 15 }, { wch: 9 }, { wch: 16 },
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 13 }, { wch: 14 }, { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Peserta");
  XLSX.writeFile(wb, `FE-ZONE-Data-Peserta-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportPdf(rows: AdminRow[]): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("FE-ZONE — Data Peserta", 40, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Dicetak: ${new Date().toLocaleString("id-ID")}  ·  Jumlah: ${rows.length} peserta  ·  Dinkes Kota Bandung`,
    40, 54
  );
  doc.setTextColor(0);
  autoTable(doc, {
    head: [EXPORT_HEADERS],
    body: toExportRows(rows),
    startY: 66,
    styles: { fontSize: 6.3, cellPadding: 2.6, overflow: "linebreak" },
    headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [253, 242, 248] },
    margin: { left: 30, right: 30 },
  });
  doc.save(`FE-ZONE-Data-Peserta-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// Analisa Kunjungan Web (ala Vercel Analytics)
// ============================================================
interface TrafficData {
  range: { from: string; to: string };
  totals: { visitors: number; pageviews: number; liveNow: number; avgPages: number };
  topPages: { path: string; views: number; visitors: number }[];
  devices: { device: string; visitors: number }[];
  browsers: { browser: string; visitors: number }[];
  daily: { date: string; views: number; visitors: number }[];
}

type TrafficPreset = "today" | "7d" | "30d" | "custom";

const DEVICE_ICON: Record<string, string> = { Desktop: "💻", Mobile: "📱", Tablet: "📲" };

const PAGE_LABEL: Record<string, string> = {
  "/": "Beranda",
  "/masuk": "Halaman Masuk/Daftar",
  "/admin": "Panel Admin",
  "/lupa-password": "Lupa Password",
  "/reset-password": "Reset Password",
  "/admin/pulihkan": "Pemulihan Admin",
};

const APP_TAB_LABEL: Record<string, string> = {
  dashboard: "App · Dashboard",
  edukasi: "App · Edukasi",
  missions: "App · Mission",
  ttd: "App · TTD Tracker",
  leaderboard: "App · Leaderboard",
  community: "App · Community",
  badges: "App · Badge",
  duta: "App · Duta Challenge",
  profile: "App · Profil",
};

function pageLabel(path: string): string {
  if (PAGE_LABEL[path]) return PAGE_LABEL[path];
  if (path.startsWith("/app/")) return APP_TAB_LABEL[path.slice(5)] ?? `App · ${path.slice(5)}`;
  return path;
}

// Tanggal dalam zona WIB (program berbasis Bandung)
function wibTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
function wibDaysAgoStr(n: number): string {
  return new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
function fmtDateShort(s: string): string {
  try {
    return new Date(`${s}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}
function fmtDateTick(s: string): string {
  try {
    return new Date(`${s}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return s;
  }
}

async function exportTrafficExcel(t: TrafficData): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const periode = `${fmtDateShort(t.range.from)} s.d. ${fmtDateShort(t.range.to)}`;
  const ringkasan = XLSX.utils.aoa_to_sheet([
    ["LAPORAN STATISTIK KUNJUNGAN WEB FE-ZONE"],
    ["Periode", periode],
    ["Dicetak", new Date().toLocaleString("id-ID")],
    [],
    ["Indikator", "Nilai"],
    ["Sedang Online (5 menit terakhir)", t.totals.liveNow],
    ["Pengunjung Unik", t.totals.visitors],
    ["Total Kunjungan Halaman", t.totals.pageviews],
    ["Rata-rata Halaman per Pengunjung", t.totals.avgPages],
  ]);
  ringkasan["!cols"] = [{ wch: 38 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ringkasan, "Ringkasan");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Peringkat", "Halaman", "Kunjungan", "Pengunjung Unik"],
    ...t.topPages.map((p, i) => [i + 1, pageLabel(p.path), p.views, p.visitors]),
  ]), "Halaman Terpopuler");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Perangkat", "Pengunjung Unik"],
    ...t.devices.map((d) => [d.device, d.visitors]),
  ]), "Perangkat");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Browser", "Pengunjung Unik"],
    ...t.browsers.map((b) => [b.browser, b.visitors]),
  ]), "Browser");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Tanggal", "Kunjungan", "Pengunjung Unik"],
    ...t.daily.map((d) => [fmtDateShort(d.date), d.views, d.visitors]),
  ]), "Tren Harian");
  XLSX.writeFile(wb, `FE-ZONE-Kunjungan-${t.range.from}_${t.range.to}.xlsx`);
}

async function exportTrafficPdf(t: TrafficData): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("FE-ZONE — Laporan Statistik Kunjungan Web", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Periode: ${fmtDateShort(t.range.from)} s.d. ${fmtDateShort(t.range.to)}  ·  Dicetak: ${new Date().toLocaleString("id-ID")}  ·  Dinkes Kota Bandung`,
    40, 56
  );
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Ringkasan", 40, 86);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const sum: [string, string][] = [
    ["Sedang online (5 menit terakhir)", String(t.totals.liveNow)],
    ["Pengunjung unik", String(t.totals.visitors)],
    ["Total kunjungan halaman", String(t.totals.pageviews)],
    ["Rata-rata halaman per pengunjung", String(t.totals.avgPages)],
  ];
  sum.forEach(([k, v], i) => doc.text(`${k} : ${v}`, 48, 104 + i * 14));

  autoTable(doc, {
    head: [["No", "Halaman", "Kunjungan", "Pengunjung Unik"]],
    body: t.topPages.map((p, i) => [i + 1, pageLabel(p.path), p.views, p.visitors]),
    startY: 170,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [253, 242, 248] },
    margin: { left: 40, right: 40 },
  });
  autoTable(doc, {
    head: [["Jenis", "Kategori", "Pengunjung Unik"]],
    body: [
      ...t.devices.map((d) => ["Perangkat", d.device, d.visitors] as (string | number)[]),
      ...t.browsers.map((b) => ["Browser", b.browser, b.visitors] as (string | number)[]),
    ],
    startY: lastY() + 24,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 250] },
    margin: { left: 40, right: 40 },
  });
  autoTable(doc, {
    head: [["Tanggal", "Kunjungan", "Pengunjung Unik"]],
    body: t.daily.map((d) => [fmtDateShort(d.date), d.views, d.visitors]),
    startY: lastY() + 24,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [61, 21, 38], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 240, 232] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`FE-ZONE-Kunjungan-${t.range.from}_${t.range.to}.pdf`);
}

interface ModContent {
  id: string; contentType: string; title: string; description: string | null;
  platform: string; externalUrl: string | null; videoUrl: string | null; thumbnailUrl: string | null;
  durationSec: number | null; status: string; likesCount: number; xpAwarded: number;
  rejectReason: string | null; createdAt: string;
  participant: { id: string; name: string; school: string; educationLevel: string; avatar: string; profilePhotoUrl: string | null };
}

export function AdminDashboard() {
  const { reset } = useFez();
  const [tab, setTab] = useState<"overview" | "traffic" | "participants" | "duta" | "videos" | "moderation" | "konten" | "settings">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [filters, setFilters] = useState({ level: "", school: "", q: "", lvl: "", duta: "" });
  const [grades, setGrades] = useState<Record<string, { grade: string; note: string }>>({});
  const [winners, setWinners] = useState(1);
  const [modContents, setModContents] = useState<ModContent[]>([]);
  const [modStatus, setModStatus] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [modType, setModType] = useState<"all" | "education" | "peer_educator">("all");
  const [rejectReason, setRejectReason] = useState<{ id: string; value: string } | null>(null);
  const [preview, setPreview] = useState<ModContent | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [dinkesLogoUrl, setDinkesLogoUrl] = useState<string | null>(null);
  const [approveXp, setApproveXp] = useState<{ id: string; peer: boolean; value: string } | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminRow | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetting, setResetting] = useState(false);
  // Analisa kunjungan web
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [trafficPreset, setTrafficPreset] = useState<TrafficPreset>("7d");
  const [trafficRange, setTrafficRange] = useState({ from: wibDaysAgoStr(6), to: wibTodayStr() });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficExporting, setTrafficExporting] = useState<"pdf" | "excel" | null>(null);
  // Hapus peserta
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doResetPassword() {
    if (!resetTarget) return;
    const np = resetPass.trim();
    if (np.length < 6) {
      toast({ title: "Password terlalu pendek", description: "Minimal 6 karakter.", variant: "destructive" });
      return;
    }
    setResetting(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: resetTarget.id, newPassword: np }),
    });
    const data = await res.json();
    setResetting(false);
    if (!res.ok) {
      toast({ title: "Gagal reset password", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Password berhasil direset", description: `Password baru untuk ${resetTarget.name}: ${np} — catat dan sampaikan ke peserta.` });
    setResetTarget(null);
    setResetPass("");
  }

  const loadTraffic = useCallback(async () => {
    setTrafficLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?from=${trafficRange.from}&to=${trafficRange.to}`);
      if (res.ok) setTraffic(await res.json());
    } finally {
      setTrafficLoading(false);
    }
  }, [trafficRange]);

  useEffect(() => {
    if (tab === "traffic") loadTraffic();
  }, [tab, loadTraffic]);

  function applyTrafficPreset(p: TrafficPreset) {
    setTrafficPreset(p);
    const today = wibTodayStr();
    if (p === "today") setTrafficRange({ from: today, to: today });
    else if (p === "7d") setTrafficRange({ from: wibDaysAgoStr(6), to: today });
    else if (p === "30d") setTrafficRange({ from: wibDaysAgoStr(29), to: today });
    else {
      // Kustom: isi input tanggal dengan periode yang sedang aktif
      setCustomFrom(trafficRange.from);
      setCustomTo(trafficRange.to);
    }
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      toast({ title: "Isi kedua tanggal dulu ya", variant: "destructive" });
      return;
    }
    let a = customFrom;
    let b = customTo;
    if (a > b) [a, b] = [b, a];
    setTrafficRange({ from: a, to: b });
  }

  async function doDeleteParticipant() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch("/api/admin/participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: deleteTarget.id }),
    });
    const d = await res.json();
    setDeleting(false);
    if (!res.ok) {
      toast({ title: "Gagal menghapus", description: d.error, variant: "destructive" });
      return;
    }
    toast({ title: `🗑️ ${d.name} dihapus`, description: "Seluruh data peserta telah dihapus permanen." });
    setDeleteTarget(null);
    loadParticipants();
    loadOverview();
  }

  async function handleTrafficExport(kind: "pdf" | "excel") {
    if (!traffic) {
      toast({ title: "Data kunjungan belum termuat", variant: "destructive" });
      return;
    }
    setTrafficExporting(kind);
    try {
      if (kind === "pdf") await exportTrafficPdf(traffic);
      else await exportTrafficExcel(traffic);
      toast({ title: kind === "pdf" ? "PDF laporan berhasil diunduh 📄" : "Excel laporan berhasil diunduh 📊" });
    } catch {
      toast({ title: "Gagal mengekspor laporan, coba lagi", variant: "destructive" });
    } finally {
      setTrafficExporting(null);
    }
  }

  async function handleExport(kind: "pdf" | "excel") {
    if (rows.length === 0) {
      toast({ title: "Belum ada data peserta", variant: "destructive" });
      return;
    }
    setExporting(kind);
    try {
      if (kind === "pdf") await exportPdf(rows);
      else await exportExcel(rows);
      toast({ title: kind === "pdf" ? "PDF berhasil diunduh 📄" : "Excel berhasil diunduh 📊" });
    } catch {
      toast({ title: "Gagal mengekspor, coba lagi", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }

  const loadOverview = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    if (res.ok) setOverview(await res.json());
  }, []);

  const loadParticipants = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.level) params.set("level", filters.level);
    if (filters.school) params.set("school", filters.school);
    if (filters.q) params.set("q", filters.q);
    if (filters.lvl) params.set("lvl", filters.lvl);
    if (filters.duta) params.set("duta", filters.duta);
    const res = await fetch(`/api/admin/participants?${params}`);
    if (res.ok) {
      const d = await res.json();
      setRows(d.participants ?? []);
      setSchools(d.schools ?? []);
    }
  }, [filters]);

  const loadVideos = useCallback(async () => {
    const res = await fetch("/api/admin/videos");
    if (res.ok) {
      const d = await res.json();
      setVideos(d.videos ?? []);
    }
  }, []);

  const loadModeration = useCallback(async () => {
    const params = new URLSearchParams();
    if (modStatus !== "all") params.set("status", modStatus);
    if (modType !== "all") params.set("type", modType);
    const res = await fetch(`/api/admin/community?${params}`);
    if (res.ok) {
      const d = await res.json();
      setModContents(d.contents ?? []);
    }
  }, [modStatus, modType]);

  const loadHero = useCallback(async () => {
    const res = await fetch("/api/public/hero");
    if (res.ok) {
      const d = await res.json();
      setHeroImageUrl(d.heroImageUrl ?? null);
      setDinkesLogoUrl(d.dinkesLogoUrl ?? null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverview();
     
    loadParticipants();
     
    loadVideos();
    loadHero();
  }, [loadOverview, loadParticipants, loadVideos, loadHero]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    reset();
  }

  async function gradeVideo(videoId: string) {
    const g = grades[videoId];
    if (!g?.grade) {
      toast({ title: "Isi nilai dulu", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/admin/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grade", videoId, grade: parseInt(g.grade, 10), note: g.note }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Gagal", description: d.error, variant: "destructive" });
      return;
    }
    toast({ title: `✅ Dinilai ${g.grade}/100`, description: `XP diberikan: +${d.xpDelta}` });
    loadVideos();
    loadOverview();
    loadParticipants();
  }

  async function setDuta(pid: string, isDuta: boolean) {
    const res = await fetch("/api/admin/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setDuta", participantId: pid, isDuta }),
    });
    if (res.ok) {
      toast({ title: isDuta ? "👑 Duta ditetapkan!" : "Status Duta dicabut" });
      loadOverview();
      loadParticipants();
    }
  }

  async function moderate(action: "approve" | "reject" | "delete", contentId: string, reason?: string, xpAward?: number) {
    const res = await fetch("/api/admin/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, contentId, reason, xpAward }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Gagal", description: d.error, variant: "destructive" });
      return false;
    }
    if (action === "approve") toast({ title: "✅ Konten disetujui", description: d.xpDelta > 0 ? `+${d.xpDelta} XP diberikan ke peserta (sekali per video)` : "Konten kini tampil publik (tanpa XP)" });
    if (action === "reject") toast({ title: "❌ Konten ditolak", description: "Alasan dikirim ke peserta" });
    if (action === "delete") toast({ title: "🗑️ Konten dihapus" });
    loadModeration();
    loadOverview();
    return true;
  }

  async function uploadLogo(file: File) {
    setHeroBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/logo", { method: "POST", body: fd });
    const d = await res.json();
    setHeroBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal upload logo", description: d.error, variant: "destructive" });
      return;
    }
    setDinkesLogoUrl(d.dinkesLogoUrl);
    toast({ title: "🏥 Logo Dinas Kesehatan diperbarui!", description: "Logo tampil di footer & sertifikat." });
  }

  async function deleteLogo() {
    setHeroBusy(true);
    const res = await fetch("/api/admin/logo", { method: "DELETE" });
    setHeroBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal menghapus logo", variant: "destructive" });
      return;
    }
    setDinkesLogoUrl(null);
    toast({ title: "Logo dihapus" });
  }

  async function uploadHero(file: File) {
    setHeroBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/hero", { method: "POST", body: fd });
    const d = await res.json();
    setHeroBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal upload", description: d.error, variant: "destructive" });
      return;
    }
    setHeroImageUrl(d.heroImageUrl);
    toast({ title: "🖼️ Gambar beranda diperbarui!", description: "Landing page kini menampilkan gambar yang diunggah." });
  }

  async function deleteHero() {
    setHeroBusy(true);
    const res = await fetch("/api/admin/hero", { method: "DELETE" });
    setHeroBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal menghapus", variant: "destructive" });
      return;
    }
    setHeroImageUrl(null);
    toast({ title: "Gambar beranda dihapus", description: "Kembali ke ilustrasi default." });
  }

  useEffect(() => {
    if (tab === "moderation") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadModeration();
    }
  }, [tab, loadModeration]);

  const COLORS = ["#e11d48", "#0d9488", "#f59e0b", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-[#faf5f0]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#3d1526]/10 bg-[#3d1526] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-lg">🛡️</span>
            <div className="leading-none">
              <p className="font-display font-extrabold">Admin FE-ZONE</p>
              <p className="text-[10px] text-white/50">Panel Program Duta</p>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {([
              { k: "overview", label: "Ringkasan", icon: LayoutDashboard },
              { k: "traffic", label: "Kunjungan Web", icon: Activity },
              { k: "participants", label: "Data Peserta", icon: Users },
              { k: "duta", label: "Kandidat Duta", icon: Crown },
              { k: "moderation", label: "Content Moderation", icon: ClipboardList },
              { k: "videos", label: "Penilaian Video", icon: Video },
              { k: "konten", label: "Editor Edukasi", icon: BookOpen },
              { k: "settings", label: "Beranda", icon: ImageUp },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
                  tab === t.k ? "bg-amber-300 text-[#3d1526]" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
            <button onClick={logout} className="ml-2 rounded-xl px-3 py-2 text-xs font-bold text-white/60 hover:text-white">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* ============ OVERVIEW ============ */}
        {tab === "overview" && overview && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Ringkasan Program</h1>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Total Peserta" value={overview.stats.total} color="bg-rose-100 text-rose-600" />
              <StatCard icon={<School className="h-5 w-5" />} label="Peserta SMP" value={overview.stats.totalSmp} color="bg-teal-100 text-teal-600" />
              <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Peserta SMA" value={overview.stats.totalSma} color="bg-violet-100 text-violet-600" />
              <StatCard icon={<UserCheck className="h-5 w-5" />} label="Peserta Aktif (7 hari)" value={overview.stats.active} color="bg-amber-100 text-amber-600" />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Misi Selesai (total)" value={overview.stats.missionsCompleted} color="bg-emerald-100 text-emerald-600" />
              <StatCard icon={<Pill className="h-5 w-5" />} label="Check-in TTD" value={overview.stats.totalCheckins} color="bg-cyan-100 text-cyan-600" />
              <StatCard icon={<Crown className="h-5 w-5" />} label="Kandidat Duta" value={overview.stats.candidates} color="bg-yellow-100 text-yellow-700" />
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Duta Terpilih" value={overview.stats.dutas} color="bg-orange-100 text-orange-600" />
              <StatCard icon={<Flame className="h-5 w-5" />} label="Rata-rata XP Peserta" value={overview.stats.avgXp} color="bg-rose-100 text-rose-600" />
              <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Peningkatan Nilai (%)" value={overview.stats.improvementRate} color="bg-emerald-100 text-emerald-700" />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Badge Diterbitkan" value={overview.stats.totalBadges} color="bg-violet-100 text-violet-600" />
              <StatCard icon={<Video className="h-5 w-5" />} label="Video Menunggu Nilai" value={overview.stats.videosPending} color="bg-cyan-100 text-cyan-700" />
            </div>

            {/* ANALISA OTOMATIS */}
            <div className="rounded-3xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-lg">🧠</span>
                <div>
                  <p className="font-display text-lg font-extrabold text-[#3d1526]">Analisa Otomatis Program</p>
                  <p className="text-[11px] font-semibold text-[#3d1526]/50">Temuan penting yang dihitung dari data peserta — diperbarui setiap halaman dibuka</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {overview.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-[#3d1526]/10 bg-white/80 p-3">
                    <span className="text-lg leading-none">{ins.icon}</span>
                    <p className="text-xs font-semibold leading-relaxed text-[#3d1526]/80">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SISTEM PENGINGAT TTD (PUSH) */}
            <AdminPushCard />

            {/* Grafik grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <ChartCard title="🩸 Peserta SMP vs SMA">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.smpVsSma}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: "#4a1d33" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      <Cell fill="#0d9488" /><Cell fill="#e11d48" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="🏫 Peserta per Sekolah">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.perSchool} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <YAxis type="category" dataKey="school" width={150} tick={{ fontSize: 9.5, fontWeight: 600, fill: "#4a1d33" }} />
                    <Tooltip />
                    <Bar dataKey="SMP" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="SMA" stackId="a" fill="#e11d48" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="🎯 Penyelesaian per Misi">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.perMission}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis dataKey="mission" tick={{ fontSize: 11, fontWeight: 700, fill: "#4a1d33" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="💊 Aktivitas TTD Tracker (14 hari)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.ttdDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9b6b7d" }} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="📈 Rata-rata Pre vs Post Test">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.prePost}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: "#4a1d33" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      <Cell fill="#94a3b8" /><Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-1 rounded-xl bg-emerald-50 p-2.5 text-center text-xs font-extrabold text-emerald-700">
                  📈 Peningkatan pengetahuan rata-rata: +{overview.stats.gain} poin
                </p>
              </ChartCard>

              <ChartCard title="📊 Komposisi Peserta">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "SMP", value: overview.stats.totalSmp },
                        { name: "SMA", value: overview.stats.totalSma },
                        { name: "Kandidat Duta", value: overview.stats.candidates },
                      ]}
                      dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4}
                    >
                      <Cell fill="#0d9488" /><Cell fill="#e11d48" /><Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="🧑‍🎓 Tren Pendaftaran (8 pekan)">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={overview.charts.registrationsTrend}>
                    <defs>
                      <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fontWeight: 600, fill: "#9b6b7d" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2.5} fill="url(#gradReg)" name="Pendaftar" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="👑 Sebaran Level Peserta">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.levelDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <YAxis type="category" dataKey="level" width={140} tick={{ fontSize: 9.5, fontWeight: 600, fill: "#4a1d33" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Peserta" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="🏅 Badge yang Paling Sering Diraih">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={overview.charts.badgeDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9b6b7d" }} />
                    <YAxis type="category" dataKey="badge" width={150} tick={{ fontSize: 9.5, fontWeight: 600, fill: "#4a1d33" }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 8, 8, 0]} name="Peserta" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* PERINGKAT SEKOLAH */}
            <div className="rounded-3xl border border-[#3d1526]/10 bg-white p-5">
              <p className="font-display text-lg font-extrabold text-[#3d1526]">🏫 Peringkat Sekolah (Top 10 — rata-rata XP)</p>
              <p className="mb-3 text-[11px] font-semibold text-[#3d1526]/50">Perbandingan keterlibatan antar sekolah: jumlah peserta, total & rata-rata XP, serta rata-rata kenaikan nilai pre→post</p>
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-b-2 border-[#3d1526]/10 bg-[#faf0e8]">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-extrabold [&>th]:uppercase [&>th]:text-[10px] [&>th]:text-[#3d1526]/50">
                      <th>#</th><th>Sekolah</th><th>Peserta</th><th>Total XP</th><th>Rata-rata XP</th><th>Rata-rata Kenaikan Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d1526]/5">
                    {overview.schoolRanking.map((s, i) => (
                      <tr key={s.school} className="hover:bg-rose-50/40">
                        <td className="px-3 py-2 font-extrabold text-[#3d1526]/50">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                        <td className="px-3 py-2 font-extrabold text-[#3d1526]">{s.school}</td>
                        <td className="px-3 py-2">{s.participants}</td>
                        <td className="px-3 py-2 font-bold text-rose-600">{s.totalXp.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2 font-bold">{s.avgXp.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2">{s.avgGain === null ? <span className="text-[#3d1526]/30">–</span> : <span className={s.avgGain > 0 ? "font-extrabold text-emerald-600" : "font-bold"}>{s.avgGain > 0 ? `+${s.avgGain}` : s.avgGain}</span>}</td>
                      </tr>
                    ))}
                    {overview.schoolRanking.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center font-bold text-[#3d1526]/40">Belum ada data sekolah</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ KUNJUNGAN WEB (ALA VERCEL ANALYTICS) ============ */}
        {tab === "traffic" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Kunjungan Web</h1>
                <p className="text-xs font-semibold text-[#3d1526]/50">
                  Analisa pengunjung situs — ibarat kamera penghitung di pintu masuk: anonim, hanya menghitung
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={trafficExporting !== null || !traffic}
                  onClick={() => handleTrafficExport("pdf")}
                  className="h-9 rounded-xl border-2 border-[#3d1526]/20 px-3 text-xs font-extrabold"
                >
                  {trafficExporting === "pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                  PDF
                </Button>
                <Button
                  disabled={trafficExporting !== null || !traffic}
                  onClick={() => handleTrafficExport("excel")}
                  className="h-9 rounded-xl border-2 border-[#3d1526] bg-emerald-600 px-3 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  {trafficExporting === "excel" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                  Excel
                </Button>
              </div>
            </div>

            {/* Filter waktu */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#3d1526]/10 bg-white p-3">
              {([
                { k: "today", label: "Hari Ini" },
                { k: "7d", label: "7 Hari" },
                { k: "30d", label: "1 Bulan" },
                { k: "custom", label: "Kustom" },
              ] as const).map((p) => (
                <button
                  key={p.k}
                  onClick={() => applyTrafficPreset(p.k)}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    trafficPreset === p.k ? "bg-[#3d1526] text-white" : "bg-[#faf5f0] text-[#3d1526]/60 hover:bg-rose-50 hover:text-[#3d1526]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {trafficPreset === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 w-[140px] rounded-xl border-2 border-[#3d1526]/15 text-xs font-bold"
                  />
                  <span className="text-xs font-bold text-[#3d1526]/40">s.d.</span>
                  <Input
                    type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 w-[140px] rounded-xl border-2 border-[#3d1526]/15 text-xs font-bold"
                  />
                  <Button onClick={applyCustomRange} className="h-9 rounded-xl bg-amber-400 px-3 text-xs font-extrabold text-[#3d1526] hover:bg-amber-500">
                    Terapkan
                  </Button>
                </div>
              )}
              <span className="ml-auto text-[11px] font-extrabold text-[#3d1526]/40">
                📅 {fmtDateShort(trafficRange.from)} – {fmtDateShort(trafficRange.to)}
              </span>
              <button
                onClick={loadTraffic}
                title="Muat ulang data"
                className="rounded-xl bg-[#faf5f0] p-2 text-[#3d1526]/50 transition hover:bg-rose-50 hover:text-[#3d1526]"
              >
                {trafficLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </div>

            {/* Kartu statistik */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <p className="font-display text-2xl font-extrabold text-[#3d1526]">{(traffic?.totals.liveNow ?? 0).toLocaleString("id-ID")}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">Sedang Online (5 mnt)</p>
              </motion.div>
              <StatCard icon={<Users className="h-5 w-5" />} label="Pengunjung Unik" value={traffic?.totals.visitors ?? 0} color="bg-rose-100 text-rose-600" />
              <StatCard icon={<Eye className="h-5 w-5" />} label="Total Kunjungan" value={traffic?.totals.pageviews ?? 0} color="bg-amber-100 text-amber-600" />
              <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Halaman / Pengunjung" value={traffic?.totals.avgPages ?? 0} color="bg-violet-100 text-violet-600" />
            </div>

            {/* Tren harian */}
            <ChartCard title="Tren Kunjungan Harian">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={traffic?.daily ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTrafficViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gTrafficVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,21,38,0.08)" />
                  <XAxis dataKey="date" tickFormatter={fmtDateTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "2px solid rgba(61,21,38,0.1)", fontSize: 12 }}
                    labelFormatter={(label) => fmtDateShort(String(label))}
                    formatter={(value, name) => [Number(value).toLocaleString("id-ID"), String(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="views" name="Kunjungan halaman" stroke="#e11d48" strokeWidth={2} fill="url(#gTrafficViews)" />
                  <Area type="monotone" dataKey="visitors" name="Pengunjung unik" stroke="#0d9488" strokeWidth={2} fill="url(#gTrafficVisitors)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Halaman terpopuler + perangkat + browser */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="📄 Halaman yang Paling Sering Dibuka">
                {traffic && traffic.topPages.length > 0 ? (
                  <div className="space-y-1.5">
                    {traffic.topPages.map((p, i) => (
                      <TrafficRow
                        key={p.path}
                        rank={i + 1}
                        label={pageLabel(p.path)}
                        sub={`${p.visitors} pengunjung`}
                        value={p.views}
                        max={traffic.topPages[0]?.views ?? 1}
                      />
                    ))}
                    <p className="pt-1 text-[10px] font-semibold text-[#3d1526]/40">
                      Angka kanan = jumlah kunjungan halaman pada periode terpilih.
                    </p>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs font-bold text-[#3d1526]/40">Belum ada data kunjungan untuk periode ini</p>
                )}
              </ChartCard>

              <div className="space-y-4">
                <ChartCard title="📱 Perangkat Pengunjung">
                  {traffic && traffic.devices.length > 0 ? (
                    <div className="space-y-1.5">
                      {traffic.devices.map((d) => (
                        <TrafficRow
                          key={d.device}
                          label={`${DEVICE_ICON[d.device] ?? "🖥️"} ${d.device}`}
                          sub={`${traffic.totals.visitors > 0 ? Math.round((d.visitors / traffic.totals.visitors) * 100) : 0}% dari pengunjung`}
                          value={d.visitors}
                          max={traffic.devices[0]?.visitors ?? 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs font-bold text-[#3d1526]/40">Belum ada data</p>
                  )}
                </ChartCard>
                <ChartCard title="🌐 Browser Pengunjung">
                  {traffic && traffic.browsers.length > 0 ? (
                    <div className="space-y-1.5">
                      {traffic.browsers.map((b) => (
                        <TrafficRow
                          key={b.browser}
                          label={b.browser}
                          sub={`${traffic.totals.visitors > 0 ? Math.round((b.visitors / traffic.totals.visitors) * 100) : 0}% dari pengunjung`}
                          value={b.visitors}
                          max={traffic.browsers[0]?.visitors ?? 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs font-bold text-[#3d1526]/40">Belum ada data</p>
                  )}
                </ChartCard>
              </div>
            </div>
          </div>
        )}

        {/* ============ PARTICIPANTS ============ */}
        {tab === "participants" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Data Peserta ({rows.length})</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={exporting !== null || rows.length === 0}
                  onClick={() => handleExport("pdf")}
                  className="h-9 rounded-xl border-2 border-[#3d1526]/20 px-3 text-xs font-extrabold"
                >
                  {exporting === "pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                  PDF
                </Button>
                <Button
                  disabled={exporting !== null || rows.length === 0}
                  onClick={() => handleExport("excel")}
                  className="h-9 rounded-xl border-2 border-[#3d1526] bg-emerald-600 px-3 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  {exporting === "excel" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                  Excel
                </Button>
              </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#3d1526]/10 bg-white p-3">
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Tingkat</Label>
                <select
                  value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
                  className="mt-1 h-10 rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 text-sm font-bold"
                >
                  <option value="">Semua</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Sekolah</Label>
                <select
                  value={filters.school} onChange={(e) => setFilters((f) => ({ ...f, school: e.target.value }))}
                  className="mt-1 h-10 max-w-[200px] rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 text-sm font-bold"
                >
                  <option value="">Semua</option>
                  {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Level</Label>
                <select
                  value={filters.lvl} onChange={(e) => setFilters((f) => ({ ...f, lvl: e.target.value }))}
                  className="mt-1 h-10 rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 text-sm font-bold"
                >
                  <option value="">Semua</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Level {n}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Status Duta</Label>
                <select
                  value={filters.duta} onChange={(e) => setFilters((f) => ({ ...f, duta: e.target.value }))}
                  className="mt-1 h-10 rounded-xl border-2 border-[#3d1526]/15 bg-white px-3 text-sm font-bold"
                >
                  <option value="">Semua</option>
                  <option value="candidate">Kandidat</option>
                  <option value="winner">Duta Terpilih</option>
                </select>
              </div>
              <div className="min-w-[180px] flex-1">
                <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Cari Nama</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d1526]/30" />
                  <Input
                    value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="cth. Aulia" className="h-10 rounded-xl border-2 border-[#3d1526]/15 pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="thin-scroll overflow-x-auto rounded-2xl border border-[#3d1526]/10 bg-white">
              <table className="w-full min-w-[1150px] text-left text-xs">
                <thead className="border-b-2 border-[#3d1526]/10 bg-[#faf0e8]">
                  <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-extrabold [&>th]:uppercase [&>th]:text-[10px] [&>th]:text-[#3d1526]/50">
                    <th>Nama</th><th>Usia</th><th>Sekolah</th><th>Kota</th><th>Kecamatan</th><th>Status Sekolah</th><th>Tingkat</th><th>Telepon</th><th>XP</th><th>Level</th>
                    <th>Misi</th><th>Badge</th><th>Streak</th><th>Pre</th><th>Post</th><th>Status Duta</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d1526]/5">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-rose-50/40">
                      <td className="px-3 py-2.5 font-extrabold text-[#3d1526]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👧</span>
                          <div>
                            {r.name}
                            <p className="text-[10px] font-semibold text-[#3d1526]/40">{r.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{r.age}</td>
                      <td className="px-3 py-2.5">{r.school}</td>
                      <td className="px-3 py-2.5">{r.schoolCity ?? "–"}</td>
                      <td className="px-3 py-2.5">{r.schoolDistrict ?? "–"}</td>
                      <td className="px-3 py-2.5">
                        {r.schoolType ? (
                          <span className={`rounded-full px-2 py-0.5 font-extrabold ${r.schoolType === "Negeri" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                            {r.schoolType}
                          </span>
                        ) : (
                          <span className="text-[#3d1526]/30">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 font-extrabold ${r.educationLevel === "SMP" ? "bg-teal-100 text-teal-700" : "bg-rose-100 text-rose-700"}`}>
                          {r.educationLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#3d1526]/70">{r.phone ?? "–"}</td>
                      <td className="px-3 py-2.5 font-display font-extrabold text-rose-600">{r.xp.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2.5">{r.levelIcon} Lv{r.level}</td>
                      <td className="px-3 py-2.5">{r.missionsCompleted}/9</td>
                      <td className="px-3 py-2.5">{r.badges.length}</td>
                      <td className="px-3 py-2.5">🔥{r.streakWeeks}</td>
                      <td className="px-3 py-2.5">{r.preTestScore ?? "–"}</td>
                      <td className="px-3 py-2.5">{r.postTestScore ?? "–"}</td>
                      <td className="px-3 py-2.5">
                        {r.isDuta ? (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 font-extrabold text-[#3d1526]">👑 DUTA</span>
                        ) : r.isDutaCandidate ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-extrabold text-violet-700">Kandidat</span>
                        ) : (
                          <span className="text-[#3d1526]/30">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setResetTarget(r); setResetPass(""); }}
                            title="Reset password peserta (untuk yang lupa password)"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <KeyRound className="h-3 w-3" /> Reset
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            title="Hapus peserta beserta seluruh datanya (permanen)"
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-[#3d1526]/15 bg-white px-2 py-1 text-[10px] font-extrabold text-[#3d1526]/70 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={17} className="px-3 py-8 text-center font-bold text-[#3d1526]/40">Tidak ada peserta yang cocok dengan filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ DUTA CANDIDATES ============ */}
        {tab === "duta" && overview && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Kandidat Duta ({overview.dutaCandidates.length})</h1>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-extrabold text-[#3d1526]/60">Jumlah pemenang per tingkat:</Label>
                <Input
                  type="number" min={1} max={10} value={winners}
                  onChange={(e) => setWinners(parseInt(e.target.value, 10) || 1)}
                  className="h-9 w-20 rounded-xl border-2"
                />
              </div>
            </div>
            <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">
              📋 Sistem penilaian: {Object.values(DUTA_WEIGHTS).map((w) => `${w.label.split(" ")[0]} ${w.pct}%`).join(" · ")}. Ranking dihitung otomatis per tingkat (SMP/SMA terpisah). Tekan &quot;Tetapkan Duta&quot; untuk menetapkan pemenang.
            </p>

            {(["SMP", "SMA"] as const).map((lv) => {
              const list = overview.dutaCandidates.filter((c) => c.educationLevel === lv);
              return (
                <div key={lv} className="rounded-3xl border border-[#3d1526]/10 bg-white p-4">
                  <p className="mb-3 font-display text-lg font-extrabold text-[#3d1526]">
                    {lv === "SMP" ? "🏫" : "🎓"} DUTA {lv}
                  </p>
                  {list.length === 0 ? (
                    <p className="py-4 text-center text-sm font-bold text-[#3d1526]/40">Belum ada kandidat {lv}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {list.map((c, i) => (
                        <div key={c.id} className={`rounded-2xl border-2 p-3.5 ${c.isDuta ? "border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50" : "border-[#3d1526]/10"}`}>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#3d1526] bg-amber-100 font-display text-sm font-extrabold">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-[#3d1526]">
                                {c.name} {c.isDuta && <Crown className="inline h-4 w-4 text-amber-500" />}
                              </p>
                              <p className="text-[11px] font-semibold text-[#3d1526]/50">{c.school} · {c.xp} XP · {c.level}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-xl font-extrabold text-rose-600">{c.score.total}</p>
                              <p className="text-[9px] font-extrabold uppercase text-[#3d1526]/40">Skor akhir</p>
                            </div>
                            <Button
                              onClick={() => setDuta(c.id, !c.isDuta)}
                              className={`h-9 rounded-xl border-2 px-3 text-xs font-extrabold ${
                                c.isDuta ? "border-[#3d1526]/20 bg-white text-[#3d1526]/60" : "border-[#3d1526] bg-amber-400 text-[#3d1526] hover:bg-amber-300"
                              }`}
                            >
                              {c.isDuta ? "Cabut" : "👑 Tetapkan Duta"}
                            </Button>
                          </div>
                          {/* breakdown */}
                          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                            {[
                              { k: "knowledge", v: c.score.knowledge },
                              { k: "missions", v: c.score.missions },
                              { k: "ttd", v: c.score.ttd },
                              { k: "peer", v: c.score.peer },
                              { k: "creativity", v: c.score.creativity },
                              { k: "activity", v: c.score.activity },
                            ].map((row) => {
                              const w = DUTA_WEIGHTS[row.k as keyof typeof DUTA_WEIGHTS];
                              return (
                                <div key={row.k} className="flex items-center justify-between text-[10px] font-bold text-[#3d1526]/60">
                                  <span>{w.label} <span className="text-[#3d1526]/35">({w.pct}%)</span></span>
                                  <span className="text-[#3d1526]">{row.v}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============ CONTENT MODERATION ============ */}
        {tab === "moderation" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">📋 Content Moderation</h1>
              <Button variant="outline" size="sm" onClick={loadModeration} className="rounded-xl border-2 font-bold">
                <Loader2 className="mr-1.5 h-3.5 w-3.5" /> Muat ulang
              </Button>
            </div>

            {/* Tab status + jenis */}
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setModStatus(s)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                    modStatus === s ? "border-[#3d1526] bg-[#3d1526] text-white" : "border-[#3d1526]/15 bg-white text-[#3d1526]/60"
                  }`}
                >
                  {s === "all" ? "All" : s === "PENDING" ? `⏳ Pending` : s === "APPROVED" ? "✅ Approved" : "❌ Rejected"}
                </button>
              ))}
              <span className="mx-1 h-5 w-0.5 bg-[#3d1526]/10" />
              {(["all", "education", "peer_educator"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setModType(t)}
                  className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                    modType === t ? "border-amber-500 bg-amber-300 text-[#3d1526]" : "border-[#3d1526]/15 bg-white text-[#3d1526]/60"
                  }`}
                >
                  {t === "all" ? "Semua Jenis" : t === "education" ? "📚 Edukasi" : "🎥 Peer Educator"}
                </button>
              ))}
            </div>

            {modContents.length === 0 ? (
              <p className="rounded-2xl border border-[#3d1526]/10 bg-white p-8 text-center text-sm font-bold text-[#3d1526]/40">
                📭 Tidak ada konten untuk filter ini
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#3d1526]/10 bg-white">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="border-b border-[#3d1526]/10 bg-[#3d1526]/[0.03]">
                    <tr className="text-[10px] uppercase text-[#3d1526]/50">
                      <th className="px-3 py-2.5 font-extrabold">Peserta</th>
                      <th className="px-3 py-2.5 font-extrabold">Sekolah</th>
                      <th className="px-3 py-2.5 font-extrabold">Konten</th>
                      <th className="px-3 py-2.5 font-extrabold">Platform</th>
                      <th className="px-3 py-2.5 font-extrabold">Status</th>
                      <th className="px-3 py-2.5 text-right font-extrabold">Like</th>
                      <th className="px-3 py-2.5 text-right font-extrabold">XP</th>
                      <th className="px-3 py-2.5 font-extrabold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d1526]/5">
                    {modContents.map((c) => (
                      <tr key={c.id} className="align-top">
                        <td className="px-3 py-3 font-extrabold text-[#3d1526]">{c.participant.name}<span className="ml-1 rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-700">{c.participant.educationLevel}</span></td>
                        <td className="px-3 py-3 text-[#3d1526]/70">{c.participant.school}</td>
                        <td className="max-w-[240px] px-3 py-3">
                          <p className="font-bold text-[#3d1526]">{c.contentType === "education" ? "📚" : "🎥"} {c.title}</p>
                          {c.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-[#3d1526]/50">{c.description}</p>}
                          {c.status === "REJECTED" && c.rejectReason && (
                            <p className="mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">Alasan: {c.rejectReason}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[#3d1526]/70">{PLATFORM_ICON[c.platform]} {PLATFORM_LABEL[c.platform] ?? c.platform}{c.durationSec ? <span className="ml-1 text-[10px]">· {c.durationSec}s</span> : null}</td>
                        <td className="px-3 py-3">
                          <ModStatusChip status={c.status} />
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{c.likesCount}</td>
                        <td className="px-3 py-3 text-right font-extrabold text-rose-600">{c.xpAwarded > 0 ? `+${c.xpAwarded}` : "–"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setPreview(c)}
                              className="rounded-lg border-2 border-[#3d1526]/20 px-2 py-1 text-[10px] font-extrabold text-[#3d1526] hover:bg-[#3d1526]/5"
                            >
                              Preview
                            </button>
                            {c.status !== "APPROVED" && (
                              <button
                                onClick={() => setApproveXp({ id: c.id, peer: c.contentType === "peer_educator", value: "100" })}
                                className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-extrabold text-white hover:bg-emerald-600"
                              >
                                Approve
                              </button>
                            )}
                            {c.status !== "REJECTED" && (
                              <button
                                onClick={() => setRejectReason({ id: c.id, value: "" })}
                                className="rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-extrabold text-white hover:bg-rose-600"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => { if (confirm("Hapus konten ini permanen?")) moderate("delete", c.id); }}
                              className="rounded-lg border-2 border-rose-200 px-2 py-1 text-[10px] font-extrabold text-rose-500 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="rounded-2xl bg-cyan-50 p-3 text-xs font-semibold text-cyan-700">
              💡 Video Peer Educator yang disetujui mendapat XP yang DITETAPKAN ADMIN (0–300) sekali per video — pending/rejected/dihapus = 0 XP.
              Konten approved tampil di Fe-Zone Community &amp; halaman Peer Educator. Konten rejected tidak tampil publik.
            </p>

            {/* Modal XP approve — penilaian & pemberian XP oleh admin */}
            {approveXp && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#3d1526]/50 p-4 backdrop-blur-sm" onClick={() => setApproveXp(null)}>
                <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
                  <p className="font-display text-lg font-extrabold text-[#3d1526]">✅ Approve &amp; Beri XP</p>
                  <p className="mt-1 text-xs text-[#3d1526]/60">
                    {approveXp.peer
                      ? "Tetapkan jumlah XP untuk video ini (0–300). XP hanya diberikan SEKALI untuk video ini."
                      : "Konten edukasi tidak menerima XP video. Lanjutkan approve tanpa XP."}
                  </p>
                  {approveXp.peer && (
                    <div className="mt-3">
                      <Label className="text-xs font-extrabold text-[#3d1526]">XP untuk video ini (maks 300)</Label>
                      <Input
                        type="number" min={0} max={300} value={approveXp.value}
                        onChange={(e) => setApproveXp({ ...approveXp, value: e.target.value })}
                        className="mt-1 rounded-xl border-2"
                        placeholder="cth: 150"
                      />
                    </div>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setApproveXp(null)} className="rounded-xl border-2 font-bold">Batal</Button>
                    <Button
                      onClick={async () => {
                        const xp = approveXp.peer ? Number(approveXp.value) : 0;
                        if (approveXp.peer && (isNaN(xp) || xp < 0 || xp > 300)) {
                          toast({ title: "XP harus angka 0–300", variant: "destructive" });
                          return;
                        }
                        const ok = await moderate("approve", approveXp.id, undefined, xp);
                        if (ok) setApproveXp(null);
                      }}
                      className="rounded-xl bg-emerald-500 font-extrabold text-white hover:bg-emerald-600"
                    >
                      ✅ Setujui{approveXp.peer ? " & Beri XP" : ""}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal alasan reject */}
            {rejectReason && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#3d1526]/50 p-4 backdrop-blur-sm" onClick={() => setRejectReason(null)}>
                <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
                  <p className="font-display text-lg font-extrabold text-[#3d1526]">❌ Alasan Penolakan</p>
                  <p className="mt-1 text-xs text-[#3d1526]/60">Alasan ini ditampilkan ke peserta di halaman Video Saya.</p>
                  <Textarea
                    value={rejectReason.value}
                    onChange={(e) => setRejectReason({ ...rejectReason, value: e.target.value })}
                    rows={3}
                    maxLength={300}
                    placeholder="cth: Durasi kurang dari 30 detik / konten tidak sesuai topik anemia & TTD"
                    className="mt-3 rounded-xl border-2"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRejectReason(null)} className="rounded-xl border-2 font-bold">Batal</Button>
                    <Button
                      onClick={async () => {
                        const ok = await moderate("reject", rejectReason.id, rejectReason.value);
                        if (ok) setRejectReason(null);
                      }}
                      disabled={!rejectReason.value.trim()}
                      className="rounded-xl bg-rose-500 font-extrabold text-white hover:bg-rose-600"
                    >
                      Tolak Konten
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal preview */}
            {preview && (
              <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#3d1526]/50 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
                <div className="mx-auto mt-8 w-full max-w-lg rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-extrabold text-[#3d1526]">{preview.title}</p>
                      <p className="text-xs font-bold text-[#3d1526]/60">{preview.participant.name} · {preview.participant.school} · {preview.participant.educationLevel}</p>
                      <p className="text-[11px] text-[#3d1526]/40">
                        {PLATFORM_LABEL[preview.platform]} · {preview.durationSec ? `${preview.durationSec}s · ` : ""}{new Date(preview.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <button onClick={() => setPreview(null)} className="rounded-full bg-muted p-1.5" aria-label="Tutup"><XCircle className="h-4 w-4" /></button>
                  </div>
                  {preview.contentType === "peer_educator" && (
                    <div className="mt-3">
                      <ModerationPreviewMedia content={preview} />
                    </div>
                  )}
                  {preview.description && <p className="mt-3 whitespace-pre-line rounded-2xl bg-cream/60 p-3 text-sm text-[#3d1526]/80">{preview.description}</p>}
                  {preview.externalUrl && (
                    <a href={preview.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl bg-[#3d1526] px-4 py-2 text-xs font-extrabold text-white">
                      🔗 Buka URL asli
                    </a>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    {preview.status !== "APPROVED" && (
                      <Button onClick={() => { setApproveXp({ id: preview.id, peer: preview.contentType === "peer_educator", value: "100" }); setPreview(null); }} className="rounded-xl bg-emerald-500 font-extrabold text-white hover:bg-emerald-600">✅ Approve</Button>
                    )}
                    {preview.status !== "REJECTED" && (
                      <Button onClick={() => { setRejectReason({ id: preview.id, value: "" }); setPreview(null); }} className="rounded-xl bg-rose-500 font-extrabold text-white hover:bg-rose-600">❌ Reject</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ EDITOR EDUKASI (PAKET C) ============ */}
        {tab === "konten" && (
          <AdminEduEditor />
        )}

        {tab === "settings" && (
          <div className="max-w-2xl space-y-4">
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">🖼️ Gambar Halaman Beranda</h1>
            <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-5">
              <p className="text-sm font-extrabold text-[#3d1526]">Gambar Hero Landing Page</p>
              <p className="mt-1 text-xs text-[#3d1526]/60">
                Gambar yang diunggah di sini akan menggantikan ilustrasi di halaman beranda (tampil ke semua pengunjung).
                Format JPG/PNG/WebP, maksimal 4MB. Rasio disarankan 1:1 atau 4:5.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {heroImageUrl ? (
                  <img src={heroImageUrl} alt="Gambar beranda" className="h-40 w-40 rounded-2xl border-2 border-[#3d1526]/15 object-cover" />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-[#3d1526]/20 bg-[#3d1526]/[0.03] text-center text-xs font-bold leading-relaxed text-[#3d1526]/40">
                    Belum ada gambar<br />(ilustrasi default dipakai)
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-rose-600">
                    {heroBusy ? "Memproses..." : heroImageUrl ? "🔄 Ganti Gambar" : "⬆️ Upload Gambar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={heroBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadHero(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {heroImageUrl && (
                    <button onClick={deleteHero} className="rounded-xl border-2 border-rose-200 px-4 py-2.5 text-xs font-extrabold text-rose-500 hover:bg-rose-50">
                      🗑️ Hapus (pakai ilustrasi default)
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">
              ⚠️ Gambar beranda bersifat publik. Pastikan kamu memiliki hak untuk menggunakan gambar tersebut.
            </p>

            {/* Logo Dinas Kesehatan Kota Bandung */}
            <h1 className="pt-4 font-display text-2xl font-extrabold text-[#3d1526]">🏥 Logo Dinas Kesehatan Kota Bandung</h1>
            <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-5">
              <p className="text-sm font-extrabold text-[#3d1526]">Logo Resmi (upload logo asli — jangan dibuat dengan AI)</p>
              <p className="mt-1 text-xs text-[#3d1526]/60">
                Logo ini tampil di footer semua halaman dan pada sertifikat peserta. Format JPG/PNG/WebP/SVG, maksimal 4MB,
                disarankan rasio 1:1 dengan latar transparan.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {dinkesLogoUrl ? (
                  <img src={dinkesLogoUrl} alt="Logo Dinas Kesehatan Kota Bandung" className="h-28 w-28 rounded-2xl border-2 border-[#3d1526]/15 bg-white object-contain p-2" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-[#3d1526]/20 bg-[#3d1526]/[0.03] text-center text-xs font-bold leading-relaxed text-[#3d1526]/40">
                    Belum ada logo<br />(footer tampil tanpa gambar)
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-teal-700">
                    {heroBusy ? "Memproses..." : dinkesLogoUrl ? "🔄 Ganti Logo" : "⬆️ Upload Logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={heroBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {dinkesLogoUrl && (
                    <button onClick={deleteLogo} className="rounded-xl border-2 border-rose-200 px-4 py-2.5 text-xs font-extrabold text-rose-500 hover:bg-rose-50">
                      🗑️ Hapus Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ VIDEO GRADING ============ */}
        {tab === "videos" && (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-extrabold text-[#3d1526]">Penilaian Video Edukasi</h1>
            {videos.length === 0 ? (
              <p className="rounded-2xl border border-[#3d1526]/10 bg-white p-8 text-center text-sm font-bold text-[#3d1526]/40">
                📭 Belum ada video yang menunggu penilaian
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((v) => {
                  const g = grades[v.id] ?? { grade: "", note: "" };
                  return (
                    <div key={v.id} className="rounded-2xl border-2 border-[#3d1526]/10 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-[#3d1526]">
                            {v.participant?.name ?? "Peserta"} · Mission {v.missionKey === "M8" ? "8" : "Duta"}
                          </p>
                          <p className="text-[11px] font-semibold text-[#3d1526]/50">{v.participant?.school}</p>
                          {v.fileUrl && (
                            <a href={v.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block rounded-lg bg-[#3d1526] px-3 py-1.5 text-[11px] font-extrabold text-white">
                              ▶ Tonton Video
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Nilai (0-100)</Label>
                            <Input
                              type="number" min={0} max={100} value={g.grade}
                              onChange={(e) => setGrades((gr) => ({ ...gr, [v.id]: { ...g, grade: e.target.value } }))}
                              className="h-10 w-24 rounded-xl border-2"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-extrabold uppercase text-[#3d1526]/50">Catatan</Label>
                            <Input
                              value={g.note}
                              onChange={(e) => setGrades((gr) => ({ ...gr, [v.id]: { ...g, note: e.target.value } }))}
                              placeholder="Feedback untuk peserta" className="h-10 w-48 rounded-xl border-2"
                            />
                          </div>
                          <Button onClick={() => gradeVideo(v.id)} className="h-10 rounded-xl border-2 border-[#3d1526] bg-rose-500 px-4 text-xs font-extrabold text-white hover:bg-rose-600">
                            Nilai & Beri XP
                          </Button>
                        </div>
                      </div>
                      {v.status === "GRADED" && (
                        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">
                          ✅ Sudah dinilai: {v.grade}/100 (XP {v.grade * 3})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="rounded-2xl bg-cyan-50 p-3 text-xs font-semibold text-cyan-700">
              💡 Nilai 0-100 dikonversi ke XP maksimal +300 (nilai × 3). Nilai ≥ 60 otomatis menyelesaikan Mission 8 peserta &amp; menjadi komponen Kreativitas (10%) dalam skor Duta.
            </p>
          </div>
        )}
      </main>

      {/* Modal reset password peserta */}
      {resetTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#3d1526]/50 p-4 backdrop-blur-sm" onClick={() => setResetTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><KeyRound className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">Reset Password Peserta</p>
                <p className="text-xs font-bold text-[#3d1526]/50">{resetTarget.name} · {resetTarget.username}</p>
              </div>
            </div>
            <p className="mb-3 rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold leading-relaxed text-amber-700">
              Gunakan ini saat peserta lupa password. Buat password sementara, lalu sampaikan langsung kepada peserta
              (lewat guru/petugas). Setelah login berhasil, peserta dapat meminta reset ulang kapan saja.
            </p>
            <Label className="text-xs font-extrabold text-[#3d1526]">Password Baru (minimal 6 karakter)</Label>
            <Input
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              placeholder="cth. Fezone2026"
              className="mt-1 h-11 rounded-xl border-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetTarget(null)} className="h-10 rounded-xl px-4 text-xs font-extrabold">Batal</Button>
              <Button disabled={resetting} onClick={doResetPassword} className="h-10 rounded-xl bg-amber-500 px-4 text-xs font-extrabold text-white hover:bg-amber-600">
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Password Baru"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus peserta */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#3d1526]/50 p-4 backdrop-blur-sm"
          onClick={() => { if (!deleting) setDeleteTarget(null); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"><Trash2 className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-lg font-extrabold text-[#3d1526]">Hapus Pengguna Ini?</p>
                <p className="text-xs font-bold text-[#3d1526]/50">{deleteTarget.name} · {deleteTarget.username}</p>
              </div>
            </div>
            <p className="mb-2 rounded-xl bg-red-50 p-2.5 text-[11px] font-semibold leading-relaxed text-red-700">
              ⚠️ Seluruh data peserta akan dihapus PERMANEN: akun login, XP &amp; level, progres misi, badge,
              check-in TTD, nilai pre/post-test, video, konten komunitas, dan like. Tindakan ini
              <b> tidak bisa dibatalkan</b>.
            </p>
            <p className="mb-1 text-xs font-semibold leading-relaxed text-[#3d1526]/60">
              Ibarat menghapus halaman buku tulis dengan tinta permanen — tidak bisa ditulis ulang.
            </p>
            <p className="mb-3 text-xs font-extrabold text-[#3d1526]">Yakin ingin menghapus {deleteTarget.name}?</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl px-4 text-xs font-extrabold">Batal</Button>
              <Button disabled={deleting} onClick={doDeleteParticipant} className="h-10 rounded-xl bg-red-600 px-4 text-xs font-extrabold text-white hover:bg-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus Permanen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#3d1526]/10 py-4">
        <SiteCredit />
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#3d1526]/10 bg-white p-4"
    >
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      <p className="font-display text-2xl font-extrabold text-[#3d1526]">{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#3d1526]/45">{label}</p>
    </motion.div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#3d1526]/10 bg-white p-4">
      <p className="mb-2 font-display text-sm font-extrabold text-[#3d1526]">{title}</p>
      {children}
    </div>
  );
}

// Baris bar-list gaya Vercel Analytics: label + bar latar + angka
function TrafficRow({ rank, label, sub, value, max }: { rank?: number; label: string; sub: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#3d1526]/5 bg-[#faf5f0]/60 px-3 py-2">
      <div className="absolute inset-y-0 left-0 bg-rose-100/80 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
      <div className="relative flex items-center justify-between gap-2">
        <p className="truncate text-xs font-extrabold text-[#3d1526]">
          {rank != null && <span className="mr-1.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-md bg-[#3d1526]/80 px-1 text-[9px] font-extrabold text-white">{rank}</span>}
          {label} <span className="font-semibold text-[#3d1526]/40">· {sub}</span>
        </p>
        <p className="shrink-0 text-xs font-extrabold text-rose-600">{value.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}

function ModStatusChip({ status }: { status: string }) {
  if (status === "APPROVED") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Approved</span>;
  if (status === "PENDING") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">Pending</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">Rejected</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-600">{status}</span>;
}

// Preview media untuk moderasi — YouTube embed, TikTok embed, fallback link
function ModerationPreviewMedia({ content }: { content: ModContent }) {
  if (content.platform === "uploaded" && content.videoUrl) {
    return <video src={content.videoUrl} controls className="max-h-72 w-full rounded-2xl border-2 border-[#3d1526]/10 bg-black" />;
  }
  if (content.platform === "youtube" && content.videoUrl) {
    const id = content.videoUrl.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([\w-]{6,20})/)?.[1];
    if (id) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border-2 border-[#3d1526]/10 bg-black">
          <iframe src={`https://www.youtube.com/embed/${id}`} title={content.title} allowFullScreen className="h-full w-full" />
        </div>
      );
    }
  }
  if (content.thumbnailUrl) {
    return <img src={content.thumbnailUrl} alt={content.title} className="aspect-video w-full rounded-2xl border-2 border-[#3d1526]/10 object-cover" />;
  }
  return (
    <a href={content.externalUrl ?? content.videoUrl ?? "#"} target="_blank" rel="noreferrer" className="flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-[#3d1526]/20 bg-[#3d1526]/[0.03] text-xs font-extrabold text-[#3d1526]/60">
      ▶ Buka video di {PLATFORM_LABEL[content.platform] ?? content.platform}
    </a>
  );
}
