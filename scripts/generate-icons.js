/* eslint-disable @typescript-eslint/no-require-imports */
// ------------------------------------------------------------
// Generate ikon PWA FE-ZONE (tema: pil TTD) dari SVG → PNG
// via sharp (sudah ada di dependencies). Jalankan sekali:
//   node scripts/generate-icons.js
// Output: public/icons/icon-192.png, icon-512.png,
//         icon-180.png, icon-maskable-512.png, badge-96.png
// ------------------------------------------------------------

const sharp = require("sharp");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "icons");

// Pil putih miring + latar gradasi rose (warna brand FE-ZONE)
function iconSvg(size, { maskable = false } = {}) {
  const pad = maskable ? 0.78 : 1; // maskable: konten aman 80% area
  const cx = size / 2;
  const pillW = size * (0.46 * pad);
  const pillH = size * (0.27 * pad);
  const rx = pillH / 2;
  const shine = pillW * 0.26;
  const bgRect = maskable
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fb7185"/>
      <stop offset="1" stop-color="#be123c"/>
    </linearGradient>
  </defs>
  ${bgRect}
  <g transform="rotate(-45 ${cx} ${cx})">
    <rect x="${cx - pillW / 2}" y="${cx - pillH / 2}" width="${pillW}" height="${pillH}" rx="${rx}" fill="#ffffff"/>
    <line x1="${cx}" y1="${cx - pillH / 2}" x2="${cx}" y2="${cx + pillH / 2}" stroke="#fb7185" stroke-width="${size * 0.02}"/>
    <rect x="${cx - pillW / 2 + rx * 0.45}" y="${cx - pillH / 2 + pillH * 0.16}" width="${shine}" height="${pillH * 0.16}" rx="${pillH * 0.08}" fill="#ffe4e6"/>
  </g>
  <circle cx="${size * 0.78}" cy="${size * 0.2}" r="${size * 0.032}" fill="#fecdd3" opacity="0.95"/>
  <circle cx="${size * 0.2}" cy="${size * 0.8}" r="${size * 0.022}" fill="#ffffff" opacity="0.7"/>
</svg>`;
}

// Badge notifikasi: pil putih polos di atas transparan (Android)
function badgeSvg(size) {
  const cx = size / 2;
  const pillW = size * 0.62;
  const pillH = size * 0.36;
  const rx = pillH / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="rotate(-45 ${cx} ${cx})">
    <rect x="${cx - pillW / 2}" y="${cx - pillH / 2}" width="${pillW}" height="${pillH}" rx="${rx}" fill="#ffffff"/>
  </g>
</svg>`;
}

async function make(svg, file, width) {
  await sharp(Buffer.from(svg)).resize(width, width).png().toFile(path.join(OUT, file));
  console.log("OK  public/icons/" + file);
}

(async () => {
  await make(iconSvg(512), "icon-512.png", 512);
  await make(iconSvg(512), "icon-192.png", 192);
  await make(iconSvg(512), "icon-180.png", 180);
  await make(iconSvg(512, { maskable: true }), "icon-maskable-512.png", 512);
  await make(badgeSvg(96), "badge-96.png", 96);
  console.log("Semua ikon selesai.");
})();
