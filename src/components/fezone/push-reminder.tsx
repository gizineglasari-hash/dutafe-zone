"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Loader2 } from "lucide-react";

// ------------------------------------------------------------
// Kartu "Pengingat Otomatis" di TTD Tracker.
// Peserta menekan tombol → browser menanyakan izin notifikasi →
// perangkat didaftarkan ke server → server bisa mengirim pengingat
// mingguan "💊 Saatnya Ingat TTD!" jika >= 7 hari tidak check-in.
// ------------------------------------------------------------

type PushState =
  | "checking" // memeriksa dukungan & status
  | "unsupported" // browser tidak mendukung push
  | "insecure" // bukan HTTPS (push butuh HTTPS)
  | "ios-install" // iPhone: harus install PWA dulu ke Home Screen
  | "not-configured" // VAPID belum diatur admin
  | "denied" // izin notifikasi diblokir user
  | "off" // siap, tapi belum aktif
  | "on" // aktif
  | "error";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushReminderCard() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  const cekStatus = useCallback(async () => {
    setState("checking");
    setInfo(null);

    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setState("insecure");
      return;
    }

    // iPhone/iPad: web push hanya jalan jika website di-install ke
    // Home Screen (aturan Apple sejak iOS 16.4).
    if (isIOS() && !isStandalone()) {
      setState("ios-install");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      setReg(registration);

      // Kunci publik server (jika belum diatur admin → tampilkan info)
      const res = await fetch("/api/push/public-key");
      if (!res.ok) {
        setState("not-configured");
        return;
      }
      const { publicKey } = (await res.json()) as { publicKey: string };

      // Perangkat ini sudah punya langganan? Sinkronkan ke server
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }
        // Self-heal: pastikan server juga menyimpannya
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existing.toJSON()),
        }).catch(() => {});
        setState("on");
        return;
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      // simpan kunci untuk dipakai saat tombol ditekan
      window.sessionStorage.setItem("fez_vapid_key", publicKey);
      setState("off");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    cekStatus();
  }, [cekStatus]);

  async function aktifkan() {
    setBusy(true);
    setInfo(null);
    try {
      // 1. Minta izin (HARUS dari klik tombol — aturan browser)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      // 2. Kunci publik VAPID dari server
      let publicKey = window.sessionStorage.getItem("fez_vapid_key");
      const res = await fetch("/api/push/public-key");
      if (!res.ok) {
        setState("not-configured");
        return;
      }
      publicKey = ((await res.json()) as { publicKey: string }).publicKey;
      window.sessionStorage.setItem("fez_vapid_key", publicKey);

      // 3. Daftarkan langganan di browser
      const registration = reg ?? (await navigator.serviceWorker.ready);
      setReg(registration);
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      // 4. Simpan ke server FE-ZONE
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!save.ok) {
        setInfo("Gagal menyimpan pengingat ke server. Coba lagi sebentar ya.");
        return;
      }

      setState("on");
      setInfo("Siap! Kalau 7 hari kamu tidak check-in TTD, kami ingatkan lewat notifikasi HP-mu. 🔔");
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "";
      setInfo(msg.includes("permission") ? "Izin notifikasi ditolak. Aktifkan lewat pengaturan browser." : "Terjadi kendala saat mengaktifkan pengingat. Coba lagi ya.");
      setState("denied");
    } finally {
      setBusy(false);
    }
  }

  async function matikan() {
    setBusy(true);
    setInfo(null);
    try {
      const registration = reg ?? (await navigator.serviceWorker.ready);
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
      setInfo("Pengingat otomatis dimatikan. Kamu bisa mengaktifkannya lagi kapan saja.");
    } catch {
      setInfo("Gagal mematikan pengingat. Coba lagi ya.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-rose-50 to-amber-50 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-fez-ink bg-white text-xl">
          {state === "on" ? "🔔" : "🔕"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold text-fez-ink">Pengingat Otomatis (Notifikasi HP)</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Kalau <b>7 hari</b> kamu tidak check-in TTD, FE-ZONE mengirim notifikasi ke HP-mu otomatis:
            <span className="font-bold text-fez-ink"> &ldquo;💊 Saatnya Ingat TTD!&rdquo;</span> — gratis, tanpa aplikasi tambahan.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {state === "checking" && (
          <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa perangkatmu...
          </p>
        )}

        {state === "on" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-teal-500 bg-teal-50 px-3 py-1.5 text-xs font-extrabold text-teal-700">
              <Bell className="h-3.5 w-3.5" /> PENGINGAT AKTIF di perangkat ini
            </span>
            <button
              onClick={matikan} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-fez-ink/20 bg-white px-3 py-1.5 text-xs font-extrabold text-fez-ink/70 transition hover:border-fez-rose hover:text-fez-rose disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />} Matikan
            </button>
          </div>
        )}

        {state === "off" && (
          <button
            onClick={aktifkan} disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_#4a1d33] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#4a1d33] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔔"} Aktifkan Pengingat di HP Ini
          </button>
        )}

        {state === "denied" && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-800">
            Izin notifikasi perangkat ini <b>terblokir</b>. Buka pengaturan situs di browser-mu (ikon 🔒/ⓘ di samping alamat) → izinkan Notifikasi → muat ulang halaman ini.
          </div>
        )}

        {state === "ios-install" && (
          <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-3 text-xs font-bold leading-relaxed text-sky-800">
            📱 Pakai iPhone/iPad? Sesuai aturan Apple, notifikasi hanya bisa aktif setelah FE-ZONE di-install ke Home Screen:
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Buka fezone di Safari → tekan tombol <b>Bagikan</b> (kotak dengan panah ke atas)</li>
              <li>Pilih <b>&ldquo;Tambahkan ke Layar Utama&rdquo;</b></li>
              <li>Buka FE-ZONE dari ikon baru di Home Screen → kembali ke halaman ini</li>
            </ol>
          </div>
        )}

        {state === "unsupported" && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 text-xs font-bold leading-relaxed text-gray-600">
            Browser perangkat ini belum mendukung notifikasi. Coba buka FE-ZONE dengan <b>Chrome</b> (Android) atau <b>Safari</b> (iPhone, via Home Screen).
          </div>
        )}

        {state === "insecure" && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 text-xs font-bold leading-relaxed text-gray-600">
            Notifikasi butuh koneksi HTTPS. Buka FE-ZONE lewat alamat resminya (https://...) ya.
          </div>
        )}

        {state === "not-configured" && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-3 text-xs font-bold leading-relaxed text-gray-600">
            Pengingat belum tersedia — admin belum menyelesaikan pengaturan server. Coba lagi nanti ya. 🙏
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-relaxed text-rose-700">
            Terjadi kendala saat memeriksa perangkat. Muat ulang halaman dan coba lagi.
          </div>
        )}
      </div>

      {info && (
        <p className="mt-3 rounded-2xl bg-white/80 p-3 text-xs font-bold leading-relaxed text-fez-ink/80">
          {info}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
        Kepanjangan notifikasi? Kamu bisa mematikannya kapan saja di sini. Pengingat ini alat bantu konsistensi, bukan pengganti anjuran tenaga kesehatan.
      </p>
    </motion.div>
  );
}
