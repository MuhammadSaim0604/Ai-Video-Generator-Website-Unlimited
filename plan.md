# VEO 3 Free Unlimited — Full Architecture & Build Plan

## Project Vision

A **free, unlimited AI video and image generation platform** powered by Pixverse accounts behind the scenes. Users land on the site, generate images and videos instantly with zero cost. The site is heavily SEO-optimized around keywords like **"VEO 3 Free Unlimited"**, **"Free AI Video Generator"**, **"Free AI Image Generator"** to drive organic traffic.

---

## Tech Stack Decision

### Frontend — **Next.js 16 (App Router) + shadcn/ui**
**Why Next.js (not plain React):**
- **SEO is the #1 goal** — Next.js gives us Server-Side Rendering (SSR) and Static Site Generation (SSG) so Google can index our pages properly. A plain React SPA cannot be indexed for keywords like "VEO 3 Free Unlimited".
- **Built-in metadata API** — We can set per-page `<title>`, `<meta description>`, Open Graph, Twitter cards, and structured JSON-LD schema directly.
- **Image optimization** — `next/image` for fast loading.
- **Streaming** — Real-time generation status updates feel fast.

**UI Components — shadcn/ui:**
- Open-source, copy-paste component library built on Radix UI + Tailwind CSS.
- Used for: Tabs, Dialog (modals), Slider, Button, Badge, Card, Table, Select, Tooltip, Progress, ScrollArea, etc.
- Fully customizable — no vendor lock-in.

### Backend — **Express.js (Node.js)**
**Why Express (not Django):**
- Same language ecosystem as Next.js (JavaScript/TypeScript) — no context switching.
- **Bull/BullMQ queue system** runs natively in Node.js — the 3-queue architecture with concurrent generation limits is straightforward.
- **Socket.io** integrates seamlessly for real-time push updates to the frontend.
- Django would add Python overhead with no real benefit for this queue-heavy, I/O-bound workload.

### Database — **PostgreSQL** (Replit built-in)
- Stores: Pixverse accounts, generation jobs, user sessions, analytics.

### Real-time — **Socket.io**
- Backend pushes generation status events to frontend without polling.

### Queue — **BullMQ** (Redis-backed)
- 3 separate queues with configurable concurrency.
- Redis via `ioredis`.

---

## Full System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     USERS (Browser)                         │
└─────────────────────┬──────────────────────────────────────┘
                       │  HTTPS
┌─────────────────────▼──────────────────────────────────────┐
│              Next.js Frontend (Port 3000)                   │
│  - Landing Page (SEO: VEO 3 Free Unlimited)                 │
│  - Generation Studio Page                                    │
│  - My Gallery Page                                           │
│  - Communicates with Express backend via REST + Socket.io   │
└─────────────────────┬──────────────────────────────────────┘
                       │  REST API + Socket.io
┌─────────────────────▼──────────────────────────────────────┐
│              Express.js Backend (Port 5000)                  │
│                                                              │
│  Routes:                                                     │
│  POST /api/generate/image     → enqueue image job           │
│  POST /api/generate/video     → enqueue video job           │
│  POST /api/upload/image       → handle image upload to OSS  │
│  GET  /api/gallery            → user's generated content    │
│  GET  /api/status/:jobId      → job status                  │
│                                                              │
│  Admin Routes:                                               │
│  POST /admin/accounts/upload  → upload pixverse JSON        │
│  GET  /admin/dashboard        → stats & analytics           │
│  PUT  /admin/queue/settings   → set concurrency limits      │
│                                                              │
│  Queue Workers:                                              │
│  [Image Queue]      → handles image gen jobs                │
│  [SD Video Queue]   → handles 360p/540p video jobs          │
│  [HD Video Queue]   → handles 720p/1080p video jobs         │
│                                                              │
│  Account Manager:                                            │
│  - Smart account selection per job type                     │
│  - Tracks active concurrent gens per account (DB)           │
│  - Auto re-login if token expired                           │
└─────┬─────────────────────────────────┬────────────────────┘
      │ SQL queries                      │ Queue jobs
