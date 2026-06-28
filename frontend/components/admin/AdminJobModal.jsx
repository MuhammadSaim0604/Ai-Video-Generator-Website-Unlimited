'use client';
import { useState, useEffect } from 'react';
import {
  X, Download, Play, Image as ImageIcon, Video,
  Clock, CheckCircle, XCircle, Loader2, Copy, ExternalLink,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn, formatRelativeTime, isVideoJob } from '../../lib/utils';

const STATUS_CONFIG = {
  queued:     { label: 'In Queue',   variant: 'outline',     icon: Clock },
  processing: { label: 'Generating', variant: 'processing',  icon: Loader2 },
  completed:  { label: 'Completed',  variant: 'success',     icon: CheckCircle },
  failed:     { label: 'Failed',     variant: 'destructive', icon: XCircle },
};

function DetailRow({ label, value, mono = false, className = '' }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className={cn('text-xs text-right break-all', mono && 'font-mono', className)}>{value}</span>
    </div>
  );
}

export default function AdminJobModal({ job, onClose }) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [copied, setCopied] = useState('');

  const isVideo = isVideoJob(job.queue_type);
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function copyText(text, key) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  }

  function handleDownload() {
    if (!job.result_url) return;
    const a = document.createElement('a');
    a.href = job.result_url;
    a.download = `job-${job.job_id}.${isVideo ? 'mp4' : 'jpg'}`;
    a.target = '_blank';
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl glass rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {isVideo
              ? <Video className="w-4 h-4 text-primary" />
              : <ImageIcon className="w-4 h-4 text-primary" />}
            <span className="font-semibold text-sm">Job Details</span>
            <Badge variant={cfg.variant} className="flex items-center gap-1 text-[10px]">
              <Icon className={cn('w-2.5 h-2.5', job.status === 'processing' && 'animate-spin')} />
              {cfg.label}
            </Badge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* Left — media preview */}
          <div className="md:w-1/2 bg-black/40 flex items-center justify-center shrink-0 relative min-h-[220px]">
            {job.status === 'completed' && job.result_url ? (
              isVideo ? (
                videoPlaying ? (
                  <video
                    src={job.result_url}
                    autoPlay
                    controls
                    className="w-full h-full object-contain max-h-[60vh]"
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {job.webp_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={job.webp_url}
                        alt="Video thumbnail"
                        className="w-full h-full object-contain max-h-[60vh]"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Video className="w-12 h-12 opacity-30" />
                        <span className="text-xs">No thumbnail</span>
                      </div>
                    )}
                    <button
                      onClick={() => setVideoPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center group"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center group-hover:bg-white/25 transition-all">
                        <Play className="w-6 h-6 text-white ml-1" fill="white" />
                      </div>
                    </button>
                  </div>
                )
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={job.result_url}
                  alt={job.prompt || 'Generated image'}
                  className="w-full h-full object-contain max-h-[60vh]"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8 text-center">
                {job.status === 'processing' && <Loader2 className="w-10 h-10 animate-spin text-primary" />}
                {job.status === 'failed' && <XCircle className="w-10 h-10 text-destructive" />}
                {job.status === 'queued' && (isVideo
                  ? <Video className="w-10 h-10 opacity-30" />
                  : <ImageIcon className="w-10 h-10 opacity-30" />)}
                <span className="text-sm">
                  {job.status === 'failed'
                    ? (job.error_msg || 'Generation failed')
                    : job.status === 'processing'
                    ? 'Generating…'
                    : 'Waiting in queue'}
                </span>
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="md:w-1/2 flex flex-col overflow-y-auto">

            {/* Prompt */}
            <div className="p-4 border-b border-border/40">
              <p className="text-xs text-muted-foreground mb-1.5">Prompt</p>
              <p className="text-sm leading-relaxed">{job.prompt || '—'}</p>
              {job.prompt && (
                <button
                  onClick={() => copyText(job.prompt, 'prompt')}
                  className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied === 'prompt' ? 'Copied!' : 'Copy prompt'}
                </button>
              )}
            </div>

            {/* Details */}
            <div className="p-4 space-y-0 flex-1">
              <DetailRow label="Job ID"      value={job.job_id}         mono />
              <DetailRow label="Pixverse ID" value={job.pixverse_job_id} mono />
              <DetailRow label="Type"        value={`${job.queue_type} / ${job.mode}`} />
              <DetailRow label="Model"       value={job.display_model} />
              <DetailRow label="Quality"     value={job.quality} />
              <DetailRow label="Aspect Ratio" value={job.aspect_ratio} />
              {isVideo && <DetailRow label="Duration" value={job.duration ? `${job.duration}s` : null} />}
              <DetailRow label="Account"     value={job.account_email} />
              <DetailRow label="Created"     value={job.created_at ? new Date(job.created_at).toLocaleString() : null} />
              <DetailRow label="Completed"   value={job.completed_at ? new Date(job.completed_at).toLocaleString() : null} />
              {job.status === 'failed' && (
                <DetailRow label="Error" value={job.error_msg} className="text-destructive" />
              )}
            </div>

            {/* Actions */}
            {job.status === 'completed' && job.result_url && (
              <div className="p-4 border-t border-border/40 flex gap-2 shrink-0">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => copyText(job.result_url, 'url')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs hover:bg-white/10 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === 'url' ? 'Copied!' : 'Copy URL'}
                </button>
                <a
                  href={job.result_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
