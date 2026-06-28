const VIDEO_MODEL_MAP = {
  'Veo 3.1': 'pixverse-c1',
  'Veo 3.1 Fast': 'v6',
  'Veo 3.1 Standard': 'v5.6',
};

const VIDEO_ASPECT_RATIOS = {
  'pixverse-c1': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
  'v6': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'],
  'v5.6': ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
};

const VIDEO_DISPLAY_MODELS = Object.keys(VIDEO_MODEL_MAP);

const IMAGE_QUALITY_MAP = {
  '720p': '720p',
  '1080p': '1080p',
  '2K': '1440p',
  '4K': '2160p',
};

const IMAGE_ASPECT_RATIOS = {
  'qwen-image': ['1:1', '16:9', '9:16', '4:3', '3:4', '5:4', '4:5', '3:2', '2:3', '21:9'],
  'seedream-4.0': ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '5:4', '4:5', '3:2', '2:3', '21:9'],
};

const IMAGE_RESOLUTIONS = {
  'qwen-image': ['720p', '1080p'],
  'seedream-4.0': ['1080p', '2K', '4K'],
};

const IMAGE_CREDITS = {
  'qwen-image': { '720p': 5, '1080p': 10 },
  'seedream-4.0': { '1080p': 10, '2K': 10, '4K': 10 },
};

const VIDEO_RESOLUTIONS = ['360p', '540p', '720p', '1080p'];

const SD_RESOLUTIONS = ['360p', '540p'];
const HD_RESOLUTIONS = ['720p', '1080p'];

const PIXVERSE_BASE_URL = 'https://app-api.pixverse.ai/creative_platform';
const OSS_BASE_URL = 'https://pixverse-fe-upload.oss-accelerate.aliyuncs.com';

const PIXVERSE_HEADERS_BASE = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'x-platform': 'Web',
  'workspace-id': '0',
  'x-marketing-email-consent': 'true',
};

module.exports = {
  VIDEO_MODEL_MAP,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DISPLAY_MODELS,
  IMAGE_QUALITY_MAP,
  IMAGE_ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  IMAGE_CREDITS,
  VIDEO_RESOLUTIONS,
  SD_RESOLUTIONS,
  HD_RESOLUTIONS,
  PIXVERSE_BASE_URL,
  OSS_BASE_URL,
  PIXVERSE_HEADERS_BASE,
};
