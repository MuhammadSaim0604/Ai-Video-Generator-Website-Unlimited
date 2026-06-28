"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Wand2, RefreshCw, Image as ImageIcon, Video } from "lucide-react";
import PromptInputContainer from "../../components/PromptInputContainer";
import GenerationCard from "../../components/GenerationCard";
import VideoViewModal from "../../components/VideoViewModal";
import ImageViewModal from "../../components/ImageViewModal";
import { getMyGallery } from "../../lib/api";
import { subscribeToJob } from "../../lib/socket";
import { cn, isVideoJob } from "../../lib/utils";

const TABS = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Video },
];

export default function StudioPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("images");
  const [selectedJob, setSelectedJob] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await getMyGallery();
      setJobs(data);
    } catch (err) {
      console.error("Load jobs error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function handleJobQueued(result) {
    const isVideo =
      result.queueType === "sd_video" || result.queueType === "hd_video";
    setActiveTab(isVideo ? "videos" : "images");

    const newJob = {
      job_id: result.jobId,
      status: "queued",
      queue_position: result.queuePosition,
      queue_type: result.queue_type || result.queueType || "image",
      prompt: result.prompt || "",
      display_model: result.display_model || "",
      quality: result.quality || "",
      aspect_ratio: result.aspect_ratio || "",
      duration: result.duration || null,
      mode: result.mode || "",
      created_at: new Date().toISOString(),
    };

    setJobs((prev) => [newJob, ...prev]);

    const unsub = subscribeToJob(result.jobId, {
      onProcessing: (data) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === data.jobId ? { ...j, status: "processing" } : j,
          ),
        );
      },
      onCompleted: (data) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === data.jobId
              ? {
                  ...j,
                  status: "completed",
                  result_url: data.resultUrl,
                  webp_url: data.webpUrl || null,
                }
              : j,
          ),
        );
        unsub();
      },
      onFailed: (data) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === data.jobId
              ? { ...j, status: "failed", error_msg: data.error }
              : j,
          ),
        );
        unsub();
      },
    });
  }

  function handleCardClick(job) {
    if (job.status !== "completed" || !job.result_url) return;
    setSelectedJob(job);
  }

  function handleCloseModal() {
    setSelectedJob(null);
  }

  const imageJobs = jobs.filter((j) => j.queue_type === "image");
  const videoJobs = jobs.filter(
    (j) => j.queue_type === "sd_video" || j.queue_type === "hd_video",
  );
  const activeJobs = activeTab === "images" ? imageJobs : videoJobs;

  const selectedIsVideo = selectedJob && isVideoJob(selectedJob.queue_type);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold gradient-text">
            VEO 3 Free
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/gallery"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Gallery
            </Link>
            <button
              onClick={loadJobs}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-14 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(({ id, label, icon: Icon }) => {
              const count =
                id === "images" ? imageJobs.length : videoJobs.length;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center",
                        activeTab === id
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-36">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-xl aspect-square animate-pulse-slow"
              />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div
            className={cn(
              "grid gap-4",
              activeTab === "images"
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {activeJobs.map((job) => (
              <GenerationCard
                key={job.job_id}
                job={job}
                onSelect={handleCardClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Prompt input */}
      <PromptInputContainer onJobQueued={handleJobQueued} />

      {/* View modals */}
      {selectedJob && selectedIsVideo && (
        <VideoViewModal job={selectedJob} onClose={handleCloseModal} />
      )}
      {selectedJob && !selectedIsVideo && (
        <ImageViewModal job={selectedJob} onClose={handleCloseModal} />
      )}
    </div>
  );
}

function EmptyState({ tab }) {
  const isVideo = tab === "videos";
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        {isVideo ? (
          <Video className="w-8 h-8 text-primary" />
        ) : (
          <Wand2 className="w-8 h-8 text-primary" />
        )}
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {isVideo ? "No Videos Yet" : "No Images Yet"}
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        {isVideo
          ? "Switch to the Video tab in the prompt bar below and generate your first AI video — completely free."
          : "Use the prompt bar below to generate your first AI image — completely free."}
      </p>
    </div>
  );
}
