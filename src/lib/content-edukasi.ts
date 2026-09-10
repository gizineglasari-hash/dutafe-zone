// ============================================================
// FE-ZONE — Konten Edukasi (7 kategori)
// ============================================================

export interface EduCard {
  icon: string;
  title: string;
  points: string[]; // poin-poin singkat
  tone?: "rose" | "teal" | "amber" | "green" | "violet" | "cyan";
}

export interface EduCategory {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  cards: EduCard[];
  tip: string;
}

export const EDUKASI: EduCategory[] = [
  {
    key: "anemia",
    icon: "🩸",
    title: "Kenali Anemia",
    subtitle: "Musuh tak terlihat yang bikin lemas terus",
    tip: "Kalau kamu sering pusing, lemas, dan pucat — jangan dianggap biasa. Cek Hb ke tenaga kesehatan ya!",
    cards: [
      {
        icon: "❓", title: "Apa Itu Anemia?", tone: "rose",
        points: [
          "Kondisi tubuh kekurangan sel darah merah atau hemoglobin (Hb)",
          "Hb adalah 'angkutan oksigen' darah — kalau kurang, tubuh kekurangan oksigen",
          "Remaja putri disebut anemia jika Hb < 12 g/dL",
          "Anemia bukan penyakit, tapi kondisi yang BISA dicegah & disembuhkan",
        ],
      },
      {
        icon: "🚨", title: "Gejala-Gejalanya", tone: "amber",
        points: [
          "Lemas, capek, dan ngantuk terus walau sudah tidur",
          "Wajah, kelopak mata, dan kuku terlihat pucat",
          "Sering pusing, terutama saat berdiri tiba-tiba",
          "Jantung berdebar, susah konsentrasi saat belajar",
        ],
      },
      {
        icon: "🔍", title: "Penyebabnya", tone: "teal",
        points: [
          "Kurang makan makanan sumber zat besi (penyebab #1)",
          "Kehilangan darah tiap menstruasi",
          "Serba-serbi teh & kopi yang menghambat serapan zat besi",
          "Diet yang tidak seimbang atau pola makan acak",
        ],
      },
      {
        icon: "💔", title: "Dampak Kalau Dibiarkan", tone: "violet",
        points: [
          "Prestasi & konsentrasi belajar menurun",
          "Mudah sakit karena daya tahan tubuh turun",
          "Kelak saat hamil: risiko prematur, bayi BBLR, dan stunting",
          "Tubuh lemas — potensi terpendam jadi tidak berkembang",
        ],
      },
    ],
  },
  {
    key: "ttd",
    icon: "💊",
    title: "TTD",
    subtitle: "Senjata rahasia melawan anemia",
    tip: "Aturan emas: 1 tablet seminggu, diminum SETELAH makan dengan air putih, jangan bersamaan dengan teh/kopi/susu!",
    cards: [
      {
        icon: "💊", title: "Kenalan dengan TTD", tone: "violet",
        points: [
          "TTD = Tablet Tambah Darah",
          "Isinya: 60 mg zat besi + 400 mcg asam folat",
          "Zat besi → bahan bakar pembentuk darah",
          "Asam folat → pembentuk sel baru & penting saat hamil nanti",
        ],
      },
      {
        icon: "📅", title: "Jadwal Konsumsi", tone: "teal",
        points: [
          "Pencegahan (program sekolah/WIFAS): 1 tablet SEMINGGU",
          "Terapi (jika sudah terdiagnosis anemia): konsultasikan dengan tenaga kesehatan terkait dosis terapi anemia",
          "Lupa minum? Lanjutkan minggu depan — JANGAN digandakan!",
          "Catat di TTD Tracker biar tidak lupa 😉",
        ],
      },
      {
        icon: "🥤", title: "Cara Konsumsi yang Benar", tone: "green",
        points: [
          "Minum setelah makan dengan segelas air putih",
          "JANGAN bersamaan dengan teh, kopi, atau susu (jeda 2 jam)",
          "Boleh ditemani jus jeruk — vitamin C bantu serapan!",
          "Tablet ditelan utuh, tidak perlu dikunyah",
        ],
      },
      {
        icon: "⚠️", title: "Efek Samping? Tenang!", tone: "amber",
        points: [
          "Mual ringan → minum setelah makan, bukan perut kosong",
          "Tinja agak hitam → normal dan tidak berbahaya",
          "Kalau mual berat atau muntah terus → cerita ke petugas UKS/orang tua",
          "Jangan berhenti duluan sebelum konsultasi!",
        ],
      },
    ],
  },
  {
    key: "food",
    icon: "🥗",
    title: "Makanan Sumber Zat Besi",
    subtitle: "Isi keranjang belanjamu dengan yang kaya zat besi",
    tip: "Zat besi hewani (daging, ikan, telur) lebih mudah diserap daripada nabati. Kombinasikan keduanya + vitamin C!",
    cards: [
      {
        icon: "🥩", title: "Sumber Hewani (Heme)", tone: "rose",
        points: [
          "Daging merah (sapi, kambing) — juara zat besi",
          "Hati ayam/sapi — zat besi tertinggi + folat",
          "Ikan & seafood — protein + zat besi",
          "Telur — praktis, murah, bergizi lengkap",
        ],
      },
      {
        icon: "🥬", title: "Sumber Nabati (Non-Heme)", tone: "green",
        points: [
          "Bayam, kangkung, daun katuk — sayuran hijau tua",
          "Kacang merah, kacang hijau, kedelai",
          "Tempe & tahu — favorit Indonesia!",
          "Brokoli, labu, kurma, kismis",
        ],
      },
      {
        icon: "🍊", title: "Teman Sejati: Vitamin C", tone: "amber",
        points: [
          "Vitamin C meningkatkan serapan zat besi nabati berkali-kali lipat",
          "Jeruk, jambu biji, pepaya, stroberi, tomat",
          "Tips: tutup makan dengan segelas jus jeruk",
          "Gorengan + es teh? Anti-mainstream anemia. Hindari!",
        ],
      },
      {
        icon: "🚫", title: "Musuh Penyerapan", tone: "rose",
        points: [
          "Teh & kopi — tanin mengikat zat besi",
          "Susu & produk kalsium tinggi — jeda 2 jam dari TTD",
          "Minuman bersoda — mengganggu penyerapan",
          "Makanan ultra-proses tinggi gula & lemak",
        ],
      },
    ],
  },
  {
    key: "vitc",
    icon: "🍊",
    title: "Vitamin C",
    subtitle: "Pasangan setia si zat besi",
    tip: "Segelas jus jeruk setelah makan = cheat code penyerapan zat besi!",
    cards: [
      {
        icon: "⚡", title: "Kenapa Penting?", tone: "amber",
        points: [
          "Mengubah zat besi menjadi bentuk yang mudah diserap usus",
          "Meningkatkan serapan zat besi nabati sampai 3-4x lipat",
          "Juga penting untuk imunitas & kolagen kulit",
          "Tubuh tidak menyimpannya — perlu diambil tiap hari",
        ],
      },
      {
        icon: "🍊", title: "Sumber Terbaik", tone: "green",
        points: [
          "Jambu biji — juara vitamin C lokal!",
          "Jeruk, jeruk nipis, kecombrang buah",
          "Pepaya, stroberi, kiwi, mangga",
          "Tomat, paprika, brokoli",
        ],
      },
      {
        icon: "🍱", title: "Kombinasi Jitu", tone: "teal",
        points: [
          "Nasi + tempe + tumis kangkung + jeruk",
          "Bubur bayam + telur + tomat",
          "Sate ayam + lalapan + jus jambu",
          "Gado-gado + pepaya matang",
        ],
      },
    ],
  },
  {
    key: "pola",
    icon: "🍱",
    title: "Pola Makan Seimbang",
    subtitle: "Isi Piringku versi remaja putri",
    tip: "Jangan skip sarapan! Remaja yang sarapan lebih fokus dan jarang ngemil sembarangan.",
    cards: [
      {
        icon: "🍽️", title: "Isi Piringku", tone: "green",
        points: [
          "1/3 piring: makanan pokok (nasi, kentang, jagung)",
          "1/3 piring: sayuran berbagai warna",
          "1/6 piring: lauk pauk (ikan, ayam, telur, tempe)",
          "1/6 piring: buah segar + 8 gelas air/hari",
        ],
      },
      {
        icon: "⏰", title: "Jadwal Makan Teratur", tone: "teal",
        points: [
          "3 makan besar + 2 snack sehat sehari",
          "Sarapan sebelum jam 9 pagi",
          "Tidak skip makan walau sibuk tugas & ekskul",
          "Makan pelan, kunyah baik — bantu pencernaan",
        ],
      },
      {
        icon: "🧃", title: "Tips Praktis Remaja", tone: "amber",
        points: [
          "Bawa bekal minimal 2x seminggu",
          "Ganti jajanan manis dengan buah potong",
          "Coba resep baru dengan bahan kaya zat besi",
          "Ngemil sehat: kacang rebus, pisang, yoghurt",
        ],
      },
    ],
  },
  {
    key: "myth",
    icon: "🧠",
    title: "Mitos & Fakta",
    subtitle: "Jangan gampang percaya kabar burung!",
    tip: "Cek dulu sumbernya sebelum share. Sebagai calon Duta Fe-Zone, kamu penyaring informasi di lingkunganmu!",
    cards: [
      {
        icon: "❌", title: "Mitos Populer", tone: "rose",
        points: [
          "'TTD bikin gemuk' — SALAH, tidak ada kalorinya",
          "'TTD bikin jantungan' — SALAH, dosisnya aman",
          "'Cuma orang kurus yang bisa anemia' — SALAH",
          "'Minum TTD bareng kopi gpp' — SALAH, hambat serapan",
        ],
      },
      {
        icon: "✅", title: "Faktanya", tone: "teal",
        points: [
          "TTD aman untuk remaja putri sesuai dosis",
          "Tinja hitam itu efek normal",
          "Semua remaja putri berisiko anemia",
          "TTD + air putih setelah makan = paling optimal",
        ],
      },
      {
        icon: "🎮", title: "Uji Logismu", tone: "violet",
        points: [
          "Main game 'Mitos atau Fakta' di Mission Center",
          "Ada 12 pernyataan menantang",
          "Dapatkan +100 XP dan jadi lebih pintar dari gosip!",
          "Mission 6 menantimu 🔥",
        ],
      },
    ],
  },
  {
    key: "tips",
    icon: "✨",
    title: "Tips Remaja Sehat",
    subtitle: "Biar glowing dari dalam, bukan cuma filter",
    tip: "Tidur cukup 8-9 jam/malam. Remaja yang tidur cukup punya fokus, mood, dan metabolisme yang lebih baik!",
    cards: [
      {
        icon: "😴", title: "Istirahat Cukup", tone: "violet",
        points: [
          "Tidur 8-9 jam setiap malam",
          "Kurangi begadang scroll medsos",
          "HP 1 jam sebelum tidur → bikin susah nyenyak",
          "Tidur cukup = hormon seimbang & darah segar",
        ],
      },
      {
        icon: "🏃‍♀️", title: "Gerak Tiap Hari", tone: "rose",
        points: [
          "Olahraga 60 menit/hari (jalan, sepeda, dance, futsal)",
          "Olahraga memperbaiki sirkulasi darah",
          "Pilih yang kamu suka biar konsisten",
          "Ajak teman biar seru!",
        ],
      },
      {
        icon: "💧", title: "Hidrasi & Kebiasaan Baik", tone: "teal",
        points: [
          "Minum 8 gelas air putih sehari",
          "Cek Hb minimal 1x/tahun (posyandu remaja/UKS)",
          "Catat siklus haid kamu",
          "Rutin minum TTD sesuai jadwal program",
        ],
      },
    ],
  },
];

