// ============================================================
// FE-ZONE — Bank soal & konten game
// ============================================================

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index jawaban benar
  explain: string;
}

// ------------------------------------------------------------
// MISSION 1 — Kenali Anemia
// ------------------------------------------------------------
export const QUIZ_M1: Record<"SMP" | "SMA", QuizQuestion[]> = {
  SMP: [
    { q: "Apa itu anemia?", options: ["Kondisi kekurangan sel darah merah atau hemoglobin (Hb)", "Penyakit gigi berlubang", "Alergi makanan laut", "Luka di dalam perut"], answer: 0, explain: "Anemia adalah kondisi ketika jumlah sel darah merah atau hemoglobin berada di bawah normal, sehingga tubuh kekurangan oksigen." },
    { q: "Mana yang BUKAN gejala anemia?", options: ["Cepat lelah dan lemas", "Wajah pucat", "Sering pusing", "Tubuh selalu kuat dan bertenaga"], answer: 3, explain: "Justru sebaliknya, tubuh yang anemia jadi lemas, pucat, pusing, dan cepat lelah karena kekurangan oksigen." },
    { q: "Penyebab anemia yang paling sering pada remaja putri adalah...", options: ["Kekurangan zat besi", "Makan terlalu banyak sayur", "Terlalu banyak olahraga", "Minum air putih"], answer: 0, explain: "Kekurangan zat besi (iron deficiency) adalah penyebab anemia paling umum, terutama pada remaja putri." },
    { q: "Apa dampak anemia bagi pelajar?", options: ["Makin semangat belajar", "Sulit konsentrasi dan prestasi menurun", "Nilai otomatis naik", "Tidak ada dampak sama sekali"], answer: 1, explain: "Kurang oksigen ke otak membuat kita sulit fokus, mudah mengantuk, dan prestasi belajar menurun." },
    { q: "Mengapa remaja putri lebih mudah mengalami anemia?", options: ["Karena lebih suka minum teh", "Karena menstruasi dan masa pertumbuhan cepat", "Karena rambut panjang", "Karena sering begadang saja"], answer: 1, explain: "Setiap menstruasi tubuh kehilangan darah (dan zat besi). Ditambah masa pertumbuhan yang butuh zat besi lebih banyak." },
    { q: "Pilihan makanan berikut yang paling baik untuk mencegah anemia adalah...", options: ["Gorengan dan soda", "Bayam, daging, tempe, dan kacang-kacangan", "Permen dan cokelat", "Mie instan setiap hari"], answer: 1, explain: "Makanan sumber zat besi seperti daging, hati, ikan, telur, sayur hijau, kacang-kacangan, dan tempe adalah sahabat terbaik cegah anemia." },
  ],
  SMA: [
    { q: "Anemia pada remaja putri didefinisikan sebagai kondisi kadar hemoglobin di bawah...", options: ["14 g/dL", "13 g/dL", "12 g/dL", "11 g/dL"], answer: 2, explain: "Menurut WHO, batas Hb normal remaja putri (tidak hamil, usia ≥12 tahun) adalah 12 g/dL. Di bawah itu disebut anemia." },
    { q: "Peran utama zat besi dalam tubuh adalah...", options: ["Menyimpan cadangan lemak", "Menyusun hemoglobin pengikat oksigen", "Mencerna protein", "Mengatur suhu tubuh saja"], answer: 1, explain: "Zat besi adalah komponen heme pada hemoglobin yang mengikat oksigen untuk diedarkan ke seluruh tubuh." },
    { q: "Zat berikut yang MENURUNKAN penyerapan zat besi non-heme (nabati) adalah...", options: ["Vitamin C dari jeruk", "Tanin pada teh dan kopi", "Karbohidrat dari nasi", "Serat dari pepaya"], answer: 1, explain: "Tanin pada teh/kopi mengikat zat besi sehingga sulit diserap. Sebaliknya vitamin C justru meningkatkan penyerapan zat besi." },
    { q: "Kebutuhan zat besi remaja putri dibanding remaja laki-laki cenderung...", options: ["Lebih rendah", "Sama saja", "Lebih tinggi karena kehilangan darah saat menstruasi", "Tidak perlu zat besi"], answer: 2, explain: "Remaja putri membutuhkan zat besi lebih banyak (±15 mg/hari) karena setiap menstruasi terjadi kehilangan zat besi." },
    { q: "Dampak jangka panjang anemia yang tidak tertangani bagi remaja putri di masa depan adalah...", options: ["Risiko melahirkan bayi berat lahir rendah (BBLR) dan prematur", "Tidak bisa berolahraga seumur hidup", "Rambut rontok permanen", "Tidak ada dampak apa pun"], answer: 0, explain: "Anemia saat hamil meningkatkan risiko perdarahan, bayi prematur, BBLR, hingga stunting pada anak. Mencegahnya sejak remaja sangat penting!" },
    { q: "Strategi paling tepat untuk mencegah anemia pada remaja putri adalah...", options: ["Diet ketat agar tetap langsing", "Kombinasi gizi seimbang, konsumsi TTD rutin, dan vitamin C", "Minum kopi setiap pagi", "Tidak perlu apa-apa, tunggu dewasa"], answer: 1, explain: "Pencegahan paling efektif bersifat kombinasi: makanan kaya zat besi + TTD sesuai anjuran + vitamin C pembantu serapan." },
  ],
};

