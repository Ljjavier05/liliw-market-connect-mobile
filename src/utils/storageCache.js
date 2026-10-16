import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'LMC_CACHE_';

/**
 * Stores data in persistent AsyncStorage with a timestamp.
 */
export async function setCache(key, data) {
  try {
    const record = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
  } catch (err) {
    console.warn(`[storageCache] setCache failed for ${key}:`, err);
  }
}

/**
 * Reads cached data from AsyncStorage.
 * Returns null if not found or corrupted.
 */
export async function getCache(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const record = JSON.parse(raw);
    return record?.data ?? null;
  } catch (err) {
    console.warn(`[storageCache] getCache failed for ${key}:`, err);
    return null;
  }
}

/**
 * Helper to wrap an API fetch with offline caching:
 * 1. Attempts remote API call.
 * 2. On success: saves response to cache and returns it.
 * 3. On failure (offline / network error / timeout): retrieves cached data if available.
 */
export async function fetchWithOfflineCache(cacheKey, apiFn) {
  try {
    const result = await apiFn();
    if (result !== undefined && result !== null) {
      // Async background save so it doesn't block UI
      setCache(cacheKey, result).catch(() => {});
    }
    return result;
  } catch (err) {
    // If network failure (no response from server, timeout, DNS failure)
    const isNetworkError = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('Network');
    if (isNetworkError) {
      const cached = await getCache(cacheKey);
      if (cached !== null && cached !== undefined) {
        console.log(`[Offline Mode] Returning cached data for: ${cacheKey}`);
        return cached;
      }
    }
    throw err;
  }
}
