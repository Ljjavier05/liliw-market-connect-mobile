import api, { setStoredToken, clearStoredToken } from './api';

/**
 * Vendor-only auth service — mirrors backend /api/auth + /api/users password flows.
 */

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  await setStoredToken(res.data.token);
  return res.data;
}

/** Step 1: send registration OTP via Email or SMS */
export async function registerSendOtp(payload) {
  const res = await api.post('/auth/register/send-otp', {
    ...payload,
    role: 'VENDOR',
    channel: payload.channel === 'EMAIL' ? 'EMAIL' : 'SMS',
  });
  return res.data;
}

/** Step 2: verify OTP and create account (no auto-login) */
export async function registerVerify(payload) {
  const res = await api.post('/auth/register/verify', payload);
  return res.data;
}

/** @deprecated Use registerSendOtp + registerVerify */
export async function register(payload) {
  return registerSendOtp(payload);
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

/** Client-side logout — backend has no logout endpoint. */
export async function logout() {
  await clearStoredToken();
}

export async function forgotPassword(email, channel = 'SMS', phone) {
  const body = {
    email,
    channel: channel === 'EMAIL' ? 'EMAIL' : 'SMS',
  };
  if (body.channel === 'SMS' && phone) {
    body.phone = phone;
  }
  const res = await api.post('/auth/forgot-password', body);
  return res.data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const res = await api.post('/auth/reset-password', { email, otp, newPassword });
  return res.data;
}
