import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { getMissionProgress, startMission } from "@/lib/gamification";
import { saveUpload } from "@/lib/storage";
import { randomBytes } from "crypto";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB (batas body request serverless Vercel)

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pid = auth.participantId;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const missionKey = (formData.get("missionKey") as string) || "M8";
  const durationSec = parseInt((formData.get("durationSec") as string) || "0", 10);

  if (!file) return NextResponse.json({ error: "File video wajib diunggah" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Ukuran video maksimal 4MB. Untuk video lebih besar, gunakan link YouTube/Instagram/TikTok." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fileName = `${pid}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUpload({ folder: "", fileName, bytes, contentType: file.type || "video/mp4" });

  const video = await db.videoSubmission.create({
    data: {
      participantId: pid,
      missionKey,
      fileName: file.name,
      fileUrl: url,
      durationSec: isNaN(durationSec) ? null : durationSec,
      status: "PENDING",
    },
  });

  await startMission(pid, "M8");
  const mp = await getMissionProgress(pid, "M8");
  if (mp.status !== "COMPLETED") {
    await db.missionProgress.update({ where: { id: mp.id }, data: { status: "STARTED", progress: 60 } });
  }
  await db.activityLog.create({ data: { participantId: pid, type: "VIDEO_UPLOAD", meta: missionKey } });

  // Stage 4 Duta Challenge (video edukasi)
  if (missionKey === "M8") {
    const ds = await db.dutaStage.upsert({
      where: { participantId: pid },
      create: { participantId: pid, stage4Video: true },
      update: { stage4Video: true },
    });
  }

  return NextResponse.json({ ok: true, video: { id: video.id, fileUrl: video.fileUrl, status: video.status } });
}

export async function GET() {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const videos = await db.videoSubmission.findMany({
    where: { participantId: auth.participantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ videos });
}
