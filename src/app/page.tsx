"use client";

import { useEffect, useState } from "react";
import { useFez, type AppTab } from "@/lib/store";
import Landing from "@/components/fezone/landing";
import AuthPage from "@/components/fezone/auth-page";
import AppShell from "@/components/fezone/app-shell";
import { AdminDashboard, AdminLogin } from "@/components/fezone/admin";
import { CelebrationModal } from "@/components/fezone/ui-bits";
import { trackPage } from "@/lib/track";

export default function Home() {
  const { view, setView, user } = useFez();
  const [ready, setReady] = useState(false);

  // Cek sesi saat pertama kali load
  useEffect(() => {
    // Dukungan deep-link dari halaman lupa/reset password dan dari
    // notifikasi push pengingat TTD:
    //   /?view=auth         -> halaman masuk
    //   /?view=admin        -> login admin
    //   /?view=app&tab=ttd  -> langsung buka TTD Tracker (klik notifikasi)
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "auth" || v === "admin" || v === "app") useFez.getState().setView(v);
    const t = params.get("tab");
    const validTabs = ["dashboard", "edukasi", "missions", "ttd", "leaderboard", "community", "badges", "duta", "profile", "pretest", "posttest"];
    if (t && validTabs.includes(t)) useFez.getState().setTab(t as AppTab);
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const d = await res.json();
          if (d.user) {
            useFez.getState().setUser({
              id: d.user.id,
              username: d.user.username,
              role: d.user.role,
              name: d.user.name,
              educationLevel: d.user.educationLevel,
              avatar: d.user.avatar,
            });
            if (d.user.role === "ADMIN" && view !== "admin") {
              useFez.getState().setView("admin");
            } else if (d.user.role === "PARTICIPANT" && view !== "app") {
              useFez.getState().setView("app");
            }
          } else {
            // sesi habis → kembali ke landing
            if (view === "app" || view === "admin") useFez.getState().setView("landing");
          }
        }
      } catch {
        // offline — lanjut
      }
      setReady(true);
    })();
     
  }, []);

  useEffect(() => {
    // scroll ke atas saat pindah view
    window.scrollTo({ top: 0 });
  }, [view]);

  // Pelacak kunjungan (analisa admin). View "app" dilacak per-tab oleh AppShell.
  useEffect(() => {
    if (!ready) return;
    if (view === "landing") trackPage("/");
    else if (view === "auth") trackPage("/masuk");
    else if (view === "admin") trackPage("/admin");
  }, [view, ready]);

  // Pesan dari Service Worker saat notifikasi push diklik dan
  // website ternyata SUDAH terbuka di tab lain → pindah ke URL
  // tujuan (mis. TTD Tracker) tanpa reload.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (!data || data.type !== "OPEN_URL" || typeof data.url !== "string") return;
      try {
        const u = new URL(data.url, window.location.origin);
        const v = u.searchParams.get("view");
        const t = u.searchParams.get("tab");
        if (v === "landing" || v === "auth" || v === "app" || v === "admin") useFez.getState().setView(v);
        if (t) {
          const validTabs = ["dashboard", "edukasi", "missions", "ttd", "leaderboard", "community", "badges", "duta", "profile", "pretest", "posttest"];
          if (validTabs.includes(t)) useFez.getState().setTab(t as AppTab);
        }
      } catch {
        // URL tidak valid — abaikan
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-fez-cream">
        <div className="pulse-soft text-7xl">🩸</div>
        <p className="mt-4 font-display text-xl font-extrabold text-fez-ink">FE-ZONE</p>
        <p className="text-sm text-muted-foreground">Duta Remaja Putri Bebas Anemia</p>
      </div>
    );
  }

  return (
    <>
      {view === "landing" && <Landing />}
      {view === "auth" && <AuthPage />}
      {view === "app" && <AppShell />}
      {view === "admin" && (user?.role === "ADMIN" ? <AdminDashboard /> : <AdminLogin />)}
      <CelebrationModal />
    </>
  );
}
