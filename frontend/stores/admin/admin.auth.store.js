'use client';
import { create } from 'zustand';
import { adminLogin, adminLogout, adminGetMe } from '../../lib/api';

export const useAdminAuthStore = create((set) => ({
  username: '',
  isAuthenticated: false,
  isLoaded: false,

  checkAuth: async () => {
    try {
      const data = await adminGetMe();
      set({ username: data.username, isAuthenticated: true, isLoaded: true });
      return true;
    } catch (_) {
      set({ isAuthenticated: false, isLoaded: true });
      return false;
    }
  },

  login: async (username, password) => {
    const data = await adminLogin(username, password);
    set({ username, isAuthenticated: true });
    return data;
  },

  logout: async () => {
    await adminLogout().catch(() => {});
    set({ username: '', isAuthenticated: false });
  },
}));