// ------------------------------------------------------------
// Materi singkat untuk Mission 1 & 2 (baca sebelum quiz)
// ------------------------------------------------------------
export const MATERI_M1 = [
  { icon: "🩸", title: "Anemia Itu Apa?", text: "Anemia = tubuh kekurangan sel darah merah atau hemoglobin (Hb). Hb tugasnya mengangkut oksigen ke seluruh tubuh. Kalau Hb kurang, badan jadi lemas, pucat, dan cepat capek karena kekurangan oksigen." },
  { icon: "🔍", title: "Kenapa Bisa Anemia?", text: "Penyebab utamanya kurang zat besi. Bisa juga karena menstruasi (kehilangan darah), kurang asam folat & vitamin B12, diet tidak seimbang, atau kebiasaan minum teh/kopi bersama makan." },
  { icon: "🚨", title: "Gejalanya Seperti Ini", text: "Lemas terus, pucat (lihat kelopak matamu!), sering pusing, jantung berdebar, susah fokus belajar, dan gampang ngantuk. Kalau 3 gejala ini kamu rasakan, wajib cek Hb ya!" },
  { icon: "💔", title: "Dampaknya Ngeri Nggak Sih?", text: "Nggak cuma lemas. Anemia menurunkan prestasi, bikin mudah sakit, dan kelak saat hamil berisiko melahirkan bayi prematur/BBLR. Jadi cegah dari SEKARANG, saat masih remaja!" },
  { icon: "👧", title: "Kenapa Kamu (Remaja Putri) Rawan?", text: "Dua alasan: pertumbuhan pesat butuh banyak zat besi, dan menstruasi bulanan menghilangkan zat besi dari tubuh. Plus biasanya kita suka diet aneh-aneh dan jajan asal-asalan." },
  { icon: "🛡️", title: "Cara Mencegahnya", text: "1) Makan makanan kaya zat besi + vitamin C. 2) Rutin minum TTD sesuai anjuran. 3) Kurangi teh/kopi saat makan. 4) Cek Hb rutin. 5) Jaga pola makan & istirahat. Simpel, kan?" },
];

