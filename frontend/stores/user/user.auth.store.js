'use client';
import { create } from 'zustand';

export const useUserAuthStore = create((set) => ({
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
    if (typeof window !== 'undefined') window.location.href = '/';
  },
}));
