'use client';
import { create } from 'zustand';
import {
  adminGetQueueSettings,
  adminUpdateQueueSettings,
  adminExportDb,
  adminImportDb,
} from '../../lib/api';

export const useAdminSettingsStore = create((set) => ({
  settings: null,
  dbExporting: false,
  dbImporting: false,
  dbMsg: null,

  loadSettings: async () => {
    try {
      const data = await adminGetQueueSettings();
      set({ settings: data });
      return data;
    } catch (_) {}
  },

  updateSettings: async (settings) => {
    await adminUpdateQueueSettings(settings);
    set({ settings });
  },

  exportDb: async () => {
    set({ dbExporting: true, dbMsg: null });
    try {
      await adminExportDb();
      set({ dbMsg: { type: 'success', text: 'Backup downloaded successfully' } });
    } catch (err) {
      set({ dbMsg: { type: 'error', text: err.message || 'Export failed' } });
    } finally {
      set({ dbExporting: false });
      setTimeout(() => set({ dbMsg: null }), 4000);
    }
  },

  importDb: async (file) => {
    set({ dbImporting: true, dbMsg: null });
    try {
      const res = await adminImportDb(file);
      const counts = Object.entries(res.imported || {})
        .map(([t, n]) => `${t}: ${n}`)
        .join(', ');
      set({ dbMsg: { type: 'success', text: `Import complete — ${counts}` } });
      setTimeout(() => set({ dbMsg: null }), 6000);
      return res;
    } catch (err) {
      set({ dbMsg: { type: 'error', text: err.message || 'Import failed' } });
      setTimeout(() => set({ dbMsg: null }), 6000);
      throw err;
    } finally {
      set({ dbImporting: false });
    }
  },
}));