┌─────▼───────┐                  ┌──────▼──────────┐
│ PostgreSQL  │                  │ Redis (BullMQ)  │
│ - accounts  │                  │ - imageQueue    │
│ - jobs      │                  │ - sdVideoQueue  │
│ - analytics │                  │ - hdVideoQueue  │
└─────────────┘                  └─────────────────┘
      │
      │ Pixverse API calls (outbound)
┌─────▼──────────────────────────────────────────────────────┐
│                 Pixverse API Server                          │
│  app-api.pixverse.ai                                        │
│  pixverse-fe-upload.oss-accelerate.aliyuncs.com            │
└────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `pixverse_accounts`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| email | TEXT UNIQUE | Account email |
| username | TEXT | |
| password | TEXT | For re-login when token expires |
| token | TEXT | Current JWT token |
| account_id | BIGINT | Pixverse account ID |
| invite_code | TEXT | |
| total_credits | INT | From workspace API |
| remaining_credits | INT | Tracked locally |
| high_quality_times | INT | Remaining 720p/1080p trials |
| active_generations | INT DEFAULT 0 | Currently running (max 2) |
| is_active | BOOLEAN DEFAULT true | |
| last_used_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### `generation_jobs`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| job_id | TEXT UNIQUE | BullMQ job ID |
| session_id | TEXT | Anonymous user session |
| type | ENUM(image, sd_video, hd_video) | Queue type |
| mode | ENUM(t2i, i2i, t2v, i2v) | Generation mode |
| model | TEXT | e.g. qwen-image, v6, v5.6 |
| prompt | TEXT | |
| quality | TEXT | 360p/540p/720p/1080p/2160p |
| aspect_ratio | TEXT | |
| duration | INT | Video duration in seconds |
| seed | BIGINT | Random seed used |
| status | ENUM(queued, processing, completed, failed) | |
| pixverse_account_id | INT FK | Which account was used |
| pixverse_job_id | BIGINT | Image/video ID from Pixverse |
| result_url | TEXT | Final image/video URL |
| result_path | TEXT | Path in Pixverse storage |
| webp_url | TEXT | Thumbnail/preview URL |
| error_msg | TEXT | If failed |
| queue_position | INT | Position in queue |
| created_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |

### `uploaded_images`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| session_id | TEXT | Who uploaded it |
| pixverse_image_id | BIGINT | ID from batch_upload_media |
| url | TEXT | media.pixverse.ai URL |
| path | TEXT | OSS path for API use |
| file_name | TEXT | Original filename |
| width | INT | |
| height | INT | |
| uploaded_via_account | INT FK | Which account token was used for upload |
| created_at | TIMESTAMP | |

### `site_analytics`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| date | DATE | |
| total_visitors | INT | |
| total_images_generated | INT | |
| total_videos_generated | INT | |
| total_hd_videos_generated | INT | |
| total_sd_videos_generated | INT | |

### `admin_users`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| username | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt hash |
| created_at | TIMESTAMP | |

### `queue_settings`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | |
| image_concurrency | INT DEFAULT 10 | Max simultaneous image jobs |
| sd_video_concurrency | INT DEFAULT 5 | Max simultaneous SD video jobs |
| hd_video_concurrency | INT DEFAULT 3 | Max simultaneous HD video jobs |
| updated_at | TIMESTAMP | |

---

## Queue System — Detailed Logic

### 3 Queues
1. **Image Queue** — `qwen-image` (720p, 1080p) and `seedream-4.0` (1080p, 2K, 4K) generation jobs
2. **SD Video Queue** — `360p`, `540p` video generation (t2v and i2v)
3. **HD Video Queue** — `720p`, `1080p` video generation (t2v and i2v)

