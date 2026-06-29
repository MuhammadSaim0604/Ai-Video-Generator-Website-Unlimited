# VEO 3 Free Unlimited — Agent Notes

## Project Overview
A free AI video/image generation platform that uses a pool of Pixverse accounts to serve unlimited generations to anonymous users. No login required, no credits, no limits.

## Architecture

### Backend (Express.js, port 3001)
- **Location:** `backend/src/index.js`
- **Database:** PostgreSQL (via `DATABASE_URL` env var)
- **Queue:** Custom in-memory queue backed by PG — no Redis needed
- **Real-time:** Socket.io (shares port with Express via `http.Server`)
- **Sessions:** PG-backed via `connect-pg-simple`


### Frontend (Next.js 15, port 5000)
- **Location:** `frontend/`
- **Proxying:** `next.config.js` rewrites `/api/*` → backend, `/admin-api/*` → `/admin/*` on backend, `/socket.io/*` → backend
- **Dark theme:** CSS variables in `globals.css`, shadcn-style Radix UI components

### Startup
- `start.sh` runs backend (port 3001) in background, waits 3s, then starts frontend (port 5000)
- Single "Start application" workflow points to `bash start.sh`

## Key Design Decisions

### Model Mapping
Frontend sends DISPLAY names → backend converts to internal Pixverse API names:
```
'Veo 3.1'          → 'pixverse-c1'
'Veo 3.1 Fast'     → 'v6'
'Veo 3.1 Standard' → 'v5.6'
```
Located in: `backend/src/constants/models.js`

### Queue Routing
- `360p` / `540p` → `sd_video` queue
- `720p` / `1080p` → `hd_video` queue (requires `high_quality_times > 0` on account)
- Images → `image` queue

### Pixverse API Key Facts
- **i2v (image-to-video):** NO `aspect_ratio` field — image determines ratio; uses `customer_img_path` (string)
- **i2i (image-to-image):** uses `customer_img_paths[]` (array)
- **All videos:** include `audio: 1` always
- **Polling:** use `account/message` endpoint every 5s; check `video_list`/`image_list` for completion
- **Credits:** `credit_change: 75` for all videos; images vary by model/quality

### Image Resolutions (Display → Pixverse)
```
qwen-image:   720p → '720p', 1080p → '1080p'
seedream-4.0: 2K → '1440p', 4K → '2160p'
```

### Account Management
- Max 2 concurrent generations per Pixverse account
- Accounts locked atomically via `FOR UPDATE SKIP LOCKED` in PG
- Token refresh: re-login on 401/403 errors
- HD video: decrements `high_quality_times` on account after submitting job

### OSS Upload Flow
1. GET `/getUploadToken` → returns `{ Ak, Sk, Token }` (Alibaba OSS credentials)
2. Upload file via multipart to `pixverse-fe-upload.oss-accelerate.aliyuncs.com/{ossKey}`
3. POST `/media/batch_upload_media` with ossKey path → returns confirmed URL/path
4. Use returned `path` as `customer_img_path` in generation requests

## Admin Panel
- **URL:** `/admin/login`
- **Bootstrap:** First login uses `ADMIN_SECRET` env var (only when no admin users exist in DB)
- **Features:** Account management, JSON upload, queue concurrency settings, job monitoring, 7-day analytics

## Environment Variables
| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `ADMIN_SECRET` | Initial admin password | (required) |
| `SESSION_SECRET` | Express session secret | (required) |
| `BACKEND_PORT` | Backend server port | `3001` |
| `BACKEND_INTERNAL_URL` | URL frontend uses to proxy to backend | `http://localhost:3001` |

## File Structure
```
backend/
  src/
    constants/models.js       — Model maps, API constants
    db/
      pool.js                 — PG connection pool
      schema.sql              — DB schema (applied on startup)
      migrate.js              — Runs schema.sql + resets stuck jobs
    middleware/
      adminAuth.js            — Session-based admin guard
      sessionId.js            — Anonymous user cookie tracker
    queues/
      QueueManager.js         — In-memory queue, polls PG every 2s
      workers/
        imageWorker.js        — Image generation + polling
        videoWorker.js        — Video generation + polling
    routes/
      generate.js             — POST /api/generate/image|video, GET /status
      upload.js               — POST /api/upload/image
      gallery.js              — GET /api/gallery, /my, /my-created-images
      admin.js                — Admin CRUD endpoints
    services/
      accountManager.js       — Account selection, token refresh, credit sync
      ossUploader.js          — Alibaba OSS multipart upload
      pixverseClient.js       — All Pixverse API calls
    socket/index.js           — Socket.io init, job/admin event emitters
    index.js                  — Server entry point

frontend/
  app/
    layout.jsx                — Root layout + SEO metadata
    page.jsx                  — Landing page (SEO-optimized)
    sitemap.js                — Dynamic sitemap
    robots.js                 — robots.txt
    studio/page.jsx           — Main generation studio
    gallery/page.jsx          — Public gallery (infinite scroll)
    admin/
      login/page.jsx          — Admin login
      dashboard/page.jsx      — Admin dashboard (tabs: overview, accounts, queue, jobs)
  components/
    GenerationCard.jsx        — Image/video card with hover-to-play
    ImageSelectorModal.jsx    — Pick uploaded or AI-created image
    PromptInputContainer.jsx  — Fixed bottom prompt bar with all settings
    ui/                       — shadcn-style Radix UI components
    admin/
      AccountsUpload.jsx      — Drag-drop JSON upload for Pixverse accounts
      QueueSettings.jsx       — Concurrency sliders
      StatsCards.jsx          — Dashboard stat cards
  lib/
    api.js                    — Relative URL fetch helpers
    socket.js                 — Socket.io client (same-origin)
    utils.js                  — cn(), formatters, model helpers
```

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` is set
- Check `SESSION_SECRET` is set  
- Run `cd backend && node src/index.js` manually and check output

### No Pixverse accounts / generations failing
- Upload accounts JSON via Admin → Accounts → Upload
- Check account has credits > 0 and is_active = TRUE
- HD videos require high_quality_times > 0

### Socket not connecting
- Ensure Next.js rewrite for `/socket.io/*` is active
- Frontend uses `window.location.origin` as socket URL

### Images won't load
- Pixverse CDN URLs (`media.pixverse.ai`) are added to Next.js `remotePatterns`
