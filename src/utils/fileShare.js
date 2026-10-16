import * as FileSystem from 'expo-file-system';
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
    const localUri = `${FileSystem.cacheDirectory}${Date.now()}_${cleanFilename}`;

    const downloadRes = await FileSystem.downloadAsync(fileUrl, localUri);
    if (downloadRes.status < 200 || downloadRes.status >= 300) {
      Alert.alert('Download error', 'Could not fetch file from the server.');
      return;
    }

    const isPdf = cleanFilename.toLowerCase().endsWith('.pdf');
    await Sharing.shareAsync(downloadRes.uri, {
      dialogTitle: `Share / Save ${suggestedFilename}`,
      mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
      UTI: isPdf ? 'com.adobe.pdf' : 'public.jpeg',
    });
  } catch (err) {
    console.error('shareOrSaveFile error:', err);
    Alert.alert('Sharing failed', 'Unable to share or save file at this moment.');
  }
}
