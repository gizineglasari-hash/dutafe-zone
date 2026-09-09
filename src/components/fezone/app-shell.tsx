"use client";

import { useCallback, useEffect, useState } from "react";
import { useFez, type AppTab } from "@/lib/store";
import { XpCounter, UserAvatar, DinkesFooter, SiteCredit } from "@/components/fezone/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLevel } from "@/lib/constants";
import {
  BookOpen, CalendarCheck, Crown, Home, LogOut, Medal, Menu, Target, Trophy, User, Users, X,
} from "lucide-react";
import DashboardView from "@/components/fezone/dashboard";
import EdukasiView from "@/components/fezone/edukasi";
import MissionCenter from "@/components/fezone/missions";
import TTDTrackerView from "@/components/fezone/ttd-tracker";
import LeaderboardView from "@/components/fezone/leaderboard";
import BadgesView from "@/components/fezone/badges";
import DutaChallengeView from "@/components/fezone/duta-challenge";
import ProfileView from "@/components/fezone/profile";
import TestView from "@/components/fezone/test-view";
import { CommunityTab } from "@/components/fezone/community";
import { CommunitySubmitModal } from "@/components/fezone/peer-educator";
import { trackPage } from "@/lib/track";

export interface DashData {
  profile: {
    id: string; name: string; age: number; school: string; educationLevel: string;
    avatar: string; profilePhotoUrl: string | null; xp: number; streakWeeks: number; preTestScore: number | null;
    postTestScore: number | null; isDutaCandidate: boolean; isDuta: boolean;
  };
  badges: string[];
  missions: { key: string; status: string; progress: number; dataJson: string | null; score?: number | null; xpAwarded?: number; unlocked?: boolean; prevMission?: string | null }[];
  missionsCompleted: number;
  checkins: string[];
  totalCheckins: number;
  postTestUnlocked: boolean;
  allCompleted: boolean;
  rank: number;
  videos: { id: string; fileUrl: string; status: string; grade: number | null; missionKey: string }[];
  community: {
    spreadShares: number;
    spreadTarget: number;
    spreadCompleted: boolean;
    peerVideos: { total: number; approved: number; pending: number; education: number };
    totalLikes: number;
    approvedContents: number;
  };
  certificate: { pejuang: boolean; duta: boolean };
}

const TABS: { key: AppTab; label: string; icon: React.ElementType; mobile?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: Home, mobile: true },
  { key: "edukasi", label: "Edukasi", icon: BookOpen },
  { key: "missions", label: "Mission", icon: Target, mobile: true },
  { key: "ttd", label: "TTD Tracker", icon: CalendarCheck, mobile: true },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy, mobile: true },
  { key: "community", label: "Community", icon: Users },
  { key: "badges", label: "Badge", icon: Medal },
  { key: "duta", label: "Duta Challenge", icon: Crown },
  { key: "profile", label: "Profil", icon: User, mobile: true },
];

