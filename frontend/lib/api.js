// Use relative URLs — Next.js rewrites proxy to the backend
// This works both in dev and production
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Generation ────────────────────────────────────────────────────────────────
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

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function getMyUploadedImages() {
  return apiFetch('/api/upload/my-images');
}

// ── Gallery ───────────────────────────────────────────────────────────────────
export async function getGallery({ page = 1, limit = 20, type } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (type) params.set('type', type);
  return apiFetch(`/api/gallery?${params}`);
}

export async function getMyGallery() {
  return apiFetch('/api/gallery/my');
}

export async function getMyCreatedImages() {
  return apiFetch('/api/gallery/my-created-images');
}

// ── Config ────────────────────────────────────────────────────────────────────
export async function getConfig() {
  return apiFetch('/api/config');
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function adminLogin(username, password) {
  return apiFetch('/admin-api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export async function adminLogout() {
  return apiFetch('/admin-api/logout', { method: 'POST' });
}

export async function adminGetMe() {
  return apiFetch('/admin-api/me');
}

export async function adminGetDashboard() {
  return apiFetch('/admin-api/dashboard');
}

export async function adminGetJobs(params = {}) {
  const q = new URLSearchParams(params);
  return apiFetch(`/admin-api/jobs?${q}`);
}

export async function adminGetAccounts() {
  return apiFetch('/admin-api/accounts');
}

export async function adminUploadAccounts(file) {
  const formData = new FormData();
  formData.append('accounts', file);
  const res = await fetch('/admin-api/accounts/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function adminToggleAccount(id) {
  return apiFetch(`/admin-api/accounts/${id}/toggle`, { method: 'PATCH' });
}

export async function adminSyncCredits(id) {
  return apiFetch(`/admin-api/accounts/${id}/sync-credits`, { method: 'POST' });
}

export async function adminGetQueueSettings() {
  return apiFetch('/admin-api/queue/settings');
}

export async function adminUpdateQueueSettings(settings) {
  return apiFetch('/admin-api/queue/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
