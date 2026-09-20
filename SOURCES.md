# SOURCES — Master Data Kota Bandung (Task 34-a, FE-ZONE P19)

File: `master-data.json` (kecamatan / kelurahan / puskesmas / wilayah)
Collected & cross-checked: 20 September 2026. Build script: `build-master.py`; validator: `validate-master.py`.

## Final counts

| Bagian | Jumlah | Keterangan |
|---|---|---|
| kecamatan | 30 | seluruh kecamatan Kota Bandung |
| kelurahan | 151 | seluruh kelurahan Kota Bandung |
| puskesmas | 80 | seluruh UPT Puskesmas Kota Bandung (bukan Kab. Bandung) |
| wilayah | 84 | mapping wilayah kerja puskesmas → kelurahan; mencakup 82 dari 151 kelurahan dan **seluruh 80 puskesmas** |

> **Catatan penting:** jumlah UPT Puskesmas Kota Bandung adalah **80**, bukan ±40.
> Sumber resmi yang konsisten: (1) LKIP Dinkes Kota Bandung 2023 — berulang kali menyebut
> "80 UPT Puskesmas"; (2) dataset Open Data "Puskesmas di Kota Bandung" — 80 baris per tahun
> (2023, 2024, 2025); (3) tabel hotline resmi Dinkes — 80 entri bernomor 1–80;
> (4) peta resmi Dinkes "Point80Puskesmas2019" (80 titik). "40" kemungkinan berasal dari
> daftar lama sebelum Unit Kesehatan Kelurahan dijadikan UPT.

## Sumber utama

### 1. Kecamatan & kelurahan (30 / 151)
- **Wikipedia ID** — "Daftar kecamatan dan kelurahan di Kota Bandung"
  https://id.wikipedia.org/wiki/Daftar_kecamatan_dan_kelurahan_di_Kota_Bandung
  (diambil via page reader; tabel per kecamatan di-parse: `parse-wiki.py` → `wiki-table-rows.json` → `build-keckel.py`).
- **Kemendagri (via emsifa API)** — validasi silang kode wilayah:
  https://emsifa.github.io/api-wilayah-indonesia/api/regencies/32.json dan `…/regency/3273/districts.json` + villages
  (file `emsifa-kec.json`, `emsifa-kel.json`).
  Hasil: **0 konflik** penugasan kelurahan→kecamatan pada 146 kelurahan yang tersedia di DB Kemendagri
  (5 kelurahan tidak ada di DB tersebut: Gumuruh, Ledeng, Mengger, Nyengseret, Pungkur — semuanya kelurahan asli Bandung).
- Normalisasi ejaan (wiki → bentuk resmi Kemendagri/kodepos), contoh: `Cijawura→Cijaura`, `Darwati→Derwati`,
  `Husien→Husen Sastranegara`, `Gempolsari→Gempol Sari`, `Dunguscariang→Dungus Cariang`, dsb.
  (daftar lengkap tercetak oleh `build-master.py`).
- `Cimincrang` (Gedebage) dipertahankan sesuai Kemendagri + Wikipedia; GeoJSON Dinkes menulis varian "Cimencrang".

### 2. Puskesmas (80) — nama, kecamatan, alamat
- **Open Data Kota Bandung (portal resmi Pemkot Bandung, organisasi Dinas Kesehatan)** — dataset
  "Puskesmas di Kota Bandung", https://opendata.bandung.go.id/dataset/puskesmas-di-kota-bandung
  API: `https://opendata.bandung.go.id/api/bigdata/dinas_kesehatan/puskesmas_di_kota_bandung_2?per_page=300`
  → 240 baris (80 × 3 tahun, 2023/2024/2025), kolom: kecamatan (BPS + Kemendagri), nama_puskesmas, alamat, lat/long.
  Di-verify ulang langsung (live) saat task ini: 80 baris 2023, semuanya `KOTA BANDUNG`.
- **Profil Kesehatan Kota Bandung 2023 (PDF resmi Dinkes, 40 MB)**
  https://dinkes.bandung.go.id/download/profil-kesehatan-kota-bandung-2023/
  (`profil-dinkes-2023.pdf`, teks: `profil-2023.txt`)
  - Tabel 61: daftar **80 UPT Puskesmas beserta kecamatan** — dipakai untuk mengoreksi 9 penugasan
    kecamatan yang salah/usang di dataset Open Data (lihat "Koreksi kecamatan" di bawah).
  - Tabel 5: jumlah puskesmas per kecamatan (total 80) — dipakai sebagai **assert validasi distribusi**
    di `build-master.py`; distribusi final cocok 30/30.
  - LKIP Dinkes 2023 (`lkip-dinkes-2023.pdf`, https://dinkes.bandung.go.id/download-category/lkip/)
    juga menyebut "80 UPT Puskesmas".
- **Ejaan nama**: menampilkan ejaan resmi yang lebih umum (Dinkes hotline + Profil 2023):
  `Cipamokolan` (bukan "Cipamokalan" typo di Open Data), `Moch. Ramdan`, `Ibrahim Adjie`, `Astana Anyar`, dll.

### 3. Telepon puskesmas
- **Dinkes Kota Bandung — halaman "Puskesmas" (tabel hotline resmi, JS table; scrape via agent-browser)**
  https://dinkes.bandung.go.id/upt-dinas/puskesmas/  → `dinkes-hotlines.json` (79 baris; entri no. 8 = BABATAN
  tidak memiliki hotline → `telp: null`, dikonfirmasi juga oleh kompilasi Kompas yang menulis "-").
  Di-verify ulang (live) saat task ini: tabel bernomor 1–80 tampil.
