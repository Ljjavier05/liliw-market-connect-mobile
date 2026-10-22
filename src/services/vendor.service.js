import { API_BASE_URL } from '../config/env';
import { getStoredToken } from './api';
import api from './api';
import { fetchWithOfflineCache } from '../utils/storageCache';
import { appendFormDataFile } from '../utils/pickerFile';

/** GET /vendors/me — returns null when profile not created yet (404). */
export async function getMyVendor() {
  return fetchWithOfflineCache('vendor_me', async () => {
    try {
      const res = await api.get('/vendors/me');
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  });
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
  appendFormDataFile(fd, fieldName, file, `${fieldName}.jpg`);
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

async function postMultipart(path, formData, method = 'POST') {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
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
  return fetchWithOfflineCache('vendor_violations', async () => {
    const res = await api.get('/violations/my');
    return Array.isArray(res.data) ? res.data : res.data?.violations || [];
  });
}

/** GET /stall-rents/my — rents list only (dashboard-friendly). */
export async function getMyRents() {
  return fetchWithOfflineCache('vendor_rents', async () => {
    const res = await api.get('/stall-rents/my');
    return Array.isArray(res.data) ? res.data : res.data?.rents || [];
  });
}

/** Full stall-rent payload including Market Office GCash. */
export async function getMyRentsBundle() {
  return fetchWithOfflineCache('vendor_rents_bundle', async () => {
    const res = await api.get('/stall-rents/my');
    if (Array.isArray(res.data)) {
      return { rents: res.data, officeGcash: { number: null, accountName: null } };
    }
    return {
      rents: res.data?.rents || [],
      officeGcash: res.data?.officeGcash || { number: null, accountName: null },
    };
  });
}

/** POST /stall-rents/:id/proof (multipart) */
export async function uploadRentProof(rentId, file, fields = {}) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  appendImageFile(fd, 'proof', file);
  return postMultipart(`/stall-rents/${rentId}/proof`, fd);
}

/** GET /utility-bills/my */
export async function getMyUtilityBills(type) {
  return fetchWithOfflineCache(`vendor_utility_bills_${type || 'all'}`, async () => {
    const res = await api.get('/utility-bills/my', {
      params: type ? { type } : undefined,
    });
    return {
      bills: res.data?.bills || [],
      officeGcash: res.data?.officeGcash || { number: null, accountName: null },
    };
  });
}

/** POST /utility-bills/:id/proof (multipart) */
export async function uploadUtilityProof(billId, file, fields = {}) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  appendImageFile(fd, 'proof', file);
  return postMultipart(`/utility-bills/${billId}/proof`, fd);
}

/**
 * Unified fetch for both Stall Rents and Utility Bills (Water & Electricity)
 * Exactly mirrors the web vendor Stall Rent & Dues module.
 */
export async function getMyUnifiedDues() {
  const [rentsRes, utilitiesRes] = await Promise.all([
    api.get('/stall-rents/my'),
    api.get('/utility-bills/my'),
  ]);

  const rentPayload = rentsRes.data;
  const rawRents = Array.isArray(rentPayload) ? rentPayload : rentPayload.rents || [];
  const vendorInfo = rentPayload.vendor || null;

  const utilityPayload = utilitiesRes.data;
  const rawUtilities = Array.isArray(utilityPayload) ? utilityPayload : utilityPayload.bills || [];

  const normalizedRents = rawRents.map((r) => ({
    id: r.id,
    category: 'STALL_RENT',
    categoryLabel: 'Stall Rent',
    periodLabel: r.periodLabel,
    amount: Number(r.amount) || 0,
    dueDate: r.dueDate,
    paidDate: r.paidDate,
    status: r.status,
    notes: r.notes,
    proofUrl: r.proofUrl,
    proofUploadedAt: r.proofUploadedAt,
    payments: r.payments || [],
    officialReceipt: r.payments?.[0]?.receipts?.[0] || null,
    endpoint: `/stall-rents/${r.id}/proof`,
  }));

  const normalizedUtilities = rawUtilities.map((u) => ({
    id: u.id,
    category: u.type, // 'WATER' | 'ELECTRICITY'
    categoryLabel: u.type === 'WATER' ? 'Water Bill' : 'Electricity Bill',
    periodLabel: u.periodLabel,
    amount: Number(u.amount) || 0,
    dueDate: u.dueDate,
    paidDate: u.paidDate,
    status: u.status,
    notes: u.notes,
    proofUrl: u.proofUrl,
    proofUploadedAt: u.proofUploadedAt,
    payments: u.payments || [],
    officialReceipt: u.payments?.[0]?.receipts?.[0] || null,
    endpoint: `/utility-bills/${u.id}/proof`,
  }));

  const combined = [...normalizedRents, ...normalizedUtilities].sort(
    (a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0)
  );

  return {
    items: combined,
    vendor: vendorInfo,
  };
}

