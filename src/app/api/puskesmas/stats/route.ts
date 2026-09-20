import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePetugas } from "@/lib/auth";
import { CORE_MISSION_KEY_RE } from "@/lib/constants";

// ------------------------------------------------------------
// PETUGAS — STATISTIK DASBOR (pembaruan 19 Tahap 3)
// Data remaja HANYA dari wilayah kerja Puskesmas petugas
// (kecamatan sekolah remaja = kecamatan wilayah kerja).
// 8 kartu statistik + 4 grafik + filter waktu (periode).
// Semua agregasi dihitung di server, zona waktu Asia/Jakarta.
// ------------------------------------------------------------

type Row = {
  userId: string;
  xp: number;
  hbValue: number | null;
  joinedAt: Date;
  schoolDistrict: string | null;
  educationLevel: string;
  ttdCount: number;
  coreCompleted: number;
  activeAt: Date | null;
};

function periodStart(periode: string | null): Date | null {
  if (periode === "7" || periode === "30" || periode === "90") {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(periode, 10));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null; // "all"
}

export async function GET(req: NextRequest) {
  const petugas = await requirePetugas();
  if (!petugas) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode") || "30";
    const batas = periodStart(periode);

    // ---- Wilayah kerja petugas (kecamatan dari kelurahan terpetakan) ----
    const kecamatanSet = new Set<string>();
    for (const w of petugas.staff.puskesmas.wilayah) {
      const kec = w.kelurahan.kecamatan?.nama;
      if (kec) kecamatanSet.add(kec);
    }
    if (kecamatanSet.size === 0) {
      // Wilayah belum dipetakan — kembalikan nol agar UI tetap rapi
      return NextResponse.json({
        wilayah: { kecamatan: [], kelurahan: petugas.staff.puskesmas.wilayah.length },
        periode,
        kartu: {
          totalRemaja: 0, remajaBaru: 0, remajaAktif: 0, sudahCekHb: 0,
          anemia: 0, minumTtd: 0, lulusMisiInti: 0, rataXp: 0,
        },
        grafik: {
          statusAnemia: [
            { nama: "Anemia", nilai: 0 }, { nama: "Normal", nilai: 0 }, { nama: "Belum Cek", nilai: 0 },
          ],
          klasifikasiHb: [
            { nama: "Berat (<9)", nilai: 0 }, { nama: "Sedang (9–10,9)", nilai: 0 },
            { nama: "Ringan (11–11,9)", nilai: 0 }, { nama: "Normal (≥12)", nilai: 0 },
          ],
          perKecamatan: [],
          trenPendaftaran: [],
        },
      });
    }

    // ---- Ambil remaja dalam wilayah (kecamatan sekolah) ----
    const participants = await db.participant.findMany({
      where: { schoolDistrict: { in: Array.from(kecamatanSet) } },
      select: {
        userId: true, xp: true, hbValue: true, schoolDistrict: true,
        educationLevel: true, user: { select: { createdAt: true } },
        _count: { select: { ttdCheckIns: true } },
        missionProgress: { select: { missionKey: true, status: true } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    });

    const rows: Row[] = participants.map((p) => ({
      userId: p.userId,
      xp: p.xp,
      hbValue: p.hbValue,
      joinedAt: p.user.createdAt,
      schoolDistrict: p.schoolDistrict,
      educationLevel: p.educationLevel,
      ttdCount: p._count.ttdCheckIns,
      coreCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED" && CORE_MISSION_KEY_RE.test(m.missionKey)).length,
      activeAt: p.activityLogs[0]?.createdAt ?? null,
    }));

    const dalamPeriode = (d: Date | null) => (batas ? d !== null && d >= batas : d !== null);

    // ---- 8 kartu statistik ----
    const totalRemaja = rows.length;
    const remajaBaru = rows.filter((r) => dalamPeriode(r.joinedAt)).length;
    const remajaAktif = rows.filter((r) => dalamPeriode(r.activeAt)).length;
    const sudahCekHb = rows.filter((r) => r.hbValue !== null).length;
    const anemia = rows.filter((r) => r.hbValue !== null && r.hbValue < 12).length;
    const minumTtd = rows.filter((r) => r.ttdCount > 0).length;
    const lulusMisiInti = rows.filter((r) => r.coreCompleted >= 9).length;
    const rataXp = totalRemaja ? Math.round(rows.reduce((s, r) => s + r.xp, 0) / totalRemaja) : 0;

    // ---- Grafik 1: status anemia ----
    const belumCek = totalRemaja - sudahCekHb;
    const normal = sudahCekHb - anemia;

    // ---- Grafik 2: klasifikasi Hb (Kemenkes) ----
    const klasifikasi = { berat: 0, sedang: 0, ringan: 0, normal: 0 };
    for (const r of rows) {
      if (r.hbValue === null) continue;
      if (r.hbValue < 9) klasifikasi.berat++;
      else if (r.hbValue < 11) klasifikasi.sedang++;
      else if (r.hbValue < 12) klasifikasi.ringan++;
      else klasifikasi.normal++;
    }

    // ---- Grafik 3: remaja per kecamatan ----
    const perKec = new Map<string, number>();
    for (const r of rows) {
      const kec = r.schoolDistrict || "Lainnya";
      perKec.set(kec, (perKec.get(kec) ?? 0) + 1);
    }
    const perKecamatan = Array.from(perKec.entries())
      .map(([nama, nilai]) => ({ nama, nilai }))
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 8);

    // ---- Grafik 4: tren pendaftaran 6 bulan terakhir (WIB) ----
    const now = new Date();
    const bulanList: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      bulanList.push({ key, label });
    }
    const bulanCount = new Map<string, number>(bulanList.map((b) => [b.key, 0]));
    for (const r of rows) {
      const key = `${r.joinedAt.getFullYear()}-${String(r.joinedAt.getMonth() + 1).padStart(2, "0")}`;
      if (bulanCount.has(key)) bulanCount.set(key, (bulanCount.get(key) ?? 0) + 1);
    }
    const trenPendaftaran = bulanList.map((b) => ({ bulan: b.label, jumlah: bulanCount.get(b.key) ?? 0 }));

    return NextResponse.json({
      wilayah: { kecamatan: Array.from(kecamatanSet).sort(), kelurahan: petugas.staff.puskesmas.wilayah.length },
      periode,
      kartu: { totalRemaja, remajaBaru, remajaAktif, sudahCekHb, anemia, minumTtd, lulusMisiInti, rataXp },
      grafik: {
        statusAnemia: [
          { nama: "Anemia", nilai: anemia },
          { nama: "Normal", nilai: normal },
          { nama: "Belum Cek", nilai: belumCek },
        ],
        klasifikasiHb: [
          { nama: "Berat (<9)", nilai: klasifikasi.berat },
          { nama: "Sedang (9–10,9)", nilai: klasifikasi.sedang },
          { nama: "Ringan (11–11,9)", nilai: klasifikasi.ringan },
          { nama: "Normal (≥12)", nilai: klasifikasi.normal },
        ],
        perKecamatan,
        trenPendaftaran,
      },
    });
  } catch (e) {
    console.error("PUSKESMAS_STATS_ERR", e);
    return NextResponse.json({ error: "Gagal memuat statistik" }, { status: 500 });
  }
}