### Smart Account Selector (runs before every job)
```
function selectAccount(jobType):
  1. Fetch all active accounts from DB where is_active = true
  2. Filter: active_generations < 2 (must have a free slot)
  3. If jobType == HD:
       Filter: high_quality_times > 0
       Sort by: highest remaining credits
  4. If jobType == SD or Image:
       Sort by: highest remaining credits
  5. Pick top account → increment active_generations in DB
  6. Return account (token, account_id)
  7. After job finishes → decrement active_generations
```

### Token Expiry Handling
- If Pixverse returns auth error → call login API with stored email/password → update token in DB → retry job

### Polling for Completion
- After submitting job to Pixverse, poll `account/message` API every 5 seconds
- When job ID appears in `video_list` or `image_list` → fetch from `asset/library/list` to get final URL
- Push completion event via Socket.io to the user's browser

---

## Frontend Pages & SEO

### `/` — Landing Page (SSG — fully static, max SEO)
- **Title**: `VEO 3 Free Unlimited — Generate AI Videos & Images Free`
- **Meta Description**: `Generate unlimited AI videos and images for free. Try VEO 3 Free, create stunning AI videos with no limits, no login required.`
- Hero section with animated background video loop
- Big headline: **"VEO 3 Free Unlimited — No Cost. No Limits."**
- Feature cards: Unlimited Videos, HD Quality, Instant Generation
- CTA button → `/studio`
- FAQ section (keyword-rich, SEO)
- Structured data JSON-LD (WebApplication schema)

### `/studio` — Generation Studio (SSR)
- **Title**: `AI Video & Image Generator — VEO 3 Free Studio`
- Main canvas/gallery area showing user's current session results
- **Prompt Input Container** (bottom center, fixed):
  - Two tabs: `Image` | `Video`
  - Image attachment button (opens Image Selector Modal)
  - Prompt text area
  - Settings panel: Model, Resolution, Aspect Ratio, Duration (video only)
  - Generate button with queue position indicator
- Real-time generation status cards (Socket.io powered)
- Queue position badge ("You are #12 in queue")

### `/gallery` — Public Gallery (SSG + ISR)
- **Title**: `AI Generated Videos & Images Gallery — VEO 3 Free`
- Shows recently completed generations (community gallery)
- Infinite scroll, filter by image/video

### `/admin` — Admin Dashboard (server-rendered, protected)
- Login page → session-based auth
- **Dashboard Tab**: Live stats — active users, queue sizes, jobs today, accounts status
- **Accounts Tab**: Upload JSON file → system adds all accounts, shows per-account status (credits, HD times remaining, active generations)
- **Queue Settings Tab**: Sliders for image/sd/hd concurrency limits
- **Jobs Tab**: Table of all jobs with status, account used, time taken

---

## Project Folder Structure

```
/
├── frontend/                    # Next.js 16 App
│   ├── app/
│   │   ├── layout.tsx           # Root layout with metadata
│   │   ├── page.tsx             # Landing page (/)
│   │   ├── studio/
│   │   │   └── page.tsx         # Generation studio
│   │   ├── gallery/
│   │   │   └── page.tsx         # Public gallery
│   │   └── admin/
│   │       ├── login/page.tsx
│   │       └── dashboard/page.tsx
│   ├── components/
│   │   ├── PromptInputContainer.tsx
│   │   ├── ImageSelectorModal.tsx
│   │   ├── GenerationCard.tsx
│   │   ├── QueueBadge.tsx
│   │   └── admin/
│   │       ├── AccountsUpload.tsx
│   │       ├── QueueSettings.tsx
│   │       └── StatsCards.tsx
│   ├── lib/
│   │   ├── api.ts               # API client functions
│   │   └── socket.ts            # Socket.io client
│   └── public/
│
├── backend/                     # Express.js API
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── db/
│   │   │   ├── schema.sql       # DB schema
│   │   │   └── pool.ts          # PG connection pool
│   │   ├── routes/
│   │   │   ├── generate.ts      # POST /api/generate/*
│   │   │   ├── upload.ts        # POST /api/upload/*
│   │   │   ├── gallery.ts       # GET /api/gallery
│   │   │   └── admin.ts         # /admin/* routes
│   │   ├── queues/
│   │   │   ├── imageQueue.ts    # BullMQ image queue
│   │   │   ├── sdVideoQueue.ts  # BullMQ SD video queue
│   │   │   ├── hdVideoQueue.ts  # BullMQ HD video queue
│   │   │   └── workers/
│   │   │       ├── imageWorker.ts
│   │   │       ├── sdVideoWorker.ts
│   │   │       └── hdVideoWorker.ts
│   │   ├── services/
│   │   │   ├── accountManager.ts  # Smart account selector + token refresh
│   │   │   ├── pixverseClient.ts  # All Pixverse API calls
│   │   │   ├── ossUploader.ts     # Alicloud OSS multipart upload
│   │   │   └── poller.ts          # account/message polling logic
│   │   ├── socket/
│   │   │   └── index.ts         # Socket.io setup + event emitters
│   │   └── middleware/
│   │       └── adminAuth.ts     # Admin session middleware
│   └── package.json
│
└── plan.md                      # This file
```

