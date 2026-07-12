import { Platform } from 'react-native';

/**
 * Normalize an expo-image-picker asset into a FormData-friendly file object.
 * Android needs a proper scheme; missing/odd mime types break multer silently.
 */
export function pickerAssetToUploadFile(asset, fallbackName = 'upload.jpg') {
  if (!asset?.uri) return null;

  let uri = asset.uri;
  if (Platform.OS === 'android' && uri.startsWith('/')) {
    uri = `file://${uri}`;
  }

  const rawExt = (uri.split('?')[0].split('.').pop() || '').toLowerCase();
  const ext = rawExt === 'png' || rawExt === 'webp' || rawExt === 'jpg' || rawExt === 'jpeg'
    ? rawExt === 'jpeg'
      ? 'jpg'
      : rawExt
    : 'jpg';

  const mime =
    asset.mimeType ||
    (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

  const base = fallbackName.includes('.') ? fallbackName.replace(/\.[^.]+$/, '') : fallbackName;

  return {
    uri,
    name: `${base}.${ext === 'jpg' ? 'jpg' : ext}`,
    type: mime,
  };
}
