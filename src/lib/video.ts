// ============================================================
// FE-ZONE — Helper validasi & parsing URL video Peer Educator
// Hanya platform resmi yang diizinkan: YouTube, Instagram, TikTok
// ============================================================

export type VideoPlatform = "youtube" | "instagram" | "tiktok" | "uploaded" | "none";

export interface ParsedVideo {
  ok: boolean;
  platform: VideoPlatform | null;
  videoId: string | null;   // YouTube video ID / TikTok numeric ID / IG shortcode
  embedUrl: string | null;  // URL embed resmi (jika tersedia)
  thumbnailUrl: string | null;
  watchUrl: string | null;  // URL canonical untuk tombol "Tonton di ..."
  error?: string;
}

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{6,20})/i,
  /(?:youtu\.be\/)([\w-]{6,20})/i,
  /(?:youtube\.com\/shorts\/)([\w-]{6,20})/i,
  /(?:youtube\.com\/embed\/)([\w-]{6,20})/i,
  /(?:youtube\.com\/live\/)([\w-]{6,20})/i,
];

const IG_PATTERN = /instagram\.com\/(?:p|reel|reels|tv)\/([\w-]{5,30})/i;
const TT_PATTERN = /tiktok\.com\/(?:@[\w.\-]+)\/video\/(\d{10,25})/i;
const TT_SHORT = /(?:vm|vt)\.tiktok\.com\/([\w-]{5,20})/i;

export function parseVideoUrl(rawUrl: string, declaredPlatform?: string): ParsedVideo {
  const url = (rawUrl || "").trim();
  if (!url) {
    return { ok: false, platform: null, videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "URL video wajib diisi" };
  }
  if (url.length > 2000 || /\s/.test(url)) {
    return { ok: false, platform: null, videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "URL tidak valid" };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, platform: null, videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "URL harus dimulai dengan https://" };
  }

  // Deteksi platform dari URL (utama), fallback ke pilihan peserta
  for (const p of YT_PATTERNS) {
    const m = url.match(p);
    if (m) return ytResult(m[1], url);
  }
  const ig = url.match(IG_PATTERN);
  if (ig) return igResult(ig[1], url);
  const tt = url.match(TT_PATTERN);
  if (tt) return ttResult(tt[1], url);
  const tts = url.match(TT_SHORT);
  if (tts) {
    // Short link TikTok — tidak bisa di-embed langsung, simpan watch URL saja
    return { ok: true, platform: "tiktok", videoId: tts[1], embedUrl: null, thumbnailUrl: null, watchUrl: url };
  }

  // URL dikenali platform tapi format salah, atau platform lain → tolak
  const lower = url.toLowerCase();
  if (lower.includes("youtube.") || lower.includes("youtu.be")) {
    return { ok: false, platform: "youtube", videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "Link YouTube tidak valid. Gunakan format youtube.com/watch?v=... atau youtu.be/..." };
  }
  if (lower.includes("instagram.com")) {
    return { ok: false, platform: "instagram", videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "Link Instagram tidak valid. Gunakan format instagram.com/reel/... atau instagram.com/p/..." };
  }
  if (lower.includes("tiktok.com")) {
    return { ok: false, platform: "tiktok", videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "Link TikTok tidak valid. Gunakan format tiktok.com/@nama/video/..." };
  }
  return { ok: false, platform: null, videoId: null, embedUrl: null, thumbnailUrl: null, watchUrl: null, error: "Masukkan link YouTube, Instagram, atau TikTok yang valid" };
}

function ytResult(id: string, url: string): ParsedVideo {
  return {
    ok: true,
    platform: "youtube",
    videoId: id,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

function igResult(code: string, url: string): ParsedVideo {
  return {
    ok: true,
    platform: "instagram",
    videoId: code,
    embedUrl: `https://www.instagram.com/p/${code}/embed`,
    thumbnailUrl: null,
    watchUrl: `https://www.instagram.com/p/${code}/`,
  };
}

function ttResult(id: string, url: string): ParsedVideo {
  return {
    ok: true,
    platform: "tiktok",
    videoId: id,
    embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
    thumbnailUrl: null,
    watchUrl: url,
  };
}

export const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  uploaded: "Upload Langsung",
  none: "Teks",
};

export const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶️",
  instagram: "📸",
  tiktok: "🎵",
  uploaded: "🎥",
  none: "📝",
};

// Durasi upload yang diizinkan (detik)
export const MIN_DURATION = 30;
export const MAX_DURATION = 60;
export const MAX_UPLOAD_SIZE = 4 * 1024 * 1024; // 4MB (batas body request serverless Vercel)