---

## Image Upload Flow (Server-side)

When a user uploads an image for use in i2i or i2v:

1. Frontend sends image file to **our Express server** (`POST /api/upload/image`)
2. Express selects an available Pixverse account
3. Express calls `GET /creative_platform/getUploadToken` with that account's token → gets `Ak`, `Sk`, `Token`
4. Express initiates multipart upload to Alibaba OSS (`POST pixverse-fe-upload.oss-accelerate.aliyuncs.com/upload/{uuid}.png?uploads=`)
5. Express uploads image in ~2.5MB chunks as PUT parts
6. Express completes multipart upload (POST with XML part list + ETags)
7. Express calls `POST /creative_platform/media/batch_upload_media` to register in Pixverse
8. Response gives us `id`, `url`, `path` → save to `uploaded_images` table
9. Return `{ imageId, url, path }` to frontend
10. Frontend shows uploaded image preview in Image Selector Modal

---

## Generation Flow — End to End

### Video Model Mapping (Frontend display name → Pixverse internal model)

| What user sees | What frontend sends to our backend | What backend sends to Pixverse |
|---|---|---|
| Veo 3.1 | `"Veo 3.1"` | `pixverse-c1` |
| Veo 3.1 Fast | `"Veo 3.1 Fast"` | `v6` |
| Veo 3.1 Standard | `"Veo 3.1 Standard"` | `v5.6` |

**Rule:** The frontend NEVER sends `v6`, `pixverse-c1`, or `v5.6` to our backend. It always sends the user-facing display name. Our Express backend's `modelMap` converts it before calling Pixverse. This hides Pixverse from the user entirely.

**Aspect ratios by display model:**
- Veo 3.1 (pixverse-c1): `1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3`
- Veo 3.1 Fast (v6): `1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9`
- Veo 3.1 Standard (v5.6): `1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3`

### Example: User generates a video

1. User fills prompt, selects "Video" tab, picks `Veo 3.1 Fast`, `540p`, `9:16`, `10s`
2. Clicks **Generate**
3. Frontend: `POST /api/generate/video` with `{ prompt, model: "Veo 3.1 Fast", quality: "540p", aspectRatio: "9:16", duration: 10 }`
4. Express maps `"Veo 3.1 Fast"` → `v6` internally, creates a `generation_jobs` row with `status: queued`
5. Job is pushed to **SD Video Queue** (because 540p = SD)
6. Returns `{ jobId, queuePosition }` to frontend
7. Frontend subscribes to Socket.io room `job:{jobId}`
8. Frontend shows queue badge: **"You are #X in queue"**

**Queue Worker picks up the job:**
9. `accountManager.selectAccount("sd")` → picks account with free slot
10. Increment `active_generations` for that account
11. Call `POST /creative_platform/video/t2v` with account token
12. Get back `video_id` from Pixverse
13. Call `asset/library/list` immediately → save `video_url`, `video_path`, `webp_url` to DB
14. Start polling `account/message` every 5s
15. Update job status → `processing`, emit Socket.io event `job:processing`
16. When `video_id` appears in `video_list` → job done!
17. Update DB: `status: completed`, `result_url`, `completed_at`
18. Decrement `active_generations` for account
19. Emit Socket.io: `job:completed` with `{ url, webp_url }`
20. Frontend shows the video to the user automatically

