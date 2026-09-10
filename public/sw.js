// ------------------------------------------------------------
// FE-ZONE Service Worker — menerima push notification pengingat TTD
// dan menampilkannya sebagai notifikasi HP asli.
// ------------------------------------------------------------

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function tampilkanNotifikasi(data) {
  return self.registration.showNotification(data.title || "💊 Saatnya Ingat TTD!", {
    body: data.body || "Yuk cek TTD Tracker-mu di FE-ZONE!",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || "fezone-ttd-reminder",
    // notifikasi baru selalu "berbunyi/vibrate" lagi, tidak diam saja
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: data.url || "/?view=app&tab=ttd" },
  });
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "FE-ZONE", body: (event.data && event.data.text()) || "Ada pesan baru untukmu!" };
  }
  event.waitUntil(tampilkanNotifikasi(data));
});

// Saat notifikasi diklik → buka FE-ZONE langsung ke TTD Tracker.
// Jika website sudah terbuka di suatu tab, fokuskan tab itu dan
// pindahkan ke halaman TTD (tanpa membuka tab baru).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/?view=app&tab=ttd";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          client.postMessage({ type: "OPEN_URL", url });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
