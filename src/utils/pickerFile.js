import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';

const b64Lookup = new Uint8Array(256);
const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < b64Chars.length; i++) {
  b64Lookup[b64Chars.charCodeAt(i)] = i;
}

/**
 * Decode Base64 string to Uint8Array without external dependencies.
 */
function base64ToUint8Array(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const placeHolders = clean.charAt(len - 2) === '=' ? 2 : clean.charAt(len - 1) === '=' ? 1 : 0;
  const bytes = new Uint8Array((len * 3) / 4 - placeHolders);
  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = b64Lookup[clean.charCodeAt(i)];
    const b = b64Lookup[clean.charCodeAt(i + 1)];
    const c = b64Lookup[clean.charCodeAt(i + 2)];
    const d = b64Lookup[clean.charCodeAt(i + 3)];
    bytes[j++] = (a << 2) | (b >> 4);
    if (j < bytes.length) bytes[j++] = ((b & 15) << 4) | (c >> 2);
    if (j < bytes.length) bytes[j++] = ((c & 3) << 6) | (d & 63);
  }
  return bytes;
}

/**
 * Read raw bytes for any URI (file://, content://, cache, etc.)
 * Compatible with modern Expo File API, Legacy FileSystem, and Blob fetch.
 */
export async function readFileBytes(uri) {
  if (!uri) return new Uint8Array(0);

  // 1. Try modern Expo File API (fast native stream)
  try {
    const f = new ExpoFile(uri);
    if (typeof f.bytes === 'function') {
      const data = await f.bytes();
      if (data && data.length > 0) return data;
    }
  } catch (_) {
    // Continue to fallback
  }

  // 2. Try legacy FileSystem API (supports content:// and file://)
  try {
    if (typeof LegacyFileSystem?.readAsStringAsync === 'function') {
      const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
        encoding: LegacyFileSystem.EncodingType?.Base64 || 'base64',
      });
      if (base64) {
        return base64ToUint8Array(base64);
      }
    }
  } catch (_) {
    // Continue to fallback
  }

  // 3. Fallback: fetch local URI as blob
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (_) {}

  return new Uint8Array(0);
}

/**
 * Creates a file part that satisfies BOTH:
 * 1. Modern Expo WinterCG fetch (requires 'bytes' method on object or File/Blob)
 * 2. Classic React Native FormData / XMLHttpRequest (requires 'uri', 'name', 'type')
 */
export function createUploadPart(file, fallbackName = 'upload.jpg') {
  if (!file?.uri) return null;

  let uri = file.uri;
  if (Platform.OS === 'android' && uri.startsWith('/')) {
    uri = `file://${uri}`;
  }

  const name = file.name || fallbackName;
  const type = file.type || 'image/jpeg';

  return {
    uri,
    name,
    type,
    bytes: async () => readFileBytes(uri),
  };
}

/**
 * Safely appends an upload file to FormData ensuring compatibility
 * across Expo fetch and classic React Native networking.
 */
export function appendFormDataFile(fd, fieldName, file, fallbackName) {
  if (!file?.uri) return;
  const part = createUploadPart(file, fallbackName || file.name || `${fieldName}.jpg`);
  if (part) {
    fd.append(fieldName, part);
  }
}

/**
 * Normalize an expo-image-picker or expo-document-picker asset
 * into a FormData-friendly file object.
 * Supports JPEG, PNG, WebP, and PDF documents.
 */
export function pickerAssetToUploadFile(asset, fallbackName = 'receipt_proof') {
  if (!asset?.uri) return null;

  let uri = asset.uri;
  if (Platform.OS === 'android' && uri.startsWith('/')) {
    uri = `file://${uri}`;
  }

  // Derive original filename and extension
  const assetName = asset.name || '';
  const uriPath = uri.split('?')[0];
  const uriExt = (uriPath.split('.').pop() || '').toLowerCase();
  const nameExt = (assetName.split('.').pop() || '').toLowerCase();

  // Check if it's a PDF
  const isPdf =
    asset.mimeType === 'application/pdf' ||
    nameExt === 'pdf' ||
    uriExt === 'pdf';

  let ext = 'jpg';
  let mime = 'image/jpeg';

  if (isPdf) {
    ext = 'pdf';
    mime = 'application/pdf';
  } else if (nameExt === 'png' || uriExt === 'png') {
    ext = 'png';
    mime = 'image/png';
  } else if (nameExt === 'webp' || uriExt === 'webp') {
    ext = 'webp';
    mime = 'image/webp';
  } else {
    ext = 'jpg';
    mime = asset.mimeType || 'image/jpeg';
  }

  // Preserve user-selected filename if valid, else construct from fallback
  let finalName = assetName;
  if (!finalName || !finalName.includes('.')) {
    const base = fallbackName.includes('.')
      ? fallbackName.replace(/\.[^.]+$/, '')
      : fallbackName;
    finalName = `${base}.${ext}`;
  } else {
    // Ensure proper extension
    if (!finalName.toLowerCase().endsWith(`.${ext}`)) {
      finalName = `${finalName.replace(/\.[^.]+$/, '')}.${ext}`;
    }
  }

  return {
    uri,
    name: finalName,
    type: mime,
    bytes: async () => readFileBytes(uri),
  };
}