// ------------------------------------------------------------
// MISSION 2 — TTD
// ------------------------------------------------------------
export const QUIZ_M2: Record<"SMP" | "SMA", QuizQuestion[]> = {
  SMP: [
    { q: "TTD singkatan dari...", options: ["Tablet Tambah Darah", "Teh Tabur Daun", "Tahu Tempe Daun", "Tinggi Tubuh Data"], answer: 0, explain: "TTD = Tablet Tambah Darah, suplemen zat besi program pencegahan anemia remaja putri." },
    { q: "Kandungan utama tablet TTD adalah...", options: ["Zat besi dan asam folat", "Vitamin C dan kalsium", "Kopi dan gula", "Protein dan lemak"], answer: 0, explain: "TTD mengandung zat besi (iron) untuk pembentukan darah dan asam folat untuk pembentukan sel baru." },
    { q: "Cara minum TTD yang benar adalah...", options: ["Sambil minum kopi", "Sebelum makan saat perut kosong", "Setelah makan dengan air putih", "Dikunyah dulu baru ditelan"], answer: 2, explain: "Minum TTD setelah makan dengan segelas air putih mengurangi rasa mual dan membantu penyerapan." },
    { q: "Minuman yang harus dihindari bersamaan dengan TTD adalah...", options: ["Air putih", "Air jeruk", "Teh, kopi, dan susu", "Jus pepaya"], answer: 2, explain: "Teh, kopi, dan susu menghambat penyerapan zat besi. Jeda minimal 2 jam setelah minum TTD." },
    { q: "Dalam program sekolah, remaja putri biasanya minum TTD sebanyak...", options: ["1 tablet setiap hari", "1 tablet seminggu", "10 tablet seminggu", "1 tablet sebulan"], answer: 1, explain: "Program pencegahan di sekolah (WIFAS) memberikan 1 TTD per minggu, biasanya di hari tertentu bersama-sama." },
    { q: "Efek samping ringan yang normal setelah minum TTD adalah...", options: ["Mual ringan dan tinja berwarna hitam", "Tumbuh sayap", "Bulu rontok", "Gigi jadi biru"], answer: 0, explain: "Mual ringan, muntah ringan, atau tinja berwarna hitam adalah efek normal dan tidak berbahaya. Tenang saja!" },
  ],
  SMA: [
    { q: "Komposisi TTD standar program suplementasi sekolah (WIFAS) adalah...", options: ["60 mg elemental iron + 400 mcg asam folat", "10 mg vitamin C + 100 mcg kalsium", "30 mg zinc + 200 mcg B12", "100 mg protein + 500 mcg biotin"], answer: 0, explain: "Standar WHO/Kemenkes untuk WIFAS: 60 mg elemental iron dan 400 mcg asam folat per tablet." },
    { q: "WIFAS (Weekly Iron-Folic Acid Supplementation) berarti pemberian TTD...", options: ["1 tablet per hari selama 90 hari", "1 tablet per minggu sepanjang tahun ajaran", "3 tablet sehari saat menstruasi", "2 tablet sebulan"], answer: 1, explain: "Untuk pencegahan (bukan pengobatan), dosisnya 1 tablet/minggu. Untuk remaja yang sudah terdiagnosis anemia: 1 tablet/hari selama 90 hari." },
    { q: "Alasan TTD dianjurkan diminum setelah makan adalah...", options: ["Agar zat besi tidak menyebabkan iritasi lambung", "Agar larut lebih lambat", "Supaya rasanya manis", "Agar tidak terjadi pembekuan darah"], answer: 0, explain: "Zat besi pada perut kosong dapat memicu iritasi dan mual. Makanan melapisi lambung sehingga lebih nyaman." },
    { q: "Jika kamu lupa minum TTD pada jadwalnya, sikap yang benar adalah...", options: ["Minum 7 tablet sekaligus di hari sabtu", "Melanjutkan jadwal berikutnya seperti biasa, jangan gandakan dosis", "Berhenti program", "Mengganti dengan minum darah naga"], answer: 1, explain: "Jangan pernah menggandakan dosis untuk mengganti yang terlewat. Cukup lanjutkan jadwal minggu berikutnya." },
    { q: "Mengapa asam folat penting bagi remaja putri?", options: ["Berperan dalam pembentukan sel darah merah dan penting saat masa kehamilan nanti", "Membuat kulit putih", "Menaikkan berat badan", "Pengganti olahraga"], answer: 0, explain: "Asam folat membantu pembentukan sel darah merah dan mencegah cacat tabung saraf pada janin saat kelak hamil." },
    { q: "Tujuan skrining/pemeriksaan kadar Hb dalam program pencegahan anemia adalah...", options: ["Mengetahui status anemia secara dini untuk tindak lanjut yang tepat", "Syarat lomba lari", "Agar terlihat kompak dengan teman", "Mengganti test kesehatan otak"], answer: 0, explain: "Skrining Hb mendeteksi siapa yang sudah anemia (butuh terapi) dan siapa yang belum (cukup pencegahan WIFAS)." },
  ],
};

