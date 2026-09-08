"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFez } from "@/lib/store";
import { PLATFORM_LABEL, PLATFORM_ICON, MIN_DURATION, MAX_DURATION, MAX_UPLOAD_SIZE } from "@/lib/video";
import { ChevronLeft, Film, Loader2, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ============================================================
// Tipe
// ============================================================
interface MyContent {
  id: string;
  contentType: string;
  title: string;
  platform: string;
  status: string; // PENDING | APPROVED | REJECTED
  likesCount: number;
  xpAwarded: number;
  rejectReason: string | null;
  createdAt: string;
}

const PLATFORM_OPTIONS = [
  { key: "youtube", label: "YouTube", icon: "▶️", color: "bg-red-100 border-red-300" },
  { key: "instagram", label: "Instagram", icon: "📸", color: "bg-pink-100 border-pink-300" },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "bg-violet-100 border-violet-300" },
] as const;

const TOPIC_HINTS = [
  "Apa itu anemia?", "Gejala anemia", "Bahaya anemia", "Pentingnya TTD", "Cara minum TTD",
  "Manfaat zat besi", "Makanan sumber zat besi", "Kombinasi makanan tinggi zat besi",
  "Mitos dan fakta anemia", "Tips mencegah anemia", "Gizi seimbang remaja", "Pentingnya sarapan",
];

