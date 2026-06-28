const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const debugLog = (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); };

const BUCKET = "pixverse-fe-upload";
const OSS_BASE_URL = `https://${BUCKET}.oss-accelerate.aliyuncs.com`;
const CHUNK_SIZE = 2.5 * 1024 * 1024; // ~2.5 MB per part

// Must match exactly what we send in every request header
const OSS_USER_AGENT = "aliyun-sdk-js/6.23.0 Microsoft Edge 149.0.0.0 on Windows 10 64-bit";

/**
 * Build OSS V1 authorization header.
 *
 * Confirmed StringToSign format (from OSS error responses):
 *   HTTPMethod\n
 *   Content-MD5\n          (empty string if not present)
 *   Content-Type\n
 *   x-oss-date value\n     ← NOT empty; OSS uses x-oss-date here when no Date header sent
 *   CanonicalizedOSSHeaders (sorted x-oss-* headers, each "key:value\n")
 *   CanonicalizedResource  (/bucket/key?subresource)
 *
 * ALL x-oss-* headers sent in the request MUST be included in CanonicalizedOSSHeaders.
 */
function buildOssAuth(ak, sk, securityToken, method, contentType, contentMD5, ossDate, ossKey, subResource = "") {
  // Every x-oss-* header we send must appear here, sorted alphabetically
  const canonicalHeaders = [
    `x-oss-date:${ossDate}`,
    `x-oss-forbid-overwrite:true`,
    `x-oss-security-token:${securityToken}`,
    `x-oss-user-agent:${OSS_USER_AGENT}`,
  ]
    .sort()
    .join("\n") + "\n";

  const canonicalResource = `/${BUCKET}/${ossKey}${subResource ? "?" + subResource : ""}`;

  // When no Date header is sent, OSS uses the x-oss-date value in the Date position
  const stringToSign =
    method + "\n" +
    contentMD5 + "\n" +
    contentType + "\n" +
    ossDate + "\n" +          // ← use the actual x-oss-date value, not empty string
    canonicalHeaders +
    canonicalResource;

  debugLog(`[OSS:sign] StringToSign:\n${stringToSign}`);

  const signature = crypto
    .createHmac("sha1", sk)
    .update(stringToSign, "utf8")
    .digest("base64");

  return `OSS ${ak}:${signature}`;
}

function getOssDate() {
  return new Date().toUTCString();
}

function logOssError(label, err) {
  if (err.response) {
    console.error(`[OSS:${label}] HTTP ${err.response.status} — Response body:`, err.response.data);
    console.error(`[OSS:${label}] Request URL:`, err.config?.url);
    console.error(`[OSS:${label}] Request headers:`, JSON.stringify({
      authorization: err.config?.headers?.authorization?.substring(0, 80) + '...',
      'x-oss-date': err.config?.headers?.['x-oss-date'],
      'x-oss-security-token': err.config?.headers?.['x-oss-security-token']?.substring(0, 40) + '...',
      'content-type': err.config?.headers?.['content-type'],
    }));
  } else {
    console.error(`[OSS:${label}] Network error:`, err.message);
  }
}

/**
 * Upload a file buffer to Alibaba OSS using STS credentials from getUploadToken.
 * Returns { ossKey, ossUrl, fileUUID, originalFilename, fileSize }
 */
