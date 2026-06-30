'use client';
import { create } from 'zustand';
import {
  getMyUploadedImages,
  getMyCreatedImages,
  uploadImage as apiUploadImage,
} from '../../lib/api';

export const useUserImagesStore = create((set) => ({
  uploadedImages: [],
  createdImages: [],
  loading: false,
  uploading: false,
  uploadError: '',

  loadImages: async () => {
    set({ loading: true });
    try {
      const [uploaded, created] = await Promise.all([
        getMyUploadedImages().catch(() => []),
        getMyCreatedImages().catch(() => []),
      ]);
      set({ uploadedImages: uploaded, createdImages: created });
    } catch (_) {}
    finally { set({ loading: false }); }
  },

  uploadImage: async (file) => {
    set({ uploading: true, uploadError: '' });
    try {
      const result = await apiUploadImage(file);
      set((s) => ({ uploadedImages: [result, ...s.uploadedImages], uploading: false }));
      return result;
    } catch (err) {
      set({ uploading: false, uploadError: err.message || 'Upload failed' });
      throw err;
    }
  },

  clearUploadError: () => set({ uploadError: '' }),
}));