// ============================================================
// Panel Peer Educator (dipakai di Mission M8 & modal kirim)
// ============================================================
export function PeerEducatorPanel({ onBack, onSubmitted }: { onBack?: () => void; onSubmitted?: () => void }) {
  const { user } = useFez();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [platform, setPlatform] = useState<string>("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [contents, setContents] = useState<MyContent[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/participant/community");
      if (res.ok) {
        const d = await res.json();
        setContents(d.contents ?? []);
      }
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMine();
  }, [loadMine]);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_UPLOAD_SIZE) {
      toast({ title: "Video terlalu besar", description: `Ukuran maksimal ${MAX_UPLOAD_SIZE / 1024 / 1024}MB ya!`, variant: "destructive" });
      return;
    }
    if (!["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"].includes(f.type)) {
      toast({ title: "Format tidak didukung", description: "Gunakan format MP4, MOV, atau WebM.", variant: "destructive" });
      return;
    }
    setFile(f);
    setDuration(null);
    // Ukur durasi di sisi klien sebelum upload
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = Math.round(el.duration);
      setDuration(d);
      if (d < MIN_DURATION || d > MAX_DURATION) {
        toast({
          title: "⚠️ Video Peer Educator harus berdurasi 30–60 detik.",
          description: `Video kamu ${d} detik. Potong dulu ya sebelum mengirim!`,
          variant: "destructive",
        });
      }
    };
    el.src = URL.createObjectURL(f);
  }

  async function submit() {
    if (!title.trim()) {
      toast({ title: "Judul wajib diisi", description: "Beri judul yang menarik untuk videomu!", variant: "destructive" });
      return;
    }
    if (mode === "upload") {
      if (!file) {
        toast({ title: "Pilih video dulu", description: "Klik area upload untuk memilih video dari perangkatmu.", variant: "destructive" });
        return;
      }
      if (duration !== null && (duration < MIN_DURATION || duration > MAX_DURATION)) {
        toast({ title: "⚠️ Video Peer Educator harus berdurasi 30–60 detik.", variant: "destructive" });
        return;
      }
    } else {
      if (!url.trim()) {
        toast({ title: "URL video wajib diisi", description: "Tempel link video YouTube/Instagram/TikTok-mu.", variant: "destructive" });
        return;
      }
    }
    if (!description.trim()) {
      toast({ title: "Caption wajib diisi", description: "Tulis caption edukasi singkat untuk videomu.", variant: "destructive" });
      return;
    }

    setBusy(true);
    let res: Response;
    if (mode === "upload") {
      const fd = new FormData();
      fd.append("file", file!);
      fd.append("contentType", "peer_educator");
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("durationSec", String(duration ?? 0));
      res = await fetch("/api/participant/community", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/participant/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "peer_educator",
          platform,
          url: url.trim(),
          title: title.trim(),
          description: description.trim(),
        }),
      });
    }
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal mengirim", description: d.error, variant: "destructive" });
      return;
    }
    toast({ title: "🎬 Video terkirim!", description: "Status: Pending — menunggu moderasi admin. Jika disetujui, admin menetapkan XP-mu (maks +300 per video)!" });
    setTitle(""); setDescription(""); setUrl(""); setFile(null); setDuration(null);
    await loadMine();
    onSubmitted?.();
  }

  const approved = contents?.filter((c) => c.contentType === "peer_educator" && c.status === "APPROVED") ?? [];
  const totalXp = approved.reduce((a, c) => a + c.xpAwarded, 0);
  const totalLikes = approved.reduce((a, c) => a + c.likesCount, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {onBack && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-2 border-fez-ink bg-white font-bold text-fez-ink">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Button>
          <p className="font-display font-extrabold text-fez-ink">🎥 Peer Educator Fe-Zone</p>
        </div>
      )}

      {/* Header info */}
      <div className="rounded-3xl border-2 border-fez-ink bg-gradient-to-br from-cyan-50 to-violet-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-extrabold text-fez-ink">🎥 Peer Educator Fe-Zone</p>
          <span className="rounded-full border-2 border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
            ♾️ Bisa dikirim berkali-kali
          </span>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-fez-ink/75">
          <li>⏱️ Durasi video: <b>30–60 detik</b></li>
          <li>✅ Setiap video yang <b>disetujui admin</b> mendapat XP dari admin — <b className="text-fez-rose">maks +300 XP per video</b> (boleh kirim banyak video!)</li>
          <li>🎬 Sumber: YouTube, Instagram, TikTok (link) atau upload langsung</li>
          <li>💡 Topik: {TOPIC_HINTS.slice(0, 4).join(" · ")} ...dll</li>
        </ul>
        {(contents?.length ?? 0) > 0 && (
          <div className="mt-3 flex gap-2 text-[11px] font-extrabold">
            <span className="rounded-full bg-white px-2.5 py-1 text-cyan-700 border border-cyan-200">🎥 {approved.length} video approved</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-fez-rose border border-rose-200">⚡ +{totalXp} XP</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-rose-600 border border-rose-200">❤️ {totalLikes} like</span>
          </div>
        )}
      </div>

      {/* Pilih metode */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="font-display text-base font-extrabold text-fez-ink">1️⃣ Pilih cara berbagi video</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("link")}
            className={`rounded-2xl border-2 p-3 text-center transition ${mode === "link" ? "border-fez-ink bg-cyan-50 shadow-[3px_3px_0_0_#4a1d33]" : "border-fez-ink/15 bg-white hover:border-fez-rose/40"}`}
          >
            <p className="text-2xl">🔗</p>
            <p className="mt-1 text-xs font-extrabold text-fez-ink">Link dari Platform</p>
            <p className="text-[10px] text-muted-foreground">YouTube · Instagram · TikTok</p>
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`rounded-2xl border-2 p-3 text-center transition ${mode === "upload" ? "border-fez-ink bg-cyan-50 shadow-[3px_3px_0_0_#4a1d33]" : "border-fez-ink/15 bg-white hover:border-fez-rose/40"}`}
          >
            <p className="text-2xl">⬆️</p>
            <p className="mt-1 text-xs font-extrabold text-fez-ink">Upload Langsung</p>
            <p className="text-[10px] text-muted-foreground">File video 30–60 detik</p>
          </button>
        </div>

        {mode === "link" && (
          <div className="mt-4">
            <p className="text-xs font-extrabold text-fez-ink">Pilih Platform Video</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={`rounded-2xl border-2 p-2.5 text-center transition ${platform === p.key ? `border-fez-ink ${p.color} shadow-[3px_3px_0_0_#4a1d33]` : "border-fez-ink/15 bg-white hover:border-fez-rose/40"}`}
                >
                  <p className="text-xl">{p.icon}</p>
                  <p className="text-[11px] font-extrabold text-fez-ink">{p.label}</p>
                </button>
              ))}
            </div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                platform === "youtube" ? "https://youtube.com/watch?v=... atau https://youtu.be/..."
                : platform === "instagram" ? "https://instagram.com/reel/..."
                : "https://tiktok.com/@nama/video/..."
              }
              className="mt-3 h-11 rounded-xl border-2 border-fez-ink/20 text-sm"
            />
            {url.trim() && (
              <p className="mt-1.5 text-[11px] font-bold text-muted-foreground">
                Platform terdeteksi otomatis dari URL. Hanya link YouTube, Instagram, dan TikTok yang diterima.
              </p>
            )}
          </div>
        )}

        {mode === "upload" && (
          <div className="mt-4">
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-[2.5px] border-dashed border-fez-rose/50 bg-white/70 p-5 text-center transition hover:bg-rose-50/60"
            >
              {file ? (
                <div>
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="mx-auto max-h-56 rounded-xl"
                    onLoadedMetadata={(e) => setDuration(Math.round(e.currentTarget.duration))}
                  />
                  <p className="mt-2 truncate text-xs font-bold text-fez-ink">
                    📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    {duration !== null && (
                      <span className={duration >= MIN_DURATION && duration <= MAX_DURATION ? " text-emerald-600" : " text-rose-600"}>
                        {" "}· {duration}s {duration >= MIN_DURATION && duration <= MAX_DURATION ? "✓" : "⚠️"}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setDuration(null); }}
                    className="mt-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-bold"
                  >
                    Ganti video
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-9 w-9 text-fez-rose" />
                  <p className="mt-2 text-sm font-bold text-fez-ink">Klik untuk pilih video dari HP/komputermu</p>
                  <p className="text-xs text-muted-foreground">MP4 · MOV · WebM — maks {MAX_UPLOAD_SIZE / 1024 / 1024}MB — durasi 30–60 detik</p>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </div>
        )}
      </div>

      {/* Detail konten */}
      <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
        <p className="font-display text-base font-extrabold text-fez-ink">2️⃣ Ceritakan videomu</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Judul video (cth: 3 Tips Cegah Anemia di Sekolah)"
          className="mt-3 h-11 rounded-xl border-2 border-fez-ink/20 text-sm"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1200}
          rows={3}
          placeholder="Caption edukasi singkat — apa yang orang lain akan pelajari dari videomu?"
          className="mt-2 rounded-xl border-2 border-fez-ink/20 text-sm"
        />
        <p className="mt-1 text-right text-[10px] font-bold text-muted-foreground">{title.length}/120 · {description.length}/1200</p>
        <Button
          onClick={submit}
          disabled={busy}
          className="mt-2 h-13 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-cyan-500 to-teal-400 py-3 font-extrabold text-white disabled:opacity-40"
        >
          {busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim...</> : "🚀 Kirim untuk Dimoderasi Admin"}
        </Button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Video baru berstatus <b>Pending</b> dan baru tampil di Fe-Zone Community setelah disetujui admin. Satu video yang sudah
          mendapat XP tidak bisa mendapat XP ganda.
        </p>
      </div>

      {/* Riwayat: Video Saya */}
      {contents !== null && contents.length > 0 && (
        <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
          <p className="font-display text-base font-extrabold text-fez-ink">🎬 Video Saya</p>
          <div className="thin-scroll mt-3 max-h-96 overflow-y-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b-2 border-fez-ink/10 text-[10px] uppercase text-muted-foreground">
                  <th className="pb-2 pr-2 font-extrabold">Video</th>
                  <th className="pb-2 pr-2 font-extrabold">Platform</th>
                  <th className="pb-2 pr-2 font-extrabold">Status</th>
                  <th className="pb-2 pr-2 text-right font-extrabold">Like</th>
                  <th className="pb-2 text-right font-extrabold">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fez-ink/5">
                {contents.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2.5 pr-2">
                      <p className="font-extrabold text-fez-ink">{c.title}</p>
                      {c.status === "REJECTED" && c.rejectReason && (
                        <p className="mt-0.5 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">❌ {c.rejectReason}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 font-bold text-fez-ink/70">{PLATFORM_ICON[c.platform]} {PLATFORM_LABEL[c.platform] ?? c.platform}</td>
                    <td className="py-2.5 pr-2">
                      <StatusChip status={c.status} />
                    </td>
                    <td className="py-2.5 pr-2 text-right font-bold">❤️ {c.likesCount}</td>
                    <td className="py-2.5 text-right font-extrabold text-fez-rose">{c.xpAwarded > 0 ? `+${c.xpAwarded}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user?.role === "PARTICIPANT" && contents !== null && contents.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-fez-rose/40 bg-white/70 p-5 text-center text-sm text-muted-foreground">
          <Film className="mx-auto h-8 w-8 text-fez-rose/60" />
          <p className="mt-2 font-bold text-fez-ink">Belum ada video terkirim</p>
          <p className="mt-1">Kirim video pertamamu dan mulai kumpulkan XP Peer Educator! 💪</p>
        </div>
      )}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  if (status === "APPROVED") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Approved</span>;
  if (status === "PENDING") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">Pending</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">Rejected</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-600">{status}</span>;
}

// ============================================================
// Modal kirim konten (dari dashboard / community tab)
// ============================================================
export function CommunitySubmitModal() {
  const { communitySubmitOpen, setCommunitySubmitOpen } = useFez();
  const [contentType, setContentType] = useState<"peer_educator" | "education">("peer_educator");
  const [key, setKey] = useState(0);

  if (!communitySubmitOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-fez-ink/55 p-3 backdrop-blur-sm sm:p-6">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative mx-auto w-full max-w-2xl rounded-3xl border-2 border-fez-ink bg-fez-cream p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={() => { setContentType("peer_educator"); setKey((k) => k + 1); }}
              className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                contentType === "peer_educator" ? "border-fez-ink bg-cyan-100 text-fez-ink" : "border-fez-ink/15 bg-white text-fez-ink/50"
              }`}
            >
              🎥 Video Peer Educator
            </button>
            <button
              onClick={() => { setContentType("education"); setKey((k) => k + 1); }}
              className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-extrabold transition ${
                contentType === "education" ? "border-fez-ink bg-violet-100 text-fez-ink" : "border-fez-ink/15 bg-white text-fez-ink/50"
              }`}
            >
              📚 Konten Edukasi
            </button>
          </div>
          <button onClick={() => setCommunitySubmitOpen(false)} className="rounded-full bg-muted p-1.5" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {contentType === "peer_educator" ? (
          <PeerEducatorModalBody key={key} onDone={() => setCommunitySubmitOpen(false)} />
        ) : (
          <EducationSubmitForm key={key} onDone={() => setCommunitySubmitOpen(false)} />
        )}
      </motion.div>
    </div>
  );
}

function PeerEducatorModalBody({ onDone }: { onDone: () => void }) {
  return <PeerEducatorPanel onSubmitted={onDone} />;
}

// ============================================================
// Form konten edukasi (teks) → moderasi → Community Feed
// ============================================================
function EducationSubmitForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || description.trim().length < 30) {
      toast({ title: "Lengkapi dulu", description: "Judul wajib & isi edukasi minimal 30 karakter.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/participant/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "education", title: title.trim(), description: description.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Gagal mengirim", description: d.error, variant: "destructive" });
      return;
    }
    toast({ title: "📚 Konten edukasi terkirim!", description: "Setelah disetujui admin, kontenmu tampil di Fe-Zone Community." });
    setTitle(""); setDescription("");
    onDone();
  }

  return (
    <div className="rounded-3xl border-2 border-fez-ink bg-white p-5">
      <p className="font-display text-base font-extrabold text-fez-ink">📚 Tulis Konten Edukasi</p>
      <p className="mt-1 text-xs text-muted-foreground">Bagikan tips/pemahaman anemia &amp; TTD versimu. Konten tampil publik setelah moderasi admin.</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Judul (cth: 5 Makanan Kaya Zat Besi Favoritku)" className="mt-3 h-11 rounded-xl border-2 border-fez-ink/20 text-sm" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} rows={5} placeholder="Tulis edukasimu di sini... minimal 30 karakter." className="mt-2 rounded-xl border-2 border-fez-ink/20 text-sm" />
      <p className="mt-1 text-right text-[10px] font-bold text-muted-foreground">{description.length}/1200</p>
      <Button onClick={submit} disabled={busy} className="mt-2 h-12 w-full rounded-2xl border-2 border-fez-ink bg-gradient-to-r from-violet-500 to-purple-400 font-extrabold text-white disabled:opacity-40">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "🚀 Kirim untuk Dimoderasi"}
      </Button>
    </div>
  );
}

// ============================================================
// Panel riwayat ringkas untuk dashboard ("Video Saya" mini)
// ============================================================
export function MyVideosPreview() {
  const [contents, setContents] = useState<MyContent[]>([]);

  useEffect(() => {
    fetch("/api/participant/community")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setContents((d.contents ?? []).slice(0, 4)))
      .catch(() => {});
  }, []);

  if (contents.length === 0) return null;

  return (
    <div className="space-y-2">
      {contents.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-fez-ink/10 bg-cream/40 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-fez-ink">{c.title}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {PLATFORM_ICON[c.platform]} {PLATFORM_LABEL[c.platform] ?? c.platform} · ❤️ {c.likesCount}
            </p>
          </div>
          <StatusChip status={c.status} />
          <p className="w-14 shrink-0 text-right text-xs font-extrabold text-fez-rose">{c.xpAwarded > 0 ? `+${c.xpAwarded}` : "–"}</p>
        </div>
      ))}
    </div>
  );
}