async function uploadToOss({ Ak, Sk, Token }, fileBuffer, originalFilename, mimeType = "image/png") {
  const ext = originalFilename.split(".").pop().toLowerCase() || "png";
  const fileUUID = uuidv4();
  const ossKey = `upload/${fileUUID}.${ext}`;
  const ossObjectUrl = `${OSS_BASE_URL}/${ossKey}`;

  debugLog(`[OSS] Starting multipart upload: ossKey=${ossKey} size=${fileBuffer.length} mimeType=${mimeType}`);

  // Build headers — every x-oss-* header here must also be in buildOssAuth's canonicalHeaders
  const commonHeaders = (auth, ossDate, contentType, extra = {}) => ({
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "access-control-allow-origin": "*",
    "authorization": auth,
    "cache-control": "no-cache",
    "content-type": contentType,
    "pragma": "no-cache",
    "x-oss-date": ossDate,
    "x-oss-forbid-overwrite": "true",
    "x-oss-security-token": Token,
    "x-oss-user-agent": OSS_USER_AGENT,
    ...extra,
  });

  // ── Step 1: Initiate multipart upload ──────────────────────────────────────
  const ossDate1 = getOssDate();
  const initAuth = buildOssAuth(Ak, Sk, Token, "POST", mimeType, "", ossDate1, ossKey, "uploads");

  let uploadId;
  try {
    const initRes = await axios.post(`${ossObjectUrl}?uploads=`, null, {
      headers: commonHeaders(initAuth, ossDate1, mimeType, { "content-length": "0" }),
      responseType: "text",
    });
    const uploadIdMatch = initRes.data.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) throw new Error("Failed to get OSS UploadId from: " + initRes.data);
    uploadId = uploadIdMatch[1];
    debugLog(`[OSS] Multipart initiated. UploadId=${uploadId}`);
  } catch (err) {
    logOssError("initiate", err);
    throw err;
  }

  // ── Step 2: Upload parts ────────────────────────────────────────────────────
  const parts = [];
  const totalParts = Math.ceil(fileBuffer.length / CHUNK_SIZE);
  debugLog(`[OSS] Uploading ${totalParts} part(s)...`);

  for (let i = 0; i < totalParts; i++) {
    const partNumber = i + 1;
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
    const chunk = fileBuffer.slice(start, end);

    const ossDate2 = getOssDate();
    const partSubResource = `partNumber=${partNumber}&uploadId=${uploadId}`;
    const partAuth = buildOssAuth(Ak, Sk, Token, "PUT", mimeType, "", ossDate2, ossKey, partSubResource);

    let etag;
    try {
      const partRes = await axios.put(
        `${ossObjectUrl}?partNumber=${partNumber}&uploadId=${uploadId}`,
        chunk,
        { headers: commonHeaders(partAuth, ossDate2, mimeType) }
      );
      etag = partRes.headers["etag"] || partRes.headers["ETag"];
      if (!etag) throw new Error(`No ETag returned for part ${partNumber}`);
      debugLog(`[OSS] Part ${partNumber}/${totalParts} uploaded. ETag=${etag}`);
    } catch (err) {
      logOssError(`part${partNumber}`, err);
      throw err;
    }

    parts.push({ partNumber, etag });
  }

  // ── Step 3: Complete multipart upload ────────────────────────────────────────
  const completionXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n` +
    parts
      .map((p) => `<Part>\n<PartNumber>${p.partNumber}</PartNumber>\n<ETag>${p.etag}</ETag>\n</Part>`)
      .join("\n") +
    `\n</CompleteMultipartUpload>`;

  const xmlBuffer = Buffer.from(completionXml, "utf8");
  const contentMD5 = crypto.createHash("md5").update(xmlBuffer).digest("base64");

  const ossDate3 = getOssDate();
  const completeAuth = buildOssAuth(
    Ak, Sk, Token, "POST", "application/xml", contentMD5, ossDate3, ossKey, `uploadId=${uploadId}`
  );

  try {
    await axios.post(`${ossObjectUrl}?uploadId=${uploadId}`, xmlBuffer, {
      headers: commonHeaders(completeAuth, ossDate3, "application/xml", { "content-md5": contentMD5 }),
      responseType: "text",
    });
    debugLog(`[OSS] Multipart upload completed. ossKey=${ossKey}`);
  } catch (err) {
    logOssError("complete", err);
    throw err;
  }

  return {
    ossKey,
    ossUrl: ossObjectUrl,
    fileUUID,
    originalFilename,
    fileSize: fileBuffer.length,
  };
}

module.exports = { uploadToOss };
