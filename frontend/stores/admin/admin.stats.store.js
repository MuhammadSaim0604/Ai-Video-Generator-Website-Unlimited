'use client';
import { create } from 'zustand';
import { adminGetDashboard } from '../../lib/api';

export const useAdminStatsStore = create((set) => ({
  dashboard: null,
  loading: false,

  loadDashboard: async () => {
    set({ loading: true });
    try {
      const data = await adminGetDashboard();
      set({ dashboard: data, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
}));
