import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push";

// Berikan kunci publik VAPID ke browser (kunci publik boleh
// dikirim ke siapa saja — kunci privat tidak pernah keluar server).
export async function GET() {
  const publicKey = vapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "PUSH_NOT_CONFIGURED", message: "Pengingat push belum diaktifkan oleh admin." },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
