import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

// ------------------------------------------------------------
// POST: daftarkan/memperbarui langganan push perangkat ini.
// Browser mengirim object Subscription dari pushManager.
// DELETE: matikan langganan perangkat ini (izin dimatikan user).
// ------------------------------------------------------------

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const authKey = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Data langganan tidak lengkap" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 250) ?? null;

  // Upsert berdasarkan endpoint (unik per perangkat) — jika HP yang
  // sama subscribe ulang, data diperbarui, tidak dobel.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      participantId: auth.participantId,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent,
    },
    update: {
      participantId: auth.participantId,
      p256dh,
      auth: authKey,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireParticipant();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint wajib diisi" }, { status: 400 });
  }

  // deleteMany agar tidak error bila endpoint milik peserta lain
  await db.pushSubscription.deleteMany({
    where: { endpoint, participantId: auth.participantId },
  });

  return NextResponse.json({ ok: true });
}
