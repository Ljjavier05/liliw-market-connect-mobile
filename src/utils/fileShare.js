import { File as ExpoFile, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * Downloads a remote file (image/PDF) to device cache and opens the
 * native system share/save sheet so the vendor can save to gallery/files or share.
 */
export async function shareOrSaveFile(fileUrl, suggestedFilename = 'receipt.jpg') {
  try {
    if (!fileUrl) {
      Alert.alert('File not found', 'No document URL is available to share.');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert('Not supported on web', 'Please view on a mobile device to share/save.');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
      return;
    }

    const cleanFilename = suggestedFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestampedName = `${Date.now()}_${cleanFilename}`;

    let localUri = null;

    // 1. Try modern Expo File API (Expo SDK 54+)
    try {
      if (typeof ExpoFile?.downloadFileAsync === 'function' && Paths?.cache) {
        const destFile = new ExpoFile(Paths.cache, timestampedName);
        const downloadedFile = await ExpoFile.downloadFileAsync(fileUrl, destFile, { idempotent: true });
        if (downloadedFile?.uri) {
          localUri = downloadedFile.uri;
        }
      }
    } catch (modernErr) {
      console.warn('Modern File.downloadFileAsync failed, trying legacy:', modernErr);
    }

    // 2. Fallback to Legacy FileSystem API (expo-file-system/legacy)
    if (!localUri) {
      try {
        if (typeof LegacyFileSystem?.downloadAsync === 'function') {
          const cacheDir = LegacyFileSystem.cacheDirectory || '';
          const targetUri = `${cacheDir}${timestampedName}`;
          const downloadRes = await LegacyFileSystem.downloadAsync(fileUrl, targetUri);
          if (downloadRes?.uri && (downloadRes.status == null || (downloadRes.status >= 200 && downloadRes.status < 300))) {
            localUri = downloadRes.uri;
          }
        }
      } catch (legacyErr) {
        console.warn('LegacyFileSystem.downloadAsync failed:', legacyErr);
      }
    }

    if (!localUri) {
      Alert.alert('Download error', 'Could not fetch file from the server.');
      return;
    }

    const isPdf = cleanFilename.toLowerCase().endsWith('.pdf');
    await Sharing.shareAsync(localUri, {
      dialogTitle: `Share / Save ${suggestedFilename}`,
      mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
      UTI: isPdf ? 'com.adobe.pdf' : 'public.jpeg',
    });
  } catch (err) {
    console.error('shareOrSaveFile error:', err);
    Alert.alert('Sharing failed', 'Unable to share or save file at this moment.');
  }
}