// ------------------------------------------------------------
// PRE-TEST (10 soal)
// ------------------------------------------------------------
export const QUIZ_PRETEST: QuizQuestion[] = [
  { q: "Anemia pada remaja putri paling sering disebabkan oleh...", options: ["Kekurangan zat besi", "Kelebihan tidur", "Alergi udara", "Kurang minum air putih"], answer: 0, explain: "" },
  { q: "Salah satu gejala khas anemia adalah...", options: ["Tubuh pucat, lemas, dan cepat lelah", "Mata sangat terang", "Nafsu makan berlebih", "Rambut tumbuh cepat"], answer: 0, explain: "" },
  { q: "Remaja putri berisiko anemia karena...", options: ["Menstruasi dan pertumbuhan yang cepat", "Terlalu banyak belajar", "Sering tertawa", "Tinggi badan di atas rata-rata"], answer: 0, explain: "" },
  { q: "TTD merupakan singkatan dari...", options: ["Tablet Tambah Darah", "Tanda Terima Dana", "Tes Tidur Dalam", "Tim Tari Dangdut"], answer: 0, explain: "" },
  { q: "Kandungan utama TTD adalah...", options: ["Zat besi dan asam folat", "Kalsium dan vitamin D", "Gula dan garam", "Kafein dan taurin"], answer: 0, explain: "" },
  { q: "Jadwal konsumsi TTD pada program pencegahan di sekolah adalah...", options: ["1 tablet seminggu", "1 tablet sebulan", "10 tablet sehari", "Tidak ada jadwal"], answer: 0, explain: "" },
  { q: "Minuman yang menghambat penyerapan zat besi adalah...", options: ["Teh dan kopi", "Air putih", "Jus jeruk", "Air kelapa"], answer: 0, explain: "" },
  { q: "Makanan yang membantu penyerapan zat besi adalah yang mengandung...", options: ["Vitamin C seperti jeruk dan jambu biji", "Lemak gorengan", "Gula pasir", "Soda"], answer: 0, explain: "" },
  { q: "Kelompok makanan yang merupakan sumber zat besi terbaik adalah...", options: ["Daging, hati, ikan, telur, sayur hijau, kacang-kacangan", "Gorengan, keripik, soda, permen", "Mie instan, sosis, keju leleh", "Es krim, biskuit, cokelat"], answer: 0, explain: "" },
  { q: "Manfaat mencegah anemia bagi remaja putri adalah...", options: ["Konsentrasi belajar baik dan persiapan kehamilan sehat di masa depan", "Menjadi lebih pendiam", "Tidak perlu olahraga", "Rambut berkilau"], answer: 0, explain: "" },
];

