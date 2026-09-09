import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const videos = await db.videoSubmission.findMany({
    include: { participant: { select: { name: true, school: true, educationLevel: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      id: v.id,
      participantId: v.participantId,
      participant: v.participant,
      missionKey: v.missionKey,
      fileUrl: v.fileUrl,
      fileName: v.fileName,
      status: v.status,
      grade: v.grade,
      adminNote: v.adminNote,
      xpAwarded: v.xpAwarded,
      createdAt: v.createdAt,
    })),
  });
}