/** GET /payments/my */
export async function getMyPayments() {
  return fetchWithOfflineCache('vendor_payments', async () => {
    const res = await api.get('/payments/my');
    return res.data;
  });
}

/** POST /payments/my (multipart) */
export async function submitPayment(fields, proofFile) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  if (proofFile) appendImageFile(fd, 'proof', proofFile);
  return postMultipart('/payments/my', fd);
}

/** GET /business-permits/my */
export async function getMyBusinessPermits() {
  return fetchWithOfflineCache('vendor_permits', async () => {
    const res = await api.get('/business-permits/my');
    return {
      permits: res.data?.permits || [],
      categories: res.data?.categories || [],
      vendor: res.data?.vendor || null,
      compliance: res.data?.compliance || null,
    };
  });
}

/** GET /business-permits/my/compliance */
export async function getPermitCompliance() {
  return fetchWithOfflineCache('vendor_compliance', async () => {
    const res = await api.get('/business-permits/my/compliance');
    return res.data;
  });
}

/** POST /business-permits/my (multipart) */
export async function submitBusinessPermit(fields, file) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  appendImageFile(fd, 'permitFile', file);
  return postMultipart('/business-permits/my', fd);
}

/** PUT /business-permits/my/:id (multipart) — renew / replace */
export async function replaceBusinessPermit(permitId, fields, file) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  if (file) appendImageFile(fd, 'permitFile', file);
  return postMultipart(`/business-permits/my/${permitId}`, fd, 'PUT');
}

/** PUT /business-permits/my/:id/renew (multipart) */
export async function renewBusinessPermit(permitId, fields, file) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') fd.append(key, String(value));
  });
  if (file) appendImageFile(fd, 'permitFile', file);
  return postMultipart(`/business-permits/my/${permitId}/renew`, fd, 'PUT');
}

/** GET /business-permit-applications/eligibility */
export async function getPermitApplicationEligibility() {
  const res = await api.get('/business-permit-applications/eligibility');
  return res.data;
}

/** GET /business-permit-applications/my */
export async function getMyPermitApplications() {
  const res = await api.get('/business-permit-applications/my');
  return {
    applications: res.data?.applications || [],
    eligible: Boolean(res.data?.eligible),
    gateMessage: res.data?.gateMessage || null,
    categories: res.data?.categories || [],
    businessTypes: res.data?.businessTypes || [],
  };
}

function appendPermitAppFields(fd, fields) {
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (typeof value === 'object' && value.uri) return;
    fd.append(key, String(value));
  });
}

function appendNamedFile(fd, fieldName, file) {
  if (!file?.uri) return;
  appendFormDataFile(fd, fieldName, file, `${fieldName}.jpg`);
}

/** POST /business-permit-applications/my */
export async function createPermitApplication(fields, files = {}) {
  const fd = new FormData();
  appendPermitAppFields(fd, fields);
  appendNamedFile(fd, 'governmentId', files.governmentId);
  appendNamedFile(fd, 'barangayClearance', files.barangayClearance);
  appendNamedFile(fd, 'dtiSecRegistration', files.dtiSecRegistration);
  (files.otherDocuments || []).forEach((f) => appendNamedFile(fd, 'otherDocuments', f));
  return postMultipart('/business-permit-applications/my', fd);
}

/** PUT /business-permit-applications/my/:id */
export async function updatePermitApplication(id, fields, files = {}) {
  const fd = new FormData();
  appendPermitAppFields(fd, fields);
  appendNamedFile(fd, 'governmentId', files.governmentId);
  appendNamedFile(fd, 'barangayClearance', files.barangayClearance);
  appendNamedFile(fd, 'dtiSecRegistration', files.dtiSecRegistration);
  (files.otherDocuments || []).forEach((f) => appendNamedFile(fd, 'otherDocuments', f));
  return postMultipart(`/business-permit-applications/my/${id}`, fd, 'PUT');
}

/** GET /stalls/available */
export async function getAvailableStalls() {
  const res = await api.get('/stalls/available');
  return Array.isArray(res.data) ? res.data : [];
}

/** GET /stalls/my — occupied / pending / history context */
export async function getMyStallContext() {
  const res = await api.get('/stalls/my');
  return res.data;
}

/** POST /stalls/requests */
export async function requestStall(stallId, notes) {
  const res = await api.post('/stalls/requests', {
    stallId,
    notes: notes || undefined,
  });
  return res.data;
}

/** POST /stalls/requests/:id/cancel */
export async function cancelStallRequest(requestId) {
  const res = await api.post(`/stalls/requests/${requestId}/cancel`);
  return res.data;
}

export async function getPricingInsights() {
  try {
    const res = await api.get('/vendors/pricing-insights');
    return res.data?.insights || [];
  } catch {
    return [];
  }
}

/** GET /notifications/my — SMS / office messages logged by backend */
export async function getMyNotifications(limit = 30) {
  const res = await api.get('/notifications/my', { params: { limit } });
  return Array.isArray(res.data) ? res.data : [];
}