// ------------------------------------------------------------
// POST-TEST (10 soal — beda formulasi dari pre-test)
// ------------------------------------------------------------
export const QUIZ_POSTTEST: QuizQuestion[] = [
  { q: "Anemia adalah kondisi ketika tubuh mengalami...", options: ["Penurunan kadar hemoglobin/sel darah merah di bawah normal", "Kelebihan sel darah putih", "Pembekuan darah di jantung", "Peningkatan tekanan darah"], answer: 0, explain: "" },
  { q: "Saat menderita anemia, proses yang terjadi di tubuh adalah...", options: ["Jaringan tubuh kekurangan oksigen", "Tubuh kelebihan oksigen", "Darah berhenti mengalir", "Paru-paru membesar"], answer: 0, explain: "" },
  { q: "Selain lemas dan pucat, tanda lain anemia adalah...", options: ["Sering pusing, jantung berdebar, sulit konsentrasi", "Suka makan pedas", "Tulang terasa dingin", "Suara serak"], answer: 0, explain: "" },
  { q: "Usia remaja putri rentan anemia karena terjadi dua hal sekaligus, yaitu...", options: ["Pertumbuhan pesat dan menstruasi", "Ujian sekolah dan pacaran", "Olahraga dan makan pedas", "Tidur siang dan begadang"], answer: 0, explain: "" },
  { q: "TTD bekerja membantu tubuh karena kandungan zat besinya digunakan untuk...", options: ["Membentuk hemoglobin pengangkut oksigen", "Memutihkan kulit", "Membakar lemak", "Menguatkan gigi"], answer: 0, explain: "" },
  { q: "Cara konsumsi TTD yang tepat adalah...", options: ["Setelah makan, dengan air putih, jangan bersama teh/kopi/susu", "Saat perut kosong bersama kopi", "Sebelum tidur bersama susu", "Ditumbuk lalu dioleskan"], answer: 0, explain: "" },
  { q: "Jika lupa minum TTD minggu ini, tindakan yang benar adalah...", options: ["Melanjutkan jadwal minggu depan tanpa menggandakan dosis", "Minum 3 tablet sekaligus", "Membakar tablet", "Mengganti dengan suplemen sembarangan"], answer: 0, explain: "" },
  { q: "Kombinasi menu yang paling mendukung pencegahan anemia adalah...", options: ["Nasi, tempe, tumis bayam + jeruk sebagai pencuci mulut", "Mie instan + es teh manis", "Roti isi selai + soda", "Kentang goreng + kopi"], answer: 0, explain: "" },
  { q: "Sumber zat besi hewani (heme) yang paling mudah diserap tubuh adalah...", options: ["Daging merah, hati, dan ikan", "Es krim", "Keju olahan", "Sirup"], answer: 0, explain: "" },
  { q: "Remaja putri yang rutin mencegah anemia akan memperoleh manfaat...", options: ["Tubuh bugar, prestasi optimal, dan kesuburan/siap hamil sehat di masa depan", "Menjadi paling populer di sekolah", "Bebas ujian", "Tinggi badan bertambah 30 cm"], answer: 0, explain: "" },
];

