import { SERVER_ORIGIN } from '../config/env';

/**
 * Build a full URL for files stored under /uploads.
 * Accepts: "abc.jpg" | "/uploads/abc.jpg" | "uploads/abc.jpg" | full http(s) URL
 */
export function uploadUrl(filename, cacheKey) {
  if (!filename) return null;

  let value = String(filename).trim();
  if (!value) return null;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return withCache(value, cacheKey);
  }

  // Normalize accidental prefixes from older data / web paths
  value = value.replace(/^\/+/, '');
  if (value.startsWith('uploads/')) {
    value = value.slice('uploads/'.length);
  }

  return withCache(`${SERVER_ORIGIN}/uploads/${value}`, cacheKey);
}

function withCache(url, cacheKey) {
  if (cacheKey == null || cacheKey === '') return url;
  const bust = encodeURIComponent(String(cacheKey));
  return `${url}${url.includes('?') ? '&' : '?'}v=${bust}`;
}
