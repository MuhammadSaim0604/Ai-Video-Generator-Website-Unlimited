CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pixverse_accounts (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  password TEXT NOT NULL,
  token TEXT,
  account_id BIGINT,
  invite_code TEXT,
  total_credits INT DEFAULT 0,
  remaining_credits INT DEFAULT 0,
  high_quality_times INT DEFAULT 0,
  active_generations INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queue_settings (
  id SERIAL PRIMARY KEY,
  image_concurrency INT DEFAULT 10,
  sd_video_concurrency INT DEFAULT 5,
  hd_video_concurrency INT DEFAULT 3,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id SERIAL PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('image', 'sd_video', 'hd_video')),
  mode TEXT NOT NULL CHECK (mode IN ('t2i', 'i2i', 't2v', 'i2v')),
  display_model TEXT,
  internal_model TEXT,
  prompt TEXT,
  quality TEXT,
  aspect_ratio TEXT,
  duration INT,
  seed BIGINT,
  audio INT DEFAULT 1,
  customer_img_path TEXT,
  customer_img_paths TEXT[],
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  pixverse_account_id INT REFERENCES pixverse_accounts(id),
  pixverse_job_id TEXT,
  result_url TEXT,
  result_path TEXT,
  webp_url TEXT,
  thumbnail_url TEXT,
  error_msg TEXT,
  queue_position INT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pixverse_image_id BIGINT,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  file_name TEXT,
  width INT,
  height INT,
  uploaded_via_account INT REFERENCES pixverse_accounts(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_analytics (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE DEFAULT CURRENT_DATE,
  total_visitors INT DEFAULT 0,
  total_images_generated INT DEFAULT 0,
  total_videos_generated INT DEFAULT 0,
  total_hd_videos_generated INT DEFAULT 0,
  total_sd_videos_generated INT DEFAULT 0
);

INSERT INTO queue_settings (image_concurrency, sd_video_concurrency, hd_video_concurrency)
  SELECT 10, 5, 3
  WHERE NOT EXISTS (SELECT 1 FROM queue_settings);


CREATE INDEX IF NOT EXISTS idx_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_type ON generation_jobs(queue_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_user ON uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
