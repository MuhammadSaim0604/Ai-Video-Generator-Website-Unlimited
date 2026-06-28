const axios = require('axios');
const { PIXVERSE_BASE_URL, PIXVERSE_HEADERS_BASE } = require('../constants/models');

const debugLog = (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); };

function buildHeaders(token, extra = {}) {
  return {
    ...PIXVERSE_HEADERS_BASE,
    'token': token,
    'workspace-id': '0',
    ...extra,
  };
}

function logPixverseError(label, err) {
  if (err.response) {
    console.error(`[Pixverse:${label}] HTTP ${err.response.status} — Response body:`, JSON.stringify(err.response.data));
    console.error(`[Pixverse:${label}] Request URL:`, err.config?.url);
    console.error(`[Pixverse:${label}] Request body:`, err.config?.data);
  } else {
    console.error(`[Pixverse:${label}] Network error:`, err.message);
  }
}

async function login(email, password) {
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/login`,
      { Username: email, Password: password },
      {
        headers: {
          ...PIXVERSE_HEADERS_BASE,
          'content-type': 'application/json',
          'error': 'return',
        },
      }
    );
    if (res.data.ErrCode !== 0) throw new Error(`Login failed: ${res.data.ErrMsg}`);
    return res.data.Resp.Result;
  } catch (err) {
    logPixverseError('login', err);
    throw err;
  }
}

async function getCredits(token) {
  try {
    const res = await axios.get(`${PIXVERSE_BASE_URL}/user/credits`, {
      headers: buildHeaders(token),
    });
    if (res.data.ErrCode === 10005) throw new Error('Token expired or invalid');
    if (res.data.ErrCode !== 0) throw new Error(`Credits fetch failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('getCredits', err);
    throw err;
  }
}

async function getWorkspaceCredits(token) {
  try {
    const res = await axios.get(`${PIXVERSE_BASE_URL}/team/workspace/list`, {
      headers: buildHeaders(token),
    });
    if (res.data.ErrCode !== 0) throw new Error(`Workspace fetch failed: ${res.data.ErrMsg}`);
    const personal = res.data.Resp.workspaces.find((w) => w.type === 'personal');
    return personal ? personal.credits : 0;
  } catch (err) {
    logPixverseError('getWorkspaceCredits', err);
    throw err;
  }
}

async function getUploadToken(token) {
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/getUploadToken`,
      null,
      { headers: buildHeaders(token) }
    );
    if (res.data.ErrCode !== 0) throw new Error(`Upload token failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('getUploadToken', err);
    throw err;
  }
}

