import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin: { id: admin.id, username: admin.username, role: admin.role } });
}