export default function AppShell() {
  const { tab, setTab, setUser, reset } = useFez();
  const [data, setData] = useState<DashData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/participant/dashboard");
      if (res.status === 401) {
        reset();
        return;
      }
      const d = await res.json();
      setData(d);
      const username = useFez.getState().user?.username ?? "";
      setUser({
        id: d.profile.id,
        username,
        role: "PARTICIPANT",
        name: d.profile.name,
        educationLevel: d.profile.educationLevel as "SMP" | "SMA",
        avatar: d.profile.avatar,
        profilePhotoUrl: d.profile.profilePhotoUrl,
      });
    } catch {
      // koneksi — biarkan
    }
  }, [setUser, reset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Pelacak kunjungan per-tab (analisa admin "ala Vercel")
  useEffect(() => {
    trackPage(`/app/${tab}`);
  }, [tab]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    reset();
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fez-cream">
        <div className="pulse-soft text-6xl">🩸</div>
        <p className="mt-3 font-display font-bold text-fez-ink">Menyiapkan zonamu...</p>
      </div>
    );
  }

  const lvl = getLevel(data.profile.xp);
  const mobileTabs = TABS.filter((t) => t.mobile);

  const content = () => {
    switch (tab) {
      case "dashboard": return <DashboardView data={data} refresh={refresh} />;
      case "edukasi": return <EdukasiView />;
      case "missions": return <MissionCenter data={data} refresh={refresh} />;
      case "ttd": return <TTDTrackerView data={data} refresh={refresh} />;
      case "leaderboard": return <LeaderboardView data={data} />;
      case "community": return <CommunityTab />;
      case "badges": return <BadgesView data={data} />;
      case "duta": return <DutaChallengeView data={data} refresh={refresh} />;
      case "profile": return <ProfileView data={data} refresh={refresh} />;
      case "pretest": return <TestView kind="pretest" data={data} refresh={refresh} />;
      case "posttest": return <TestView kind="posttest" data={data} refresh={refresh} />;
      default: return <DashboardView data={data} refresh={refresh} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-fez-cream">
      {/* ================= SIDEBAR (desktop) ================= */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-fez-ink/10 bg-white/70 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <span className="flex h-10 w-10 rotate-[-6deg] items-center justify-center rounded-xl border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 font-display text-lg font-extrabold text-white sticker-sm">
            Fe
          </span>
          <div className="leading-none">
            <p className="font-display text-lg font-extrabold text-fez-ink">FE-ZONE</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-fez-rose">
              Pejuang Fe-Zone — {data.profile.educationLevel}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                tab === t.key
                  ? "border-2 border-fez-ink bg-gradient-to-r from-rose-100 to-amber-100 text-fez-ink shadow-[3px_3px_0_0_#4a1d33]"
                  : "text-fez-ink/60 hover:bg-rose-50 hover:text-fez-ink"
              )}
            >
              <t.icon className="h-4.5 w-4.5" />
              {t.label}
              {t.key === "ttd" && data.totalCheckins > 0 && (
                <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-700">
                  {data.totalCheckins}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border-2 border-fez-ink bg-gradient-to-br from-amber-50 to-rose-50 p-3">
          <div className="flex items-center gap-2">
            <UserAvatar photoUrl={data.profile.profilePhotoUrl} avatar={data.profile.avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-fez-ink">{data.profile.name}</p>
              <p className="text-xs font-bold text-fez-rose">{lvl.icon} {lvl.name}</p>
            </div>
          </div>
          <p className="mt-2 text-center font-display text-lg font-extrabold text-fez-ink">
            <XpCounter xp={data.profile.xp} /> XP
          </p>
        </div>
        <Button variant="ghost" onClick={logout} className="mt-2 justify-start text-xs font-bold text-fez-ink/50 hover:text-fez-rose">
          <LogOut className="mr-2 h-4 w-4" /> Keluar
        </Button>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b-2 border-fez-ink/10 bg-fez-cream/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2 md:hidden">
              <span className="flex h-9 w-9 rotate-[-6deg] items-center justify-center rounded-lg border-2 border-fez-ink bg-gradient-to-br from-rose-500 to-orange-400 font-display text-sm font-extrabold text-white sticker-sm">
                Fe
              </span>
              <div className="leading-none">
                <p className="font-display text-base font-extrabold text-fez-ink">FE-ZONE</p>
                <p className="text-[9px] font-extrabold uppercase text-fez-rose">Pejuang Fe-Zone · {data.profile.educationLevel}</p>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="font-display text-lg font-extrabold text-fez-ink">
                {TABS.find((t) => t.key === tab)?.label ?? "FE-ZONE"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border-2 border-fez-ink bg-amber-200 px-3 py-1 sticker-sm">
                <span className="text-sm">⚡</span>
                <span className="font-display text-sm font-extrabold text-fez-ink">
                  <XpCounter xp={data.profile.xp} /> XP
                </span>
              </div>
              {data.profile.isDuta && (
                <span className="hidden rounded-full border-2 border-fez-ink bg-amber-300 px-2.5 py-1 text-xs font-extrabold text-fez-ink sm:inline sticker-sm">
                  👑 DUTA
                </span>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-xl border-2 border-fez-ink bg-white p-2 text-fez-ink md:hidden"
                aria-label="Buka menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                onClick={() => setTab("profile")}
                className="hidden h-10 w-10 items-center justify-center rounded-full border-2 border-fez-ink bg-white md:flex"
                aria-label="Profil"
              >
                <UserAvatar photoUrl={data.profile.profilePhotoUrl} avatar={data.profile.avatar} size={36} ring={false} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-5 md:pb-10">
          {content()}
        </main>

        {/* Footer desktop + mobile (credit & identitas Dinkes) */}
        <footer className="mt-auto border-t-2 border-fez-ink/10 bg-white/50 px-4 pb-24 pt-4 text-center md:pb-4">
          <DinkesFooter compact />
          <p className="mt-2 text-[11px] text-muted-foreground">
            FE-ZONE · Program Inovasi Gizi Masyarakat — Pencatatan TTD bukan pengganti pengawasan tenaga kesehatan.
          </p>
          <div className="mt-2">
            <SiteCredit />
          </div>
        </footer>
      </div>

      {/* ================= BOTTOM NAV (mobile) ================= */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-fez-ink/10 bg-white/95 backdrop-blur-md md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {mobileTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-extrabold transition",
                tab === t.key ? "text-fez-rose" : "text-fez-ink/45"
              )}
            >
              <span className={cn(
                "flex h-8 w-12 items-center justify-center rounded-xl transition",
                tab === t.key && "bg-gradient-to-r from-rose-100 to-amber-100 border border-fez-rose/30"
              )}>
                <t.icon className="h-5 w-5" />
              </span>
              {t.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </nav>

      {/* ================= MENU SHEET (mobile) ================= */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-fez-ink/50 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute inset-x-3 top-3 max-h-[92vh] overflow-y-auto rounded-3xl border-2 border-fez-ink bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-extrabold text-fez-ink">Menu FE-ZONE</p>
              <button onClick={() => setMenuOpen(false)} className="rounded-full bg-muted p-1.5" aria-label="Tutup menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition",
                    tab === t.key ? "border-fez-rose bg-rose-50 text-fez-rose" : "border-fez-ink/15 text-fez-ink/70"
                  )}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={logout} className="mt-2 w-full justify-center text-xs font-bold text-fez-ink/50">
              <LogOut className="mr-1 h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      )}

      {/* ================= MODAL KIRIM KONTEN ================= */}
      <CommunitySubmitModal />
    </div>
  );
}
