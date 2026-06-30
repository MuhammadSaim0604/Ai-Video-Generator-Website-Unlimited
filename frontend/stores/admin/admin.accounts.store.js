'use client';
import { create } from 'zustand';
import {
  adminToggleAccount,
  adminSyncCredits,
  adminSyncAll,
  adminSyncUsed,
  adminExportAccounts,
  adminUploadAccounts,
} from '../../lib/api';

export const useAdminAccountsStore = create((set) => ({
  accounts: [],
  syncingAll: false,
  syncingUsed: false,
  exporting: false,
  syncMsg: '',

  setAccounts: (accounts) => set({ accounts }),

  toggleAccount: async (id) => {
    await adminToggleAccount(id);
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, is_active: !a.is_active } : a
      ),
    }));
  },

  syncOne: async (id) => {
    await adminSyncCredits(id);
  },

  syncAll: async () => {
    set({ syncingAll: true, syncMsg: '' });
    try {
      const res = await adminSyncAll();
      set({ syncMsg: `Synced ${res.synced} accounts` });
      setTimeout(() => set({ syncMsg: '' }), 3000);
      return res;
    } catch {
      set({ syncMsg: 'Sync failed' });
      setTimeout(() => set({ syncMsg: '' }), 3000);
    } finally {
      set({ syncingAll: false });
    }
  },

  syncUsed: async () => {
    set({ syncingUsed: true, syncMsg: '' });
    try {
      const res = await adminSyncUsed();
      set({ syncMsg: `Synced ${res.synced} used accounts` });
      setTimeout(() => set({ syncMsg: '' }), 3000);
      return res;
    } catch {
      set({ syncMsg: 'Sync failed' });
      setTimeout(() => set({ syncMsg: '' }), 3000);
    } finally {
      set({ syncingUsed: false });
    }
  },

  exportAccounts: async () => {
    set({ exporting: true });
    try {
      await adminExportAccounts();
    } catch {
      alert('Export failed');
    } finally {
      set({ exporting: false });
    }
  },

  uploadAccounts: async (file) => adminUploadAccounts(file),
}));
