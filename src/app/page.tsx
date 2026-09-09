"use client";

import { useEffect, useState } from "react";
import { useFez } from "@/lib/store";
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
    // Dukungan deep-link dari halaman lupa/reset password:
    // /?view=auth -> halaman masuk, /?view=admin -> login admin
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "auth" || v === "admin") useFez.getState().setView(v);
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
