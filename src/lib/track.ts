// ------------------------------------------------------------
// Pelacak kunjungan halaman (anonim) untuk analisa admin "ala Vercel".
//
// - Identitas pengunjung = ID acak di localStorage (fez_vid).
//   TIDAK menyimpan nama/email/data pribadi — hanya: halaman, perangkat,
//   browser, waktu.
// - trackPage() dipanggil setiap pindah halaman/tab; pakai sendBeacon
//   agar tidak memperlambat navigasi.
// ------------------------------------------------------------

let cachedVid: string | null = null;
let lastTracked = "";

function getVisitorId(): string {
  if (cachedVid) return cachedVid;
  try {
    cachedVid = localStorage.getItem("fez_vid");
    if (!cachedVid) {
      cachedVid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("fez_vid", cachedVid);
    }
  } catch {
    cachedVid = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return cachedVid;
}

export function trackPage(path: string): void {
  try {
    if (!path || path === lastTracked) return; // cegah dobel kirim pada render ulang
    lastTracked = path;
    const payload = JSON.stringify({
      path,
      visitorId: getVisitorId(),
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", { method: "POST", body: blob, keepalive: true }).catch(() => {});
    }
  } catch {
    // pelacakan tidak boleh pernah mengganggu pengguna
  }
}
