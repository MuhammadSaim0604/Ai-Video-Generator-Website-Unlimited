'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMyGallery, generateImage, generateVideo } from '../../lib/api';

export const useUserJobsStore = create(
  persist(
    (set) => ({
      jobs: [],
      loading: false,

      setJobs: (jobs) => set({ jobs }),

      addJob: (job) =>
        set((s) => ({ jobs: [job, ...s.jobs] })),

      updateJob: (jobId, updates) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.job_id === jobId ? { ...j, ...updates } : j
          ),
        })),

      loadJobs: async () => {
        set({ loading: true });
        try {
          const data = await getMyGallery();
          set({ jobs: data });
        } catch (err) {
          console.error('Load jobs error:', err.message);
        } finally {
          set({ loading: false });
        }
      },

      submitImageJob: async (payload) => generateImage(payload),

      submitVideoJob: async (payload) => generateVideo(payload),
    }),
    { name: 'veo3-jobs' }
  )
);
