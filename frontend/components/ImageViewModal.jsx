'use client';
import { useState, useEffect } from 'react';
import {
  X, Download, Share2, Image as ImageIcon,
  Layers, Check, ExternalLink,
  Wand2, Hash, ZoomIn, ZoomOut, Maximize2 as ResizeIcon
} from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-white/5 last:border-0">
      <Icon className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xs text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ImageViewModal({ job, onClose }) {
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'z') setZoomed((z) => !z);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!job) return null;

  function handleDownload() {
    const a = document.createElement('a');
    a.href = job.result_url;
    a.download = `veo3-${job.job_id}.jpg`;
    a.target = '_blank';
    a.click();
  }

  async function handleShare() {
    const url = job.result_url;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'AI Generated Image', text: job.prompt || '', url });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] glass rounded-2xl border border-border overflow-hidden flex flex-col md:flex-row shadow-2xl">

        {/* Close button — always top-right, high z-index */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors border border-white/10"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* LEFT — Image viewer */}
        <div
          className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative min-h-[260px] md:min-h-0 overflow-hidden"
          onClick={() => setZoomed((z) => !z)}
          style={{ cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.result_url}
            alt={job.prompt || 'Generated image'}
            className={cn(
              'transition-transform duration-300 select-none',
              zoomed
                ? 'max-w-none scale-150'
                : 'max-w-full max-h-[90vh] object-contain'
            )}
            draggable={false}
          />

          {/* Zoom hint — bottom left so it never overlaps the X */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-[10px] text-white/60 pointer-events-none">
            {zoomed
              ? <><ZoomOut className="w-3 h-3" /> Click to fit</>
              : <><ZoomIn className="w-3 h-3" /> Click to zoom · Z</>
            }
          </div>
        </div>

        {/* RIGHT — Details panel */}
        <div className="w-full md:w-72 shrink-0 flex flex-col bg-background/60 border-t md:border-t-0 md:border-l border-border">

          {/* Header — quality badge here, away from close button */}
          <div className="p-4 border-b border-border flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-semibold text-foreground">Generated Image</p>
                {job.quality && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {job.quality.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{formatRelativeTime(job.created_at)}</p>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-4">
            {job.prompt && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3 h-3 text-primary/70" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prompt</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed bg-white/5 rounded-lg p-2.5 border border-white/5">
                  {job.prompt}
                </p>
              </div>
            )}
            <div className="space-y-0">
              <DetailRow icon={Layers} label="Model" value={job.display_model || job.model} />
              <DetailRow icon={ResizeIcon} label="Resolution" value={job.quality} />
              <DetailRow icon={ImageIcon} label="Aspect Ratio" value={job.aspect_ratio} />
              <DetailRow icon={Hash} label="Seed" value={job.seed ? String(job.seed) : null} />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button onClick={handleDownload} className="w-full h-9 text-xs gap-2">
              <Download className="w-3.5 h-3.5" />
              Download Image
            </Button>
            <Button variant="outline" onClick={handleShare} className="w-full h-9 text-xs gap-2">
              {copied
                ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                : <><Share2 className="w-3.5 h-3.5" />Share / Copy URL</>
              }
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
