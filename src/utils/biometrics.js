import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_TOKEN_KEY = 'lmc_biometric_token';
const BIOMETRIC_EMAIL_KEY = 'lmc_biometric_email';
const BIOMETRIC_ENABLED_KEY = 'lmc_biometric_enabled';

/**
 * Checks if the current device has biometric hardware and if the vendor
 * has enrolled fingerprints or Face ID.
 */
export async function getBiometricCapabilities() {
  if (Platform.OS === 'web') {
    return {
      supported: false,
      enrolled: false,
      label: 'Biometrics',
    };
  }

  try {
    const supported = await LocalAuthentication.hasHardwareAsync();
    if (!supported) {
      return { supported: false, enrolled: false, label: 'Biometrics' };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasFacial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

    let label = 'Fingerprint';
    if (hasFingerprint) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (hasFacial && Platform.OS === 'ios') {
      label = 'Face ID';
    } else if (hasFacial) {
      label = 'Face Unlock';
    }

    return {
      supported: true,
      enrolled,
      label,
    };
  } catch (err) {
    console.warn('[biometrics] check capabilities failed:', err);
    return { supported: false, enrolled: false, label: 'Biometrics' };
  }
}

/**
 * Triggers the native biometric dialog (fingerprint or face scan).
 */
export async function promptBiometricAuth(promptMessage = 'Scan your fingerprint to sign in') {
  if (Platform.OS === 'web') return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success === true;
  } catch (err) {
    console.warn('[biometrics] promptBiometricAuth failed:', err);
    return false;
  }
}

/**
 * Enables biometric login by securely persisting token and email in SecureStore.
 */
export async function enableBiometricLogin(token, email) {
  try {
    if (token) await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
    if (email) await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  } catch (err) {
    console.error('[biometrics] enableBiometricLogin failed:', err);
    return false;
  }
}

/**
 * Disables biometric login and cleans up biometric credentials.
 */
export async function disableBiometricLogin() {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    return true;
  } catch (err) {
    console.warn('[biometrics] disableBiometricLogin failed:', err);
    return false;
  }
}

/**
 * Returns true if the vendor previously enabled biometric login and credentials exist.
 */
export async function isBiometricLoginEnabled() {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (enabled !== 'true') return false;
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    return Boolean(token);
  } catch {
    return false;
  }
}

export async function getBiometricStoredToken() {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getBiometricStoredEmail() {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function updateBiometricTokenIfActive(newToken) {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (enabled === 'true' && newToken) {
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, newToken);
    }
  } catch {}
}
