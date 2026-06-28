"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Download,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Video,
  Clock,
  Layers,
  Check,
  ExternalLink,
  Wand2,
  Hash,
  Maximize2 as ResizeIcon,
} from "lucide-react";
import { cn, formatRelativeTime } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-white/5 last:border-0">
      <Icon className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-xs text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

function formatTime(secs) {
  if (!isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoViewModal({ job, onClose }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "m") toggleMute();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!job) return null;

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }

  function handleTimeUpdate() {
    if (!videoRef.current || seeking) return;
    setCurrentTime(videoRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const newTime = ratio * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = job.result_url;
    a.download = `veo3-${job.job_id}.mp4`;
    a.target = "_blank";
    a.click();
  }

  async function handleShare() {
    const url = job.result_url;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Generated Video",
          text: job.prompt || "",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isHD = job.queue_type === "hd_video";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] glass rounded-2xl border border-border overflow-hidden flex flex-col md:flex-row shadow-2xl">
        {/* Close button — always visible, high z-index */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors border border-white/10"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* LEFT — Video player */}
        <div
          className="flex-1 bg-black flex items-center justify-center relative min-h-[260px] md:min-h-0 select-none"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <video
            ref={videoRef}
            src={job.result_url}
            poster={job.webpUrl || undefined}
            className="w-full h-full object-contain max-h-[90vh]"
            muted={muted}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
            style={{ cursor: "pointer" }}
          />

          {/* Center play/pause indicator — shows briefly on click */}
          {!playing && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ opacity: hovered ? 1 : 0.6, transition: "opacity 0.2s" }}
            >
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}

          {/* Bottom controls bar — shown on hover */}
          <div
            className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200"
            style={{ opacity: hovered ? 1 : 0 }}
          >
            {/* Timeline */}
            <div
              className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/seek relative"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-primary rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/seek:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {playing ? (
                  <Pause className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-white" fill="white" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>
              <span className="text-[10px] text-white/60 font-mono ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Details panel */}
        <div className="w-full md:w-72 shrink-0 flex flex-col bg-background/60 border-t md:border-t-0 md:border-l border-border">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Video className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-semibold text-foreground">
                  Generated Video
                </p>
                {job.quality && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {job.quality.toUpperCase()}
                  </Badge>
                )}
                {isHD && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-amber-400/40 text-amber-400"
                  >
                    HD
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatRelativeTime(job.created_at)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-4">
            {job.prompt && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3 h-3 text-primary/70" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Prompt
                  </p>
                </div>
                <p className="text-xs text-foreground leading-relaxed bg-white/5 rounded-lg p-2.5 border border-white/5">
                  {job.prompt}
                </p>
              </div>
            )}
            <div className="space-y-0">
              <DetailRow
                icon={Layers}
                label="Model"
                value={job.display_model || job.model}
              />
              <DetailRow
                icon={ResizeIcon}
                label="Resolution"
                value={job.quality}
              />
              <DetailRow
                icon={Video}
                label="Aspect Ratio"
                value={job.aspect_ratio}
              />
              <DetailRow
                icon={Clock}
                label="Duration"
                value={job.duration ? `${job.duration}s` : null}
              />
              <DetailRow
                icon={Hash}
                label="Seed"
                value={job.seed ? String(job.seed) : null}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              onClick={handleDownload}
              className="w-full h-9 text-xs gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full h-9 text-xs gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Share / Copy URL
                </>
              )}
            </Button>
            <a
              href={job.result_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
