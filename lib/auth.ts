import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "fez_session";
const SESSION_DAYS = 30;

// ------------------------------------------------------------
// Password hashing (scrypt + salt, aman & tanpa dependensi)
// ------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ------------------------------------------------------------
// Session management
// ------------------------------------------------------------
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { token: hashToken(token), userId, expiresAt },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Production (Vercel, HTTPS) wajib secure; development lokal tetap false
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  participantId?: string;
  name?: string;
  age?: number;
  school?: string;
  educationLevel?: string;
  avatar?: string;
  profilePhotoUrl?: string | null;
  xp?: number;
  streakWeeks?: number;
  preTestScore?: number | null;
  postTestScore?: number | null;
  isDutaCandidate?: boolean;
  isDuta?: boolean;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: { include: { participant: true } } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    participantId: u.participant?.id,
    name: u.participant?.name,
    age: u.participant?.age,
    school: u.participant?.school,
    educationLevel: u.participant?.educationLevel,
    avatar: u.participant?.avatar,
    profilePhotoUrl: u.participant?.profilePhotoUrl ?? null,
    xp: u.participant?.xp,
    streakWeeks: u.participant?.streakWeeks,
    preTestScore: u.participant?.preTestScore ?? null,
    postTestScore: u.participant?.postTestScore ?? null,
    isDutaCandidate: u.participant?.isDutaCandidate,
    isDuta: u.participant?.isDuta,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token: hashToken(token) } });
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function requireParticipant(): Promise<{ participantId: string; user: AuthUser } | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "PARTICIPANT" || !user.participantId) return null;
  return { participantId: user.participantId, user };
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
