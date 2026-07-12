import { API_BASE_URL } from '../config/env';
import { getStoredToken } from './api';
import api from './api';

/** GET /vendors/me — returns null when profile not created yet (404). */
export async function getMyVendor() {
  try {
    const res = await api.get('/vendors/me');
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

/** GET /vendor-portal/status */
export async function getApplicationStatus() {
  try {
    const res = await api.get('/vendor-portal/status');
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

function appendStoreFields(fd, form) {
  Object.entries(form || {}).forEach(([key, value]) => {
    if (key === 'logo' || key === 'banner') return;
    if (value != null && value !== '') fd.append(key, String(value));
  });
}

function appendImageFile(fd, fieldName, file) {
  if (!file?.uri) return;
  // React Native FormData file part — uri/name/type required for multer
  fd.append(fieldName, {
    uri: file.uri,
    name: file.name || `${fieldName}.jpg`,
    type: file.type || 'image/jpeg',
  });
}

/**
 * Use fetch for multipart — more reliable than axios on React Native.
 */
async function putMultipart(path, formData) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Upload failed (${res.status})`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

async function postMultipart(path, formData) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Upload failed (${res.status})`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

/** POST /vendor-portal/apply (multipart) */
export async function submitVendorApplication(form, { logo } = {}) {
  const fd = new FormData();
  appendStoreFields(fd, form);
  fd.append('docTypes', JSON.stringify([]));
  appendImageFile(fd, 'logo', logo);
  return postMultipart('/vendor-portal/apply', fd);
}

/** PUT /vendors/me — only when APPROVED */
export async function updateVendorProfile(form, files = {}) {
  const fd = new FormData();
  appendStoreFields(fd, form);
  appendImageFile(fd, 'logo', files.logo);
  appendImageFile(fd, 'banner', files.banner);
  return putMultipart('/vendors/me', fd);
}

export async function getMyViolations() {
  const res = await api.get('/violations/my');
  return Array.isArray(res.data) ? res.data : res.data?.violations || [];
}

export async function getMyRents() {
  const res = await api.get('/stall-rents/my');
  return Array.isArray(res.data) ? res.data : res.data?.rents || [];
}

export async function getPricingInsights() {
  try {
    const res = await api.get('/vendors/pricing-insights');
    return res.data?.insights || [];
  } catch {
    return [];
  }
}
