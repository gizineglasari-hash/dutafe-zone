// ------------------------------------------------------------
// Pembatas laju sederhana (in-memory) untuk endpoint sensitif:
// - /api/auth/forgot-password  -> maks 5 permintaan / 15 menit / IP
// - /api/auth/admin-recovery   -> maks 5 percobaan / 15 menit / IP
//
// Cukup efektif untuk skala program sekolah. Di Vercel setiap instance
// punya memori sendiri, jadi ini pengaman lapis pertama (bukan satu-
// satunya) — token reset tetap acak 64 hex dan hanya berlaku 1 jam.
// ------------------------------------------------------------

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bersihkan entri kadaluarsa secara berkala agar memori tidak menumpuk
function sweep() {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  if (buckets.size > 5000) sweep();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
