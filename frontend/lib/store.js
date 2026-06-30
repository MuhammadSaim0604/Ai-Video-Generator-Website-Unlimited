'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isSignedIn: false,
  isLoaded: false,

  initAuth: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          set({ user: data.user, token: data.token || null, isSignedIn: true, isLoaded: true });
          return data.token || null;
        }
      }
    } catch (_) {}
    set({ user: null, token: null, isSignedIn: false, isLoaded: true });
    return null;
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {}
    set({ user: null, token: null, isSignedIn: false, isLoaded: true });
    window.location.href = '/';
  },
}));

export const useJobsStore = create(
  persist(
    (set) => ({
      jobs: [],
      setJobs: (jobs) => set({ jobs }),
      addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
      updateJob: (jobId, updates) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.job_id === jobId ? { ...j, ...updates } : j)),
        })),
    }),
    { name: 'veo3-jobs' }
  )
);
