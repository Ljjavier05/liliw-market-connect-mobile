import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const NOTIFIED_KEYS = 'liliw_notified_alert_keys';

/**
 * Expo Go on Android no longer supports remote push (SDK 51+).
 * Calling push APIs throws a red Console Error — so we skip OS notifications there
 * and rely on in-app Alerts (bell) instead.
 */
function isExpoGoAndroid() {
  return Constants.appOwnership === 'expo' && Platform.OS === 'android';
}

export function canUseOsNotifications() {
  return !isExpoGoAndroid();
}

let Notifications = null;
let handlerReady = false;

function getNotifications() {
  if (isExpoGoAndroid()) return null;
  if (!Notifications) {
    // Lazy require so Expo Go Android never loads push token code paths
    Notifications = require('expo-notifications');
  }
  return Notifications;
}

function ensureHandler() {
  const N = getNotifications();
  if (!N || handlerReady) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  handlerReady = true;
}

export async function ensureNotificationPermissions() {
  if (isExpoGoAndroid()) return false;

  try {
    ensureHandler();
    const N = getNotifications();
    if (!N) return false;

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('liliw-alerts', {
        name: 'Market Alerts',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0050d8',
      });
    }

    const current = await N.getPermissionsAsync();
    if (current.status === 'granted') return true;

    const asked = await N.requestPermissionsAsync();
    return asked.status === 'granted';
  } catch {
    return false;
  }
}

export async function getNotifiedKeys() {
  try {
    const raw = await SecureStore.getItemAsync(NOTIFIED_KEYS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveNotifiedKeys(keys) {
  const unique = [...new Set(keys)].slice(-100);
  await SecureStore.setItemAsync(NOTIFIED_KEYS, JSON.stringify(unique));
}

export async function presentLocalNotification({ title, body, data = {} }) {
  if (isExpoGoAndroid()) return null;

  try {
    const ok = await ensureNotificationPermissions();
    if (!ok) return null;

    const N = getNotifications();
    if (!N) return null;

    return N.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'liliw-alerts' } : {}),
      },
      trigger: null,
    });
  } catch {
    return null;
  }
}

/**
 * Fire local notifications only for alert keys not yet notified.
 * First run establishes a baseline (no spam for existing issues).
 * On Expo Go Android this only updates keys — in-app Alerts still work.
 */
export async function notifyNewAlerts(alerts) {
  const previous = await getNotifiedKeys();
  const prevSet = new Set(previous);
  const alertKeys = (alerts || []).map((a) => a.key).filter(Boolean);

  if (previous.length === 0 && alertKeys.length > 0) {
    await saveNotifiedKeys(alertKeys);
    return alertKeys;
  }

  const nextKeys = [...previous];
  for (const alert of alerts || []) {
    if (!alert?.key || prevSet.has(alert.key)) continue;
    await presentLocalNotification({
      title: alert.title,
      body: alert.message,
      data: { type: alert.type, target: alert.target, key: alert.key },
    });
    nextKeys.push(alert.key);
    prevSet.add(alert.key);
  }

  await saveNotifiedKeys(nextKeys);
  return nextKeys;
}

export function addNotificationResponseListener(handler) {
  if (isExpoGoAndroid()) {
    return { remove() {} };
  }

  try {
    ensureHandler();
    const N = getNotifications();
    if (!N) return { remove() {} };
    return N.addNotificationResponseReceivedListener(handler);
  } catch {
    return { remove() {} };
  }
}