// ------------------------------------------------------------
// FINAL QUIZ (Duta Challenge — 8 soal lebih kritis)
// ------------------------------------------------------------
export const QUIZ_FINAL: QuizQuestion[] = [
  { q: "Kamu melihat temanmu sering pusing saat upacara bendera. Langkah pertama terbaikmu sebagai calon Duta Fe-Zone adalah...", options: ["Menyarankan dia beristirahat dan menyarankan cek Hb ke tenaga kesehatan/petugas UKS", "Membawakan dia kopi", "Menyuruhnya berhenti sekolah", "Membiarkan saja"], answer: 0, explain: "Gejala lemas dan pusing berulang perlu dicek kadar Hb-nya. Duta Fe-Zone mengarahkan teman ke pemeriksaan yang benar, bukan tebak-tebakan." },
  { q: "Temanmu bilang: 'Minum TTD bikin mual, jadi aku berhenti.' Jawaban edukatif terbaikmu...", options: ["Efek mual ringan itu normal; triknya minum setelah makan dengan air putih, dan bisa dikonsultasikan ke petugas kesehatan", "Ya sudah, berhenti saja", "Mual itu karena tabletnya palsu", "Ganti saja dengan minum jus"], answer: 0, explain: "Efek samping ringan memang mungkin terjadi. Solusinya: minum setelah makan, dan konsultasikan bila berat — bukan langsung berhenti." },
  { q: "Mengapa program TTD sekolah diberikan 1x SEMINGGU, bukan setiap hari?", options: ["Untuk pencegahan pada remaja dengan Hb normal, 1x/minggu cukup efektif; dosis harian adalah terapi bagi yang sudah anemia", "Karena tabletnya mahal", "Agar siswa tidak bosan", "Tidak ada alasan khusus"], answer: 0, explain: "WIFAS 1 tablet/minggu adalah dosis pencegahan. Remaja yang terdiagnosis anemia mendapat terapi 1 tablet/hari selama 90 hari." },
  { q: "Menu sarapan terbaik untuk menyerap zat besi dari tumis bayam adalah...", options: ["Bayam + telur + segelas jus jeruk", "Bayam + teh hangat", "Bayam + susu besar", "Bayam + kopi hitam"], answer: 0, explain: "Vitamin C dari jeruk meningkatkan serapan zat besi nabati hingga beberapa kali lipat. Teh, kopi, dan susu justru menghambat." },
  { q: "Anemia yang tidak ditangani pada ibu hamil dapat berakibat...", options: ["Bayi lahir prematur/berat lahir rendah dan risiko stunting", "Bayi lahir kembar", "Ibu jadi kuat", "Tidak berpengaruh"], answer: 0, explain: "Inilah alasan pencegahan anemia dimulai sejak remaja — menyiapkan generasi yang lebih sehat." },
  { q: "Sebagai Peer Educator, strategi paling efektif mengajak teman rutin minum TTD adalah...", options: ["Membentuk kelompok kecil pengingat mingguan dan memberi contoh nyata (role model)", "Memaksa mereka", "Memberi hadiah uang", "Melaporkan yang tidak minum"], answer: 0, explain: "Edukasi sebaya efektif lewat keteladanan, dukungan kelompok, dan pengingat rutin — bukan paksaan." },
  { q: "Mitos yang paling sering membuat remaja putri menolak TTD adalah...", options: ["'TTD bikin gemuk'", "TTD itu gratis", "TTD ada di UKS", "TTD diberikan guru"], answer: 0, explain: "Banyak remaja takut 'bikin gemuk'. Faktanya TTD tidak menambah berat badan — itu mitos yang harus diluruskan!" },
  { q: "Kebijakan yang paling mendukung keberlanjutan program bebas anemia di sekolahmu adalah...", options: ["Mengusulkan posyandu/skrining Hb rutin + edukasi teman sebaya berkelanjutan", "Menghentikan program setelah 1 bulan", "Hanya mengandalkan guru", "Menyembunyikan informasi"], answer: 0, explain: "Program berkelanjutan butuh sistem: skrining rutin, edukasi berjalan, dan dukungan seluruh warga sekolah." },
];