---

## Admin Panel Features

### Pixverse Accounts Upload
- Admin uploads the JSON file (same format as `pixverse_accounts_upload_example.json`)
- Backend processes each account:
  - Calls credits API → saves `total_credits`, `high_quality_times`
  - Tests token (if expired → re-login and save new token)
  - Upserts into `pixverse_accounts` table
- Admin sees live table of all accounts with status

### Queue Settings
- Admin can set max concurrency for each queue (saved to `queue_settings` table)
- Workers read these settings dynamically (check DB before processing each batch)

### Dashboard Metrics
- Total jobs today / this week
- Active queue sizes (live via Socket.io)
- Per-account usage (credits consumed, HD times used)
- Total visitors (tracked via anonymous session cookie)
- Active visitors (sessions with activity in last 5 minutes)

---

## SEO Strategy

### Target Keywords
- `VEO 3 Free Unlimited`
- `Free AI Video Generator`
- `Free AI Image Generator Online`
- `AI Video Generator No Login`
- `Generate AI Videos Free`

### Technical SEO
- **Next.js SSG** for landing page → instant Google indexing
- `sitemap.xml` auto-generated
- `robots.txt` configured
- Canonical URLs on all pages
- Open Graph + Twitter Card tags on every page
- JSON-LD `WebApplication` schema on landing page
- Page speed: lazy loading, optimized images, minimal JS on landing
- Core Web Vitals optimized

### Content SEO
- FAQ section on landing page (rich answers for featured snippets)
- `H1`: "VEO 3 Free Unlimited AI Generator"
- `H2` sections: "Generate AI Videos Free", "Free AI Image Generator", "No Login Required"

---

## Anonymous User System

No login required for users. Each user gets:
- A `session_id` cookie (UUID, 30-day expiry) set on first visit
- Their generated content is tied to this session
- Gallery shows their content across sessions on same device

---

## Security

- Admin panel protected by username/password → session cookie (bcrypt + express-session)
- Rate limiting on generation endpoints (e.g., max 10 pending jobs per session)
- Pixverse tokens and passwords stored in DB (not .env) since admin manages them dynamically
- CORS configured to allow only our frontend domain

---

## Environment Variables

```
DATABASE_URL=            # PostgreSQL connection string
REDIS_URL=               # Redis connection string (for BullMQ)
ADMIN_SECRET=            # Initial admin password seed
SESSION_SECRET=          # Express session secret
NEXT_PUBLIC_API_URL=     # Express backend URL (for frontend)
NEXT_PUBLIC_SOCKET_URL=  # Socket.io server URL
```

---

## Build Order (Implementation Phases)

### Phase 1 — Backend Core
1. Express server setup + PostgreSQL schema
2. Redis + BullMQ queue setup (3 queues)
3. Pixverse account manager (select, lock, unlock, token refresh)
4. Pixverse API client (login, credits, t2i, i2i, t2v, i2v, polling)
5. OSS multipart image upload service
6. Socket.io integration

### Phase 2 — Admin Panel
7. Admin auth (login + session)
8. Account JSON upload + processing
9. Queue settings management
10. Dashboard stats + live queue viewer

### Phase 3 — Frontend Studio
11. Next.js setup with proper SEO metadata
12. Landing page (full SEO content)
13. Studio page with canvas/gallery area
14. Prompt Input Container (tabs, settings, generate button)
15. Image Selector Modal (uploaded + created tabs)
16. Real-time generation cards (Socket.io)
17. Queue position badge

### Phase 4 — Polish
18. Gallery page
19. sitemap.xml, robots.txt
20. Error handling + retry logic
21. Rate limiting
22. Mobile responsive design
