"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFez } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/fezone/ui-bits";
import { PLATFORM_LABEL, PLATFORM_ICON } from "@/lib/video";
import { Heart, Loader2, Search, X, Crown, Film, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ============================================================
// Tipe
// ============================================================
export interface FeedItem {
  id: string;
  contentType: string; // education | peer_educator
  title: string;
  description: string | null;
  platform: string;
  externalUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  createdAt: string;
  likedByMe: boolean;
  participant: {
    id: string;
    name: string;
    school: string;
    educationLevel: string;
    avatar: string;
    profilePhotoUrl: string | null;
    isDuta: boolean;
  };
}

export interface PublicProfile {
  id: string;
  name: string;
  school: string;
  educationLevel: string;
  avatar: string;
  profilePhotoUrl: string | null;
  isDuta: boolean;
  isDutaCandidate: boolean;
  xp: number;
  level: { level: number; name: string; icon: string };
  rank: number;
  badges: string[];
  missionsCompleted: number;
  videoCount: number;
  totalLikes: number;
}

// ============================================================
// Embed video resmi + fallback "Tonton di ..."
// ============================================================
export function VideoEmbed({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (item.platform === "youtube" && item.videoUrl) {
    const m = item.videoUrl.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([\w-]{6,20})/);
    const id = m?.[1];
    if (id && !failed) {
      return (
        <div className={`relative w-full overflow-hidden rounded-2xl border-2 border-fez-ink/15 bg-black ${compact ? "aspect-video" : "aspect-video"}`}>
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    }
    if (item.thumbnailUrl && !failed) {
      return (
        <a href={item.videoUrl ?? item.externalUrl ?? "#"} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border-2 border-fez-ink/15">
          <img src={item.thumbnailUrl} alt={item.title} className="aspect-video w-full object-cover" />
        </a>
      );
    }
    return <WatchFallback url={item.videoUrl ?? item.externalUrl} label="Tonton di YouTube" color="bg-red-500 text-white" />;
  }

  if (item.platform === "tiktok") {
    const numeric = item.videoUrl?.match(/\/video\/(\d{10,25})/)?.[1];
    if (numeric && !failed) {
      return (
        <div className="w-full overflow-hidden rounded-2xl border-2 border-fez-ink/15">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${numeric}`}
            title={item.title}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            onError={() => setFailed(true)}
            className={`mx-auto block w-full ${compact ? "h-[420px]" : "h-[560px]"} max-w-[340px] bg-black`}
          />
        </div>
      );
    }
    return <WatchFallback url={item.videoUrl ?? item.externalUrl} label="Tonton di TikTok" color="bg-fez-ink text-white" />;
  }

  if (item.platform === "instagram") {
    const code = item.externalUrl?.match(/instagram\.com\/(?:p|reel|reels|tv)\/([\w-]{5,30})/)?.[1];
    if (code && !failed) {
      return (
        <div className="w-full overflow-hidden rounded-2xl border-2 border-fez-ink/15 bg-white">
          <iframe
            src={`https://www.instagram.com/p/${code}/embed`}
            title={item.title}
            allowFullScreen
            onError={() => setFailed(true)}
            className="h-[480px] w-full"
          />
        </div>
      );
    }
    return <WatchFallback url={item.videoUrl ?? item.externalUrl} label="Tonton di Instagram" color="bg-gradient-to-r from-purple-500 to-pink-500 text-white" />;
  }

  if (item.platform === "uploaded" && item.videoUrl) {
    return (
      <video
        src={item.videoUrl}
        controls
        playsInline
        preload="metadata"
        className="max-h-[420px] w-full rounded-2xl border-2 border-fez-ink/15 bg-black"
      />
    );
  }

  return null;
}

function WatchFallback({ url, label, color }: { url: string | null; label: string; color: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-fez-ink text-sm font-extrabold sticker-sm transition hover:translate-x-0.5 hover:translate-y-0.5 ${color}`}
    >
      ▶ {label}
    </a>
  );
}

// ============================================================
// Tombol Like — 1 akun = 1 like, toggle; belum login → ajakan login
// ============================================================
export function LikeButton({ item, onChange }: { item: FeedItem; onChange?: (likes: number, liked: boolean) => void }) {
  const { user, setAuthMode, setView } = useFez();
  const [liked, setLiked] = useState(item.likedByMe);
  const [count, setCount] = useState(item.likesCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiked(item.likedByMe);
    setCount(item.likesCount);
  }, [item.likedByMe, item.likesCount]);

  async function toggle() {
    if (!user) {
      toast({
        title: "Login untuk memberikan Like ❤️",
        description: "Buat akun Pejuang Fe-Zone atau masuk dulu untuk mendukung karya teman-temanmu!",
      });
      setAuthMode("login");
      setView("auth");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/community/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: item.id }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Ups", description: d.error, variant: "destructive" });
      return;
    }
    setLiked(d.liked);
    setCount(d.likesCount);
    onChange?.(d.likesCount, d.liked);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={liked ? "Unlike" : "Like"}
      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold transition active:scale-95 ${
        liked ? "border-rose-500 bg-rose-500 text-white" : "border-fez-ink/20 bg-white text-fez-ink/70 hover:border-rose-300 hover:text-rose-500"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />}
      {count} Like
    </button>
  );
}

// ============================================================
// Kartu konten feed (gaya media sosial)
// ============================================================
export function ContentCard({ item, onOpenProfile }: { item: FeedItem; onOpenProfile: (id: string) => void }) {
  const isVideo = item.contentType === "peer_educator";
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border-2 border-fez-ink bg-white shadow-[4px_4px_0_0_rgba(74,29,51,0.12)]"
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        <button onClick={() => onOpenProfile(item.participant.id)} aria-label={`Profil ${item.participant.name}`} className="shrink-0">
          <UserAvatar photoUrl={item.participant.profilePhotoUrl} avatar={item.participant.avatar} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-fez-ink">
            <button onClick={() => onOpenProfile(item.participant.id)} className="truncate hover:underline">
              {item.participant.name}
            </button>
            {item.participant.isDuta && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
          </p>
          <p className="truncate text-[11px] font-semibold text-muted-foreground">
            {item.participant.school} • {item.participant.educationLevel}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${
          isVideo ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-violet-200 bg-violet-50 text-violet-700"
        }`}>
          {isVideo ? "🎥 Peer Educator" : "📚 Edukasi"}
        </span>
      </div>

      <div className="px-4">
        <h3 className="font-display text-base font-extrabold leading-snug text-fez-ink">{item.title}</h3>
      </div>

      {isVideo && (
        <div className="mt-2 px-4">
          <VideoEmbed item={item} />
        </div>
      )}

      {item.description && (
        <p className="mt-2 whitespace-pre-line px-4 text-sm leading-relaxed text-fez-ink/75">📝 {item.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-fez-ink/5 bg-cream/40 px-4 py-3">
        <LikeButton item={item} />
        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
          <span className="rounded-full bg-white px-2 py-0.5">
            {PLATFORM_ICON[item.platform] ?? "📝"} {PLATFORM_LABEL[item.platform] ?? item.platform}
          </span>
          <span>📅 {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </motion.article>
  );
}

// ============================================================
// Modal profil publik (tanpa data pribadi sensitif)
// ============================================================
export function PublicProfileModal({ participantId, onClose }: { participantId: string | null; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!participantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }
    setLoading(true);
    fetch(`/api/public/participant?id=${participantId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [participantId]);

  if (!participantId) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-fez-ink/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-fez-ink bg-white p-6 sm:rounded-3xl"
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-muted p-1.5" aria-label="Tutup">
          <X className="h-4 w-4" />
        </button>

        {loading || !profile ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-fez-rose" />
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto w-fit">
              <UserAvatar photoUrl={profile.profilePhotoUrl} avatar={profile.avatar} size={88} className="sticker-sm" />
            </div>
            <h3 className="mt-3 flex items-center justify-center gap-1.5 font-display text-xl font-extrabold text-fez-ink">
              {profile.name}
              {profile.isDuta && <Crown className="h-5 w-5 text-amber-500" />}
            </h3>
            <p className="text-xs font-semibold text-muted-foreground">
              {profile.school} • {profile.educationLevel}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <span className="rounded-full border-2 border-fez-ink bg-violet-100 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">
                {profile.level.icon} Level {profile.level.level} — {profile.level.name}
              </span>
              {profile.isDuta && (
                <span className="rounded-full border-2 border-fez-ink bg-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">👑 Duta Fe-Zone</span>
              )}
              {profile.isDutaCandidate && !profile.isDuta && (
                <span className="rounded-full border-2 border-fez-ink bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-fez-ink">🌟 Kandidat Duta</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat icon="⚡" value={profile.xp.toLocaleString("id-ID")} label="Total XP" />
              <MiniStat icon="🏆" value={`#${profile.rank}`} label={`Ranking ${profile.educationLevel}`} />
              <MiniStat icon="🎖" value={String(profile.badges.length)} label="Badge" />
              <MiniStat icon="✅" value={`${profile.missionsCompleted}/9`} label="Misi Selesai" />
              <MiniStat icon="🎥" value={String(profile.videoCount)} label="Video Publik" />
              <MiniStat icon="❤️" value={String(profile.totalLikes)} label="Like Diterima" />
            </div>

            <p className="mt-4 rounded-xl bg-cream/60 p-2.5 text-[10px] leading-relaxed text-fez-ink/50">
              Profil publik Pejuang Fe-Zone — hanya menampilkan capaian program, bukan data pribadi.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-fez-ink/10 bg-cream/40 p-2.5 text-center">
      <p className="text-base">{icon}</p>
      <p className="font-display text-base font-extrabold text-fez-ink">{value}</p>
      <p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================
// Feed publik 🌟 Fe-Zone Community + filter + search
// ============================================================
const TYPE_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "education", label: "📚 Edukasi" },
  { key: "peer_educator", label: "🎥 Peer Educator" },
  { key: "youtube", label: "▶️ YouTube" },
  { key: "instagram", label: "📸 Instagram" },
  { key: "tiktok", label: "🎵 TikTok" },
];

export function CommunityFeed({ onOpenProfile, limit }: { onOpenProfile: (id: string) => void; limit?: number }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (["education", "peer_educator"].includes(filter)) params.set("type", filter);
    if (["youtube", "instagram", "tiktok"].includes(filter)) params.set("platform", filter);
    if (q.trim()) params.set("q", q.trim());
    if (limit) params.set("limit", String(limit));
    try {
      const res = await fetch(`/api/community?${params.toString()}`);
      const d = await res.json();
      setItems(d.contents ?? []);
    } catch {
      // offline
    }
    setLoading(false);
  }, [filter, q, limit]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div>
      {/* Search + filter */}
      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fez-ink/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Cari konten, nama peserta, atau sekolah..."
            className="h-11 rounded-2xl border-2 border-fez-ink/15 bg-white pl-10 text-sm"
          />
        </div>
        <div className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                filter === f.key
                  ? "border-fez-ink bg-gradient-to-r from-rose-500 to-orange-400 text-white sticker-sm"
                  : "border-fez-ink/15 bg-white text-fez-ink/60 hover:border-fez-rose/40 hover:text-fez-rose"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-fez-rose" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-fez-rose/40 bg-white/70 p-10 text-center">
          <p className="text-5xl">🌱</p>
          <p className="mt-3 font-display text-lg font-extrabold text-fez-ink">Belum ada konten di sini</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Jadilah yang pertama! Kirim konten edukasi atau video Peer Educator — setelah disetujui admin, karyamu tampil di halaman ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onOpenProfile={onOpenProfile} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Wrapper tab komunitas untuk peserta (dengan tombol kirim)
// ============================================================
export function CommunityTab() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const { user, setCommunitySubmitOpen } = useFez();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-fez-ink bg-gradient-to-r from-violet-100 via-rose-50 to-amber-100 p-5">
        <div>
          <p className="font-display text-xl font-extrabold text-fez-ink">🌟 Fe-Zone Community</p>
          <p className="mt-0.5 text-sm text-fez-ink/65">
            Inspirasi Pejuang Fe-Zone — konten edukasi &amp; video Peer Educator yang sudah disetujui admin.
          </p>
        </div>
        {user?.role === "PARTICIPANT" && (
          <Button
            onClick={() => setCommunitySubmitOpen(true)}
            className="h-12 rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-cyan-500 to-teal-400 px-5 font-extrabold text-white hover:translate-x-0.5 hover:translate-y-0.5"
          >
            ➕ Buat Video Peer Educator
          </Button>
        )}
      </div>
      <CommunityFeed onOpenProfile={setProfileId} />
      <PublicProfileModal participantId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
}
