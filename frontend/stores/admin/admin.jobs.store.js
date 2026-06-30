'use client';
import { create } from 'zustand';
import { adminGetJobs } from '../../lib/api';

export const useAdminJobsStore = create((set) => ({
  jobs: [],
  loading: false,

  loadJobs: async (params = { limit: 50 }) => {
    set({ loading: true });
    try {
      const data = await adminGetJobs(params);
      set({ jobs: data.jobs || [] });
    } catch (err) {
      console.error('Admin load jobs error:', err);
    } finally {
      set({ loading: false });
    }
  },
}));