// ------------------------------------------------------------
// MITOS ATAU FAKTA (12 pernyataan)
// ------------------------------------------------------------
export interface MythItem {
  statement: string;
  isFact: boolean; // true = FAKTA
  explain: string;
}

export const MYTHS: MythItem[] = [
  { statement: "TTD hanya diperlukan jika seseorang sudah mengalami anemia.", isFact: false, explain: "MITOS! TTD juga berfungsi pencegahan bagi remaja putri yang belum anemia, supaya tidak jadi anemia." },
  { statement: "Tinja berwarna hitam saat rutin minum TTD itu hal yang normal.", isFact: true, explain: "FAKTA! Warna tinja yang lebih gelap/hitam adalah efek samping ringan yang aman dan tidak perlu khawatir." },
  { statement: "Minum TTD bersama teh atau kopi tidak masalah asalkan rasanya enak.", isFact: false, explain: "MITOS! Tanin pada teh dan kopi menghambat penyerapan zat besi. Jeda minimal 2 jam ya!" },
  { statement: "Anemia bisa menyebabkan sulit konsentrasi dan prestasi belajar menurun.", isFact: true, explain: "FAKTA! Otak kekurangan oksigen sehingga konsentrasi, daya ingat, dan prestasi menurun." },
  { statement: "Anemia hanya dialami orang yang kurus dan kurang makan.", isFact: false, explain: "MITOS! Remaja putri dengan berat badan normal pun bisa anemia karena kehilangan zat besi lewat menstruasi dan pola makan tidak seimbang." },
  { statement: "Vitamin C membantu tubuh menyerap zat besi lebih baik.", isFact: true, explain: "FAKTA! Konsumsi buah kaya vitamin C (jeruk, jambu biji, pepaya) bersama makanan sumber zat besi meningkatkan penyerapannya." },
  { statement: "Jika lupa minum TTD seminggu, cukup minum 7 tablet sekaligus untuk mengganti.", isFact: false, explain: "MITOS! BERBAHAYA! Kelebihan zat besi bisa meracuni tubuh. Jangan pernah menggandakan dosis." },
  { statement: "Remaja putri membutuhkan zat besi lebih banyak dibanding remaja laki-laki.", isFact: true, explain: "FAKTA! Karena setiap bulan kehilangan darah saat menstruasi, kebutuhan zat besi remaja putri lebih tinggi." },
  { statement: "TTD membuat tubuh bertambah gemuk.", isFact: false, explain: "MITOS! TTD tidak mengandung kalori dan tidak menambah berat badan. Justru tubuhmu jadi lebih bertenaga." },
  { statement: "Makan sayur hijau saja tanpa protein cukup untuk memenuhi kebutuhan zat besi.", isFact: false, explain: "MITOS! Zat besi nabati terserap lebih lambat. Kombinasikan dengan sumber hewani (telur, ikan, daging) dan vitamin C." },
  { statement: "Menstruasi membuat remaja putri lebih rentan kekurangan zat besi.", isFact: true, explain: "FAKTA! Setiap menstruasi tubuh kehilangan darah yang membawa zat besi keluar." },
  { statement: "TTD boleh dikonsumsi sambil berbaring tanpa makan apa pun sejak pagi.", isFact: false, explain: "MITOS! Minum TTD saat perut kosong memicu mual dan iritasi. Minumlah setelah makan." },
];

// ------------------------------------------------------------
// IRON FOOD HUNT
// ------------------------------------------------------------
export interface FoodItem {
  name: string;
  icon: string;
  isIron: boolean;
  note: string;
}

