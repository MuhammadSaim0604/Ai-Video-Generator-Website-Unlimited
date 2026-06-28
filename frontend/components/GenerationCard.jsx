"use client";
import { useState, useRef } from "react";
import {
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Video,
  Play,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { cn, formatRelativeTime, isVideoJob } from "../lib/utils";

const STATUS_CONFIG = {
  queued: { label: "In Queue", variant: "outline", icon: Clock },
  processing: { label: "Generating", variant: "processing", icon: Loader2 },
  completed: { label: "Done", variant: "success", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
};

export default function GenerationCard({ job, onSelect }) {
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  const isVideo = isVideoJob(job.queue_type);
  const hasResult = job.status === "completed" && job.result_url;

  // For video cards: show webp_url (first_frame) as static webpUrl — video loads in modal only
  // For image cards: show result_url directly
  const thumbUrl = isVideo ? job.webp_url || null : job.result_url || null;

  function handleDownload(e) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = job.result_url;
    a.download = `veo3-${job.job_id}.${isVideo ? "mp4" : "jpg"}`;
    a.target = "_blank";
    a.click();
  }

  const aspectClass = isVideo ? "aspect-video" : "aspect-square";
  const isClickable = hasResult && onSelect;

  return (
    <div
      className={cn(
        "glass rounded-xl overflow-hidden transition-all group",
        isClickable && "hover:border-primary/30 hover:glow-sm cursor-pointer",
        !isClickable && "cursor-default",
      )}
      onClick={() => isClickable && onSelect(job)}
    >
      {/* Media Preview */}
      <div
        className={cn(
          "relative bg-muted/30 flex items-center justify-center overflow-hidden",
          aspectClass,
        )}
      >
        {hasResult ? (
          <>
            {thumbUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbUrl}
                alt={job.prompt || "Generated content"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              /* No thumbnail yet — show placeholder with icon */
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {isVideo && job.webp_url ? (
                  <img
                    src={thumbUrl}
                    alt={job.prompt || "Generated content"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <video
                    className="w-full h-full object-cover"
                    src={job.result_url}
                  />
                )}
              </div>
            )}

            {/* Video: play icon badge overlay to signal it's clickable video */}
            {/*
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                </div>
              </div>
            )}
            */}

            {/* Download button — top-right corner on hover (same style for both image and video) */}
            <button
              onClick={handleDownload}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 z-10"
              title="Download"
            >
              <Download className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          /* Pending / processing / failed state */
          <div className="flex flex-col items-center gap-3 text-muted-foreground px-4 text-center">
            {job.status === "processing" ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs font-medium">Generating…</span>
              </>
            ) : job.status === "failed" ? (
              <>
                <XCircle className="w-8 h-8 text-destructive" />
                <span className="text-xs text-destructive line-clamp-3">
                  {job.error_msg || "Generation failed"}
                </span>
              </>
            ) : (
              <>
                {isVideo ? (
                  <Video className="w-8 h-8 opacity-40" />
                ) : (
                  <ImageIcon className="w-8 h-8 opacity-40" />
                )}
                <span className="text-xs">#{job.queue_position} in queue</span>
              </>
            )}
          </div>
        )}

        {/* Type + quality badge — bottom-left */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className="text-[10px] py-0 px-1.5 flex items-center gap-1 bg-black/50 text-white border-0"
          >
            {isVideo ? (
              <Video className="w-2.5 h-2.5" />
            ) : (
              <ImageIcon className="w-2.5 h-2.5" />
            )}
            {job.quality}
          </Badge>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={cfg.variant}
            className="flex items-center gap-1 text-[10px]"
          >
            <Icon
              className={cn(
                "w-2.5 h-2.5",
                job.status === "processing" && "animate-spin",
              )}
            />
            {cfg.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(job.created_at)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {job.prompt || "No prompt"}
        </p>

        {job.display_model && (
          <p className="text-[10px] text-primary/70">{job.display_model}</p>
        )}
      </div>
    </div>
  );
}
