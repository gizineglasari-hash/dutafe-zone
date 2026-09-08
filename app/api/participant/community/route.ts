import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { getMissionProgress, isMissionUnlocked, startMission } from "@/lib/gamification";
import { parseVideoUrl, MIN_DURATION, MAX_DURATION, MAX_UPLOAD_SIZE } from "@/lib/video";
import { saveUpload } from "@/lib/storage";
import { randomBytes } from "crypto";

const VIDEO_EXT = ["mp4", "mov", "webm", "m4v"];

// ------------------------------------------------------------------
// POST — kirim konten baru (bisa berkali-kali)
//  - multipart: file video upload + title + description + durationSec + contentType
//  - JSON: { contentType, title, description, platform, url }
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const contentTypeHeader = req.headers.get("content-type") || "";

  let title = "";
  let description = "";
  let contentType = "peer_educator";
  let platform: string | null = null;
  let externalUrl: string | null = null;
  let videoUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let durationSec: number | null = null;

  if (contentTypeHeader.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    title = String(formData.get("title") || "").trim();
    description = String(formData.get("description") || "").trim();
    contentType = String(formData.get("contentType") || "peer_educator");
    durationSec = parseInt(String(formData.get("durationSec") || "0"), 10);

    if (!file) return NextResponse.json({ error: "File video wajib diunggah" }, { status: 400 });
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "Ukuran video maksimal 4MB. Untuk video lebih besar, gunakan link YouTube/Instagram/TikTok." }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!VIDEO_EXT.includes(ext)) {
      return NextResponse.json({ error: "Format video harus MP4, MOV, atau WebM" }, { status: 400 });
    }
    if (isNaN(durationSec!) || durationSec! < MIN_DURATION || durationSec! > MAX_DURATION) {
      return NextResponse.json(
        { error: `⚠️ Video Peer Educator harus berdurasi ${MIN_DURATION}–${MAX_DURATION} detik.` },
        { status: 400 }
      );
    }
    if (contentType !== "education" && contentType !== "peer_educator") {
      return NextResponse.json({ error: "Tipe konten tidak valid" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "Judul konten wajib diisi" }, { status: 400 });

    const fileName = `${pid}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { url } = await saveUpload({ folder: "videos", fileName, bytes, contentType: file.type || "video/mp4" });

    platform = "uploaded";
    videoUrl = url;
  } else {
    const body = await req.json().catch(() => ({}));
    title = String(body.title || "").trim();
    description = String(body.description || "").trim();
    contentType = String(body.contentType || "peer_educator");
    const url = String(body.url || "").trim();
    const declared = String(body.platform || "").trim();

    if (contentType !== "education" && contentType !== "peer_educator") {
      return NextResponse.json({ error: "Tipe konten tidak valid" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "Judul konten wajib diisi" }, { status: 400 });
    if (contentType === "peer_educator" && !description) {
      return NextResponse.json({ error: "Caption/deskripsi wajib diisi untuk video Peer Educator" }, { status: 400 });
    }

    if (contentType === "peer_educator" || url) {
      const parsed = parseVideoUrl(url, declared);
      if (!parsed.ok || !parsed.platform) {
        return NextResponse.json({ error: parsed.error || "⚠️ Masukkan link YouTube, Instagram, atau TikTok yang valid." }, { status: 400 });
      }
      platform = parsed.platform;
      externalUrl = url;
      videoUrl = parsed.watchUrl;
      thumbnailUrl = parsed.thumbnailUrl;
    } else {
      platform = "none";
    }
  }

  if (title.length > 120) return NextResponse.json({ error: "Judul maksimal 120 karakter" }, { status: 400 });
  if (description.length > 1200) return NextResponse.json({ error: "Deskripsi maksimal 1200 karakter" }, { status: 400 });

  // Validasi unlock server-side: Peer Educator (M8) hanya setelah Mission 7 LULUS
  if (contentType === "peer_educator") {
    const unlocked = await isMissionUnlocked(pid, "M8");
    if (!unlocked) {
      return NextResponse.json({ error: "Mission 8 masih terkunci. Lulus Mission 7 (share WA ke 5 teman) dulu!" }, { status: 403 });
    }
  }

  const content = await db.communityContent.create({
    data: {
      participantId: pid,
      contentType,
      title,
      description: description || null,
      platform: platform || "none",
      externalUrl,
      videoUrl,
      thumbnailUrl,
      durationSec: isNaN(durationSec!) ? null : durationSec,
      status: "PENDING",
    },
  });

  // Jika peer_educator → tandai progress M8 berjalan (misi selesai saat video pertama disetujui admin)
  if (contentType === "peer_educator") {
    await startMission(pid, "M8");
    const mp = await getMissionProgress(pid, "M8");
    if (mp.status !== "COMPLETED") {
      await db.missionProgress.update({ where: { id: mp.id }, data: { status: "STARTED", progress: Math.max(mp.progress, 50) } });
    }
    // Stage 4 Duta Challenge tetap tercatat via VideoSubmission lama / approve baru
  }

  await db.activityLog.create({
    data: { participantId: pid, type: "VIDEO_UPLOAD", meta: `${contentType}:${content.id}` },
  });

  return NextResponse.json({
    ok: true,
    content: { id: content.id, title: content.title, platform: content.platform, status: content.status },
    message: "Konten terkirim! Menunggu moderasi admin sebelum tampil publik.",
  });
}

// ------------------------------------------------------------------
// GET — riwayat "Video Saya" (semua submission milik peserta)
// ------------------------------------------------------------------
export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contents = await db.communityContent.findMany({
    where: { participantId: auth.participantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    contents: contents.map((c) => ({
      id: c.id,
      contentType: c.contentType,
      title: c.title,
      platform: c.platform,
      status: c.status,
      likesCount: c.likesCount,
      xpAwarded: c.xpGiven ? c.xpAwarded : 0,
      rejectReason: c.status === "REJECTED" ? c.rejectReason : null,
      externalUrl: c.externalUrl,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      createdAt: c.createdAt,
    })),
  });
}
