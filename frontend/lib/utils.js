import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getVideoModelAspectRatios(displayModel) {
  const map = {
    'Veo 3.1': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
    'Veo 3.1 Fast': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'],
    'Veo 3.1 Standard': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
  };
  return map[displayModel] || ['16:9'];
}

export function getImageModelAspectRatios(model) {
  const map = {
    'qwen-image': ['1:1', '16:9', '9:16', '4:3', '3:4', '5:4', '4:5', '3:2', '2:3', '21:9'],
    'seedream-4.0': ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '5:4', '4:5', '3:2', '2:3', '21:9'],
  };
  return map[model] || ['1:1'];
}

export function getImageModelResolutions(model) {
  const map = {
    'qwen-image': ['720p', '1080p'],
    'seedream-4.0': ['1080p', '2K', '4K'],
  };
  return map[model] || ['1080p'];
}

export function isVideoJob(queueType) {
  return queueType === 'sd_video' || queueType === 'hd_video';
}