export const FOODS: FoodItem[] = [
  { name: "Daging Sapi", icon: "🥩", isIron: true, note: "Sumber zat besi heme paling mudah diserap tubuh!" },
  { name: "Ikan", icon: "🐟", isIron: true, note: "Protein + zat besi hewani yang bagus untuk darah." },
  { name: "Telur", icon: "🥚", isIron: true, note: "Mengandung zat besi, protein, dan vitamin B12." },
  { name: "Hati Ayam", icon: "🍗", isIron: true, note: "Raja zat besi! Kaya iron, folat, dan vitamin A." },
  { name: "Bayam", icon: "🥬", isIron: true, note: "Sayuran hijau legendaris sumber zat besi non-heme." },
  { name: "Kacang Merah", icon: "🫘", isIron: true, note: "Kacang-kacangan = zat besi + protein nabati." },
  { name: "Tempe", icon: "🌱", isIron: true, note: "Makanan khas Indonesia kaya zat besi!" },
  { name: "Brokoli", icon: "🥦", isIron: true, note: "Sayur hijau kaya zat besi + vitamin C." },
  { name: "Jeruk", icon: "🍊", isIron: false, note: "Jeruk kaya VITAMIN C — pembantu serapan zat besi, bukan sumbernya." },
  { name: "Nasi Putih", icon: "🍚", isIron: false, note: "Sumber energi karbohidrat, zat besinya minim." },
  { name: "Susu", icon: "🥛", isIron: false, note: "Kalsium tinggi, tapi jangan diminum bersamaan dengan TTD!" },
  { name: "Soda", icon: "🥤", isIron: false, note: "Tidak ada zat besi; gula tinggi justru merugikan kesehatan." },
];

// ------------------------------------------------------------
// MENU BUILDER (Mission 5)
// ------------------------------------------------------------
export interface MenuOption {
  name: string;
  icon: string;
  iron: "high" | "medium" | "none";
  vitC?: boolean;
  blocker?: boolean; // penghambat serapan (teh/kopi/susu)
}

export interface MenuSlot {
  slot: string;
  icon: string;
  hint: string;
  options: MenuOption[];
}

export const MENU_SLOTS: MenuSlot[] = [
  {
    slot: "Sarapan", icon: "🌅", hint: "Awali hari dengan energi + zat besi!",
    options: [
      { name: "Nasi + telur dadar + tumis bayam", icon: "🍳", iron: "high" },
      { name: "Roti isi selai + teh manis", icon: "🍞", iron: "none", blocker: true },
      { name: "Bubur ayam + telur", icon: "🥣", iron: "medium" },
      { name: "Mie instan + es teh", icon: "🍜", iron: "none", blocker: true },
    ],
  },
  {
    slot: "Snack Pagi", icon: "🍎", hint: "Snack cerdas pembantu serapan zat besi.",
    options: [
      { name: "Segelas jus jambu biji", icon: "🥤", iron: "none", vitC: true },
      { name: "Gorengan + kopi", icon: "🍩", iron: "none", blocker: true },
      { name: "Permen jelly", icon: "🍬", iron: "none" },
      { name: "Kacang rebus", icon: "🥜", iron: "high" },
    ],
  },
  {
    slot: "Makan Siang", icon: "☀️", hint: "Saatnya menu utama kaya zat besi!",
    options: [
      { name: "Nasi + ikan bakar + capcay sayur hijau", icon: "🐟", iron: "high" },
      { name: "Nasi + sosis goreng + keripik", icon: "🌭", iron: "medium" },
      { name: "Nasi + tempe + sayur asem", icon: "🌱", iron: "high" },
      { name: "Bakso kuah + es soda", icon: "🍲", iron: "medium" },
    ],
  },
  {
    slot: "Snack Sore", icon: "🌆", hint: "Pilih yang menyegarkan & sehat.",
    options: [
      { name: "Potongan pepaya", icon: "🍈", iron: "none", vitC: true },
      { name: "Keripik kentang", icon: "🍟", iron: "none" },
      { name: "Es krim cokelat", icon: "🍦", iron: "none" },
      { name: "Susu + biskuit", icon: "🥛", iron: "none", blocker: true },
    ],
  },
  {
    slot: "Makan Malam", icon: "🌙", hint: "Tutup hari dengan makan bergizi.",
    options: [
      { name: "Nasi + tumis hati ayam + brokoli", icon: "🍗", iron: "high" },
      { name: "Nasi + telur balado + tumis kangkung", icon: "🍳", iron: "high" },
      { name: "Pizza + cola", icon: "🍕", iron: "none" },
      { name: "Tahu + tempe bacem + sayur", icon: "🌱", iron: "high" },
    ],
  },
];
