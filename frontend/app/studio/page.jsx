"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Wand2, RefreshCw, Image as ImageIcon, Video, LogIn, User } from "lucide-react";
import PromptInputContainer from "../../components/PromptInputContainer";
import GenerationCard from "../../components/GenerationCard";
import VideoViewModal from "../../components/VideoViewModal";
import ImageViewModal from "../../components/ImageViewModal";
import AuthModal from "../../components/AuthModal";
import Logo from "../../components/Logo";
import { useUserAuthStore } from "../../stores/user/user.auth.store";
import { useUserJobsStore } from "../../stores/user/user.jobs.store";
import { subscribeToJob } from "../../lib/socket";
import { cn, isVideoJob } from "../../lib/utils";

const TABS = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Video },
];

export default function StudioPage() {
  const { isSignedIn, isLoaded } = useUserAuthStore();
  const { jobs, loading, loadJobs, addJob, updateJob } = useUserJobsStore();

  const [activeTab, setActiveTab] = useState("images");
  const [selectedJob, setSelectedJob] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadJobs();
    }
  }, [isLoaded, isSignedIn]);

  function requireAuth(message) {
    if (!useUserAuthStore.getState().isSignedIn) {
      setAuthModalMessage(message || "");
      setAuthModalOpen(true);
      return false;
    }
    return true;
  }

  function handleJobQueued(result) {
    const isVideo = result.queueType === "sd_video" || result.queueType === "hd_video";
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

    addJob(newJob);

    const unsub = subscribeToJob(result.jobId, {
      onProcessing: (data) => updateJob(data.jobId, { status: "processing" }),
      onCompleted: (data) => {
        updateJob(data.jobId, { status: "completed", result_url: data.resultUrl, webp_url: data.webpUrl || null });
        unsub();
      },
      onFailed: (data) => {
        updateJob(data.jobId, { status: "failed", error_msg: data.error });
        unsub();
      },
    });
  }

  function handleCardClick(job) {
    if (job.status !== "completed" || !job.result_url) return;
    setSelectedJob(job);
  }

  const imageJobs = jobs.filter((j) => j.queue_type === "image");
  const videoJobs = jobs.filter((j) => j.queue_type === "sd_video" || j.queue_type === "hd_video");
  const activeJobs = activeTab === "images" ? imageJobs : videoJobs;
  const selectedIsVideo = selectedJob && isVideoJob(selectedJob.queue_type);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoaded && isSignedIn && (
              <button
                onClick={loadJobs}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            )}
            {isLoaded && (
              isSignedIn ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/sign-in" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign In Free</span>
                    <span className="sm:hidden">Sign In</span>
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-14 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(({ id, label, icon: Icon }) => {
              const count = id === "images" ? imageJobs.length : videoJobs.length;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center",
                      activeTab === id ? "bg-white/20 text-white" : "bg-white/10 text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-36">
        {!isLoaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="glass rounded-xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : !isSignedIn ? (
          <GuestState />
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="glass rounded-xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className={cn(
            "grid gap-4",
            activeTab === "images"
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {activeJobs.map((job) => (
              <GenerationCard key={job.job_id} job={job} onSelect={handleCardClick} />
            ))}
          </div>
        )}
      </main>

      <PromptInputContainer onJobQueued={handleJobQueued} onAuthRequired={requireAuth} />

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} message={authModalMessage} />

      {selectedJob && selectedIsVideo && (
        <VideoViewModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
      {selectedJob && !selectedIsVideo && (
        <ImageViewModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

function GuestState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Wand2 className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Your Studio Awaits</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Sign in to generate unlimited AI videos and images for free. All your creations are saved in one place.
      </p>
      <Link href="/sign-in" className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
        Continue with Google
      </Link>
    </div>
  );
}

function EmptyState({ tab }) {
  const isVideo = tab === "videos";
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        {isVideo ? <Video className="w-8 h-8 text-primary" /> : <Wand2 className="w-8 h-8 text-primary" />}
      </div>
      <h2 className="text-xl font-semibold mb-2">{isVideo ? "No Videos Yet" : "No Images Yet"}</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        {isVideo
          ? "Switch to Video in the prompt bar below and generate your first AI video — completely free."
          : "Use the prompt bar below to generate your first AI image — completely free."}
      </p>
    </div>
  );
}
