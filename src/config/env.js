/**
 * API base URL for the Liliw Market Connect backend.
 *
 * Physical phone must use your PC's LAN IP (not localhost / 10.0.2.2).
 * - Android emulator: http://10.0.2.2:5000/api
 * - iOS simulator:    http://localhost:5000/api
 * - Physical device:  http://<your-LAN-IP>:5000/api
 */
export const API_BASE_URL = 'http://192.168.100.114:5000/api';

/** Origin used to build /uploads image URLs (no /api suffix). */
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
