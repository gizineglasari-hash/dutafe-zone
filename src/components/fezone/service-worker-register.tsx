"use client";

import { useEffect } from "react";

// Mendaftarkan Service Worker (public/sw.js) saat aplikasi dibuka.
// Service Worker diperlukan agar HP bisa menerima push notification
// pengingat TTD. Tanpa izin notifikasi, ia hanya diam — aman.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // diam saja — browser mungkin tidak mendukung (mis. browser privat)
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
