import api from './api';
import { fetchWithOfflineCache } from '../utils/storageCache';

/**
 * Fetch announcements published by Admin/Treasurer for Vendors and Public.
 * GET /announcements (cached offline for market connectivity)
 */
export async function getAnnouncements() {
  return fetchWithOfflineCache('municipal_announcements', async () => {
    try {
      const res = await api.get('/announcements');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching announcements:', err);
      return [];
    }
  });
}
