"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface FezUser {
  id: string;
  username: string;
  role: "PARTICIPANT" | "ADMIN";
  name?: string;
  educationLevel?: "SMP" | "SMA";
  avatar?: string;
  profilePhotoUrl?: string | null;
}

export type MainView = "landing" | "auth" | "app" | "admin";
export type AppTab =
  | "dashboard"
  | "edukasi"
  | "missions"
  | "ttd"
  | "leaderboard"
  | "community"
  | "badges"
  | "duta"
  | "profile"
  | "pretest"
  | "posttest";

interface FezState {
  view: MainView;
  tab: AppTab;
  user: FezUser | null;
  authMode: "login" | "register";
  activeMission: string | null;
  celebrating: { show: boolean; title: string; xp: number; badge?: string | null } | null;
  communitySubmitOpen: boolean;
  setCommunitySubmitOpen: (v: boolean) => void;
  setView: (v: MainView) => void;
  setTab: (t: AppTab) => void;
  setUser: (u: FezUser | null) => void;
  setAuthMode: (m: "login" | "register") => void;
  openMission: (key: string | null) => void;
  celebrate: (title: string, xp: number, badge?: string | null) => void;
  closeCelebrate: () => void;
  reset: () => void;
}

export const useFez = create<FezState>()(
  persist(
    (set) => ({
      view: "landing",
      tab: "dashboard",
      user: null,
      authMode: "register",
      activeMission: null,
      celebrating: null,
      communitySubmitOpen: false,
      setView: (v) => set({ view: v }),
      setTab: (t) => set({ tab: t, activeMission: null }),
      setUser: (u) => set({ user: u }),
      setAuthMode: (m) => set({ authMode: m }),
      openMission: (k) => set({ activeMission: k }),
      celebrate: (title, xp, badge) => set({ celebrating: { show: true, title, xp, badge: badge ?? null } }),
      closeCelebrate: () => set({ celebrating: null }),
      setCommunitySubmitOpen: (v) => set({ communitySubmitOpen: v }),
      reset: () => set({ view: "landing", tab: "dashboard", user: null, activeMission: null, celebrating: null, communitySubmitOpen: false }),
    }),
    {
      name: "fezone-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ view: s.view, tab: s.tab, user: s.user, authMode: s.authMode }),
    }
  )
);
