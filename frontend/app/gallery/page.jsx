'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Grid, Image as ImageIcon, Video, Wand2 } from 'lucide-react';
import GenerationCard from '../../components/GenerationCard';
import VideoViewModal from '../../components/VideoViewModal';
import ImageViewModal from '../../components/ImageViewModal';
import { getGallery } from '../../lib/api';
import { isVideoJob } from '../../lib/utils';

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const loaderRef = useRef(null);

  const loadMore = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    setLoading(true);
    const currentPage = reset ? 1 : page;
    try {
      const type = filter === 'all' ? undefined : filter;
      const data = await getGallery({ page: currentPage, limit: 24, type });
      if (reset) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.hasMore);
      setPage(currentPage + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, hasMore]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setItems([]);
    loadMore(true);
  }, [filter]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loading && hasMore) loadMore(); },
      { threshold: 0.5 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, loadMore]);

  function handleCardClick(job) {
    if (job.status !== 'completed' || !job.result_url) return;
    setSelectedJob(job);
  }

  function handleCloseModal() {
    setSelectedJob(null);
  }

  const selectedIsVideo = selectedJob && isVideoJob(selectedJob.queue_type);

  const isVideoFilter = filter === 'video';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold gradient-text">VEO 3 Free</Link>
          <Link
            href="/studio"
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" /> Generate
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Community <span className="gradient-text">Gallery</span>
          </h1>
          <p className="text-muted-foreground">AI-generated content from the VEO 3 Free community</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'All', icon: Grid },
            { value: 'image', label: 'Images', icon: ImageIcon },
            { value: 'video', label: 'Videos', icon: Video },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {items.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <ImageIcon className="w-12 h-12" />
            <p>No content yet. Be the first to generate!</p>
            <Link href="/studio" className="text-primary text-sm hover:underline">Generate Free →</Link>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            isVideoFilter
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
          }`}>
            {items.map((item) => (
              <GenerationCard
                key={item.job_id}
                job={item}
                onSelect={handleCardClick}
              />
            ))}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="glass rounded-xl aspect-square animate-pulse-slow" />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="h-8 mt-4" />
      </main>

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
