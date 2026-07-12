import api, { setStoredToken, clearStoredToken } from './api';

/**
 * Vendor-only auth service — mirrors backend /api/auth + /api/users password flows.
 */

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  await setStoredToken(res.data.token);
  return res.data;
}

/**
 * Register a VENDOR account.
 * Backend requires confirmPassword — always send it.
 */
export async function register({ name, email, password, confirmPassword, phone, address }) {
  const res = await api.post('/auth/register', {
    name,
    email,
    password,
    confirmPassword,
    phone: phone || undefined,
    address: address || undefined,
    role: 'VENDOR',
  });
  await setStoredToken(res.data.token);
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

/** Client-side logout — backend has no logout endpoint. */
export async function logout() {
  await clearStoredToken();
}

export async function forgotPassword(email) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const res = await api.post('/auth/reset-password', { email, otp, newPassword });
  return res.data;
}
