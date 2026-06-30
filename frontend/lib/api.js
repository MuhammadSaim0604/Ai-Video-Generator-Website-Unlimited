import { useAuthStore } from './store';

function getToken() {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

async function apiFetch(path, options = {}) {
  const { headers = {}, ...rest } = options;
  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...headers },
    ...rest,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function generateImage(payload) {
  return apiFetch('/api/generate/image', { method: 'POST', body: JSON.stringify(payload) });
}

export async function generateVideo(payload) {
  return apiFetch('/api/generate/video', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getJobStatus(jobId) {
  return apiFetch(`/api/generate/status/${jobId}`);
}

export async function getQueueInfo() {
  return apiFetch('/api/generate/queue-info');
}

export async function uploadImage(file) {
  const token = getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function getMyUploadedImages() {
  return apiFetch('/api/upload/my-images');
}

export async function getMyGallery() {
  return apiFetch('/api/gallery/my');
}

export async function getMyCreatedImages() {
  return apiFetch('/api/gallery/my-created-images');
}

export async function getConfig() {
  return apiFetch('/api/config');
}

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('veo3_admin_token');
}

function adminAuthHeader() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminLogin(username, password) {
  const data = await apiFetch('/admin-api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.token && typeof window !== 'undefined') {
    localStorage.setItem('veo3_admin_token', data.token);
  }
  return data;
}

export async function adminLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('veo3_admin_token');
  }
  return apiFetch('/admin-api/logout', { method: 'POST' });
}

export async function adminGetMe() {
  return apiFetch('/admin-api/me', { headers: adminAuthHeader() });
}

export async function adminGetDashboard() {
  return apiFetch('/admin-api/dashboard', { headers: adminAuthHeader() });
}

export async function adminGetJobs(params = {}) {
  const q = new URLSearchParams(params);
  return apiFetch(`/admin-api/jobs?${q}`, { headers: adminAuthHeader() });
}

export async function adminGetAccounts() {
  return apiFetch('/admin-api/accounts', { headers: adminAuthHeader() });
}

export async function adminUploadAccounts(file) {
  const formData = new FormData();
  formData.append('accounts', file);
  const res = await fetch('/admin-api/accounts/upload', {
    method: 'POST',
    credentials: 'include',
    headers: adminAuthHeader(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function adminToggleAccount(id) {
  return apiFetch(`/admin-api/accounts/${id}/toggle`, { method: 'PATCH', headers: adminAuthHeader() });
}

export async function adminSyncCredits(id) {
  return apiFetch(`/admin-api/accounts/${id}/sync-credits`, { method: 'POST', headers: adminAuthHeader() });
}

export async function adminGetQueueSettings() {
  return apiFetch('/admin-api/queue/settings', { headers: adminAuthHeader() });
}

export async function adminUpdateQueueSettings(settings) {
  return apiFetch('/admin-api/queue/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
    headers: adminAuthHeader(),
  });
}

export async function adminSyncAll() {
  return apiFetch('/admin-api/accounts/sync-all', { method: 'POST', headers: adminAuthHeader() });
}

export async function adminSyncUsed() {
  return apiFetch('/admin-api/accounts/sync-used', { method: 'POST', headers: adminAuthHeader() });
}

export async function adminExportAccounts() {
  const res = await fetch('/admin-api/accounts/export', { credentials: 'include', headers: adminAuthHeader() });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `accounts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function adminExportDb() {
  const res = await fetch('/admin-api/db/export', { credentials: 'include', headers: adminAuthHeader() });
  if (!res.ok) throw new Error('DB export failed');
  const blob = await res.blob();
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veo3-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function adminImportDb(file) {
  const formData = new FormData();
  formData.append('backup', file);
  const res = await fetch('/admin-api/db/import', {
    method: 'POST',
    credentials: 'include',
    headers: adminAuthHeader(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return data;
}