- Kolom dipakai: **Hotline Pelayanan Umum** (kolom ke-3). Cross-check: kompilasi **Kompas 2022**
  (dari Komdata Kemenkes + Dinkes; `kompas-full.json`, 71 entri) — nomor cocok untuk entri yang dibandingkan.
- Alias nama saat join: `M. RAMDAN→MOCH. RAMDAN`, `IBRAHIM AJI→IBRAHIM ADJIE`, `CIPAMOKOLAN→CIPAMOKALAN`.

### 4. Wilayah kerja (puskesmas → kelurahan) — SEBAGIAN
- **Dinkes Kota Bandung — "Peta Wilayah Kerja Puskesmas"**
  https://dinkes.bandung.go.id/peta-wilayah-kerja/ → embed QGIS `https://wilayah-kerja-puskesmas.netlify.app/`
  data: `data/batas_kelurahan_distaruopendata_1.js` (82 poligon kelurahan, atribut `Puskesmas`)
  + `data/Point80Puskesmas2019_2.js` (80 titik). File di-verify **byte-identik** dengan unduhan live
  (`wilayah-geojson.js`, `points-80.js`).
- Hasil: 84 pasang (82 kelurahan; 2 kelurahan dilayani 2 puskesmas: Jatihandap → Jatihandap & Mandala Mekar,
  Karang Pamulang → Pamulang & Girimande; 4 puskesmas melayani 2 kelurahan: Cijerah, Derwati, Ibrahim Adjie,
  Riung Bandung). **Seluruh 80 puskesmas** punya ≥1 kelurahan di mapping ini.
- **GAP**: 69 kelurahan (48%) belum terpetakan dari sumber resmi yang tersedia. Perwal/SK penataan wilayah
  kerja tidak ditemukan di JDIH. Tidak ada data yang dikarang; sistem FE-ZONE harus menangani wilayah parsial.

## Koreksi kecamatan (9) — dataset Open Data vs Profil Kesehatan 2023
Kolom `bps_nama_kecamatan` di dataset Open Data memuat 9 penugasan salah/usang (batas kecamatan pra-2001 /
geocoding). Dikoreksi berdasarkan Tabel 61 + konsistensi Tabel 5 Profil Kesehatan 2023, Peta Wilayah Kerja
(kelurahan yang dilayani), dan alamat:

| Puskesmas | Open Data (salah) | Koreksi | Bukti |
|---|---|---|---|
| Cikutra Lama | Cibeunying Kaler | **Coblong** | Profil T61; melayani Sekeloa (Coblong) |
| Jatihandap | Cibeunying Kidul | **Mandalajati** | Profil T61; kel. Jatihandap di Mandalajati |
| Karangsetra | Sukajadi | **Sukasari** | Profil T61+T5; melayani Gegerkalong (Sukasari) |
| Panyileukan | Cibiru | **Panyileukan** | Profil T61; melayani Cipadung Kidul (Panyileukan) |
| Pasirlayung | Regol | **Cibeunying Kidul** | Profil T61; kel. Pasirlayung di Cibeunying Kidul |
| Caringin | Bandung Kulon | **Babakan Ciparay** | Profil T61+T5; alamat od "KEC. BABAKAN CIPARAY 40223"; melayani kel. Babakan Ciparay |
| Cinambo | Ujungberung | **Cinambo** | Profil T61; kompas "Kec. Cinambo"; melayani Sukamulya (Cinambo) |
| Riung Bandung | Rancasari | **Gedebage** | Profil T61; melayani Cisaranten Kidul & Rancabolang (Gedebage) |
| Sindangjaya | Arcamanik | **Mandalajati** | Profil T61; kel. Sindang Jaya di Mandalajati |

Catatan: `Puter` (Profil T61 menulis "cidadap", od/Kompas/geojson: Coblong — melayani Sadang Serang, Coblong;
Tabel 5 hanya konsisten jika Coblong) dan `Babakan Tarogong` (Profil T61 menulis "bojongloa kidul", yang benar
Bojongloa Kaler sesuai kelurahan & od) dibiarkan mengikuti bukti mayor — distribusi Tabel 5 cocok 30/30.

## Validasi
`python3 build-master.py` → semua assert lolos (jumlah, keunikan, relasi, distribusi Tabel 5).
`python3 validate-master.py` → 14/14 PASS (struktur, relasi, bebas kontaminasi Kab. Bandung).

## Caveats
1. `wilayah` hanya mencakup 82/151 kelurahan (sumber resmi terbatas) — "may be partial" sesuai spek task.
2. `telp` null untuk Puskesmas Babatan (tidak tercantum di sumber resmi manapun).
3. Alamat berasal dari dataset Open Data (kapitalisasi dirapikan; beberapa tanpa nomor rumah).
4. Kota/kabupaten filter: hanya `bps_nama_kabupaten_kota = 3273 KOTA BANDUNG`; puskesmas Kab. Bandung
   (Baleendah, Soreang, dst.) dipastikan tidak masuk.
5. Tahun acuan data puskesmas: 2023 (terbaru dengan alamat lengkap di dataset; baris 2024/2025 identik 80 nama).