async function batchUploadMedia(token, images) {
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/media/batch_upload_media`,
      { images },
      { headers: buildHeaders(token, { 'content-type': 'application/json' }) }
    );
    if (res.data.ErrCode !== 0) throw new Error(`Batch upload failed: ${res.data.ErrMsg}`);
    return res.data.Resp.result;
  } catch (err) {
    logPixverseError('batchUploadMedia', err);
    throw err;
  }
}

async function generateT2I(token, { prompt, model, quality, aspect_ratio, seed, credit_change }) {
  const body = {
    prompt,
    model,
    create_count: 1,
    seed: parseInt(seed) || Math.floor(Math.random() * 2147483647),
    quality,
    aspect_ratio,
    credit_change,
  };
  debugLog('[Pixverse:t2i] Request body:', JSON.stringify(body));
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/image/t2i`,
      body,
      {
        headers: buildHeaders(token, {
          'content-type': 'application/json',
          'refresh': 'credit',
        }),
      }
    );
    if (res.data.ErrCode !== 0) throw new Error(`T2I failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('t2i', err);
    throw err;
  }
}

async function generateI2I(token, { prompt, model, quality, aspect_ratio, seed, credit_change, customer_img_paths }) {
  const body = {
    customer_img_paths,
    prompt,
    model,
    create_count: 1,
    seed: parseInt(seed) || Math.floor(Math.random() * 2147483647),
    quality,
    aspect_ratio,
    credit_change,
  };
  debugLog('[Pixverse:i2i] Request body:', JSON.stringify(body));
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/image/i2i`,
      body,
      {
        headers: buildHeaders(token, {
          'content-type': 'application/json',
          'refresh': 'credit',
        }),
      }
    );
    if (res.data.ErrCode !== 0) throw new Error(`I2I failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('i2i', err);
    throw err;
  }
}

async function generateT2V(token, { prompt, model, quality, aspect_ratio, duration, seed }) {
  const body = {
    prompt,
    model,
    create_count: 1,
    audio: 1,
    quality,
    aspect_ratio,
    duration: parseInt(duration),
    seed: parseInt(seed) || Math.floor(Math.random() * 2147483647),
    credit_change: 75,
  };
  debugLog('[Pixverse:t2v] Request body:', JSON.stringify(body));
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/video/t2v`,
      body,
      {
        headers: buildHeaders(token, {
          'content-type': 'application/json',
          'refresh': 'credit',
        }),
      }
    );
    if (res.data.ErrCode !== 0) throw new Error(`T2V failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('t2v', err);
    throw err;
  }
}

async function generateI2V(token, { prompt, model, quality, duration, seed, customer_img_path }) {
  const body = {
    customer_img_path,
    prompt,
    model,
    create_count: 1,
    quality,
    duration: parseInt(duration),
    audio: 1,
    seed: parseInt(seed) || Math.floor(Math.random() * 2147483647),
    credit_change: 75,
  };
  debugLog('[Pixverse:i2v] Request body:', JSON.stringify(body));
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/video/i2v`,
      body,
      {
        headers: buildHeaders(token, {
          'content-type': 'application/json',
          'refresh': 'credit',
        }),
      }
    );
    if (res.data.ErrCode !== 0) throw new Error(`I2V failed: ${res.data.ErrMsg}`);
    return res.data.Resp;
  } catch (err) {
    logPixverseError('i2v', err);
    throw err;
  }
}

async function getAssetLibrary(token, tab) {
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - 7 * 24 * 60 * 60;
  const endTime = now + 86400;

  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/asset/library/list`,
      {
        tab,
        asset_source: 1,
        folder_id: 0,
        offset: 0,
        limit: 50,
        sort_order: '',
        filter: { start_time: startTime, end_time: endTime },
        current: 1,
        web_offset: 0,
        app_offset: 0,
      },
      {
        headers: buildHeaders(token, { 'content-type': 'application/json' }),
      }
    );
    if (res.data.ErrCode !== 0) return [];
    return res.data.Resp.data || [];
  } catch (err) {
    logPixverseError('assetLibrary', err);
    return [];
  }
}

async function pollAccountMessage(token) {
  try {
    const res = await axios.post(
      `${PIXVERSE_BASE_URL}/account/message`,
      {},
      {
        headers: buildHeaders(token, {
          'content-type': 'application/json',
          'error': 'no',
        }),
      }
    );
    if (res.data.ErrCode !== 0) return { video_list: [], image_list: [] };
    return res.data.Resp;
  } catch (err) {
    logPixverseError('pollMessage', err);
    return { video_list: [], image_list: [] };
  }
}

function isAuthError(err) {
  if (err.response) {
    const httpStatus = err.response.status;
    // console.error(`[Pixverse:isAuthError] HTTP ${httpStatus} — Response body:`, JSON.stringify(err.response.data));
    const errCode = err.response.data?.ErrCode;
    return (
      httpStatus === 401 ||
      httpStatus === 403 ||
      errCode === 401 ||
      errCode === 403 ||
      errCode === 40001 ||
      errCode === 40003
    );
  }
  return false;
}

module.exports = {
  login,
  getCredits,
  getWorkspaceCredits,
  getUploadToken,
  batchUploadMedia,
  generateT2I,
  generateI2I,
  generateT2V,
  generateI2V,
  getAssetLibrary,
  pollAccountMessage,
  isAuthError,
};