export const MATERI_M2 = [
  { icon: "💊", title: "Apa Itu TTD?", text: "TTD = Tablet Tambah Darah. Isinya 60 mg zat besi + 400 mcg asam folat. Ini 'suplemen sahabat' remaja putri untuk mencegah anemia." },
  { icon: "🌟", title: "Manfaat TTD", text: "Mencegah anemia, menambah stamina & fokus belajar, memperbaiki kadar Hb, dan menyiapkan tubuh agar kelak sehat saat kehamilan. Satu tablet, banyak manfaat!" },
  { icon: "📅", title: "Jadwalnya", text: "Program sekolah (WIFAS): 1 tablet SEMINGGU, biasanya hari tertentu bersama teman-teman. Kalau sudah anemia: konsultasikan dengan tenaga kesehatan terkait dosis terapi anemia." },
  { icon: "🥤", title: "Cara Minum yang Benar", text: "Setelah makan + segelas air putih. JANGAN bersamaan dengan teh, kopi, atau susu (jeda 2 jam). Boleh ditemani jus jeruk biar serapannya makin mantap!" },
  { icon: "⚠️", title: "Yang Perlu Diperhatikan", text: "Efek samping ringan itu normal: mual tipis, tinja agak hitam. Minum setelah makan mengurangi mual. Jangan gandakan dosis jika lupa! Ceritakan ke UKS jika keluhan berat." },
  { icon: "🧠", title: "Mitos yang Harus Diluruskan", text: "'TTD bikin gemuk'? MITOS! 'TTD bikin mandul'? MITOS! 'Tinja hitam itu bahaya'? MITOS — itu normal. Yuk jadi generasi yang kritis terhadap hoax kesehatan!" },
];
