import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getLevel } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level"); // SMP | SMA | null (semua)
  const school = searchParams.get("school");
  const q = searchParams.get("q");
  const lvl = searchParams.get("lvl"); // level XP 1-5
  const duta = searchParams.get("duta"); // candidate | winner | none

  const where: Record<string, unknown> = {};
  if (level === "SMP" || level === "SMA") where.educationLevel = level;
  if (school) where.school = school;
  if (q) where.name = { contains: q };
  if (duta === "candidate") where.isDutaCandidate = true;
  if (duta === "winner") where.isDuta = true;

  const participants = await db.participant.findMany({
    where,
    include: {
      badges: true,
      missionProgress: true,
      user: { select: { username: true, createdAt: true } },
      videoSubmissions: { where: { status: "PENDING" } },
    },
    orderBy: [{ xp: "desc" }, { name: "asc" }],
  });

  let rows = participants.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    school: p.school,
    schoolCity: p.schoolCity,
    schoolDistrict: p.schoolDistrict,
    schoolType: p.schoolType,
    educationLevel: p.educationLevel,
    username: p.user.username,
    joinedAt: p.user.createdAt,
    xp: p.xp,
    level: getLevel(p.xp).level,
    levelName: getLevel(p.xp).name,
    levelIcon: getLevel(p.xp).icon,
    badges: p.badges.map((b) => b.badgeKey),
    missionsCompleted: p.missionProgress.filter((m) => m.status === "COMPLETED").length,
    streakWeeks: p.streakWeeks,
    preTestScore: p.preTestScore,
    postTestScore: p.postTestScore,
    isDutaCandidate: p.isDutaCandidate,
    isDuta: p.isDuta,
    hasPendingVideo: p.videoSubmissions.length > 0,
  }));

  if (lvl) {
    const n = parseInt(lvl, 10);
    rows = rows.filter((r) => r.level === n);
  }

  const schools = Array.from(new Set((await db.participant.findMany({ select: { school: true } })).map((s) => s.school))).sort();

  return NextResponse.json({ participants: rows, schools });
}

// Hapus peserta beserta SELURUH datanya (misi, XP, badge, check-in,
// video, konten komunitas, sesi login, dst). Dilindungi dialog
// konfirmasi di sisi UI; di sini divalidasi ulang:
// - hanya akun PARTICIPANT yang boleh dihapus (admin tidak bisa)
// - ContentLike dihapus manual (tidak ter-relasi ke User di schema)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const participantId = String(body?.participantId ?? "");
    if (!participantId) {
      return NextResponse.json({ error: "participantId wajib diisi" }, { status: 400 });
    }

    const participant = await db.participant.findUnique({
      where: { id: participantId },
      include: { user: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "Peserta tidak ditemukan" }, { status: 404 });
    }
    if (participant.user.role !== "PARTICIPANT") {
      return NextResponse.json({ error: "Akun admin tidak dapat dihapus lewat daftar peserta" }, { status: 403 });
    }

    await db.$transaction([
      db.contentLike.deleteMany({ where: { userId: participant.userId } }),
      db.user.delete({ where: { id: participant.userId } }),
    ]);

    return NextResponse.json({ ok: true, name: participant.name, username: participant.user.username });
  } catch (e) {
    console.error("DELETE_PARTICIPANT_ERR", e);
    return NextResponse.json({ error: "Gagal menghapus peserta" }, { status: 500 });
  }
}
