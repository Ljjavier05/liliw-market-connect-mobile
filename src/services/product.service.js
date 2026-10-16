import { API_BASE_URL } from '../config/env';
import { getStoredToken } from './api';
import api from './api';
import { fetchWithOfflineCache } from '../utils/storageCache';

export async function getCategories() {
  return fetchWithOfflineCache('market_categories', async () => {
    const res = await api.get('/categories');
    return Array.isArray(res.data) ? res.data : res.data?.categories || [];
  });
}

/** Products come nested under GET /vendors/me */
export async function getMyProducts() {
  return fetchWithOfflineCache('vendor_products', async () => {
    try {
      const res = await api.get('/vendors/me');
      return res.data?.products || [];
    } catch (err) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  });
}

export async function getMyVendorStatus() {
  return fetchWithOfflineCache('vendor_status', async () => {
    try {
      const res = await api.get('/vendors/me');
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  });
}

function appendFields(fd, fields) {
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (key === 'images') return;
    if (value != null && value !== '') fd.append(key, String(value));
  });
}

/** Backend expects multer field name `images` (up to 5). */
function appendImageFiles(fd, images) {
  (images || []).forEach((file, index) => {
    if (!file?.uri) return;
    fd.append('images', {
      uri: file.uri,
      name: file.name || `product-${index + 1}.jpg`,
      type: file.type || 'image/jpeg',
    });
  });
}

async function multipart(method, path, formData) {
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
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

/**
 * @param {object} fields - name, description, price, stock, categoryId, priceUnit, isActive
 * @param {Array<{uri:string,name?:string,type?:string}>} [images]
 */
export async function createProduct(fields, images = []) {
  const fd = new FormData();
  appendFields(fd, fields);
  appendImageFiles(fd, images);
  return multipart('POST', '/products', fd);
}

/**
 * @param {string} id
 * @param {object} fields
 * @param {Array<{uri:string,name?:string,type?:string}>} [images] - if provided, replaces all product images
 */
export async function updateProduct(id, fields, images) {
  const fd = new FormData();
  appendFields(fd, fields);
  if (images?.length) appendImageFiles(fd, images);
  return multipart('PUT', `/products/${id}`, fd);
}

export async function toggleProduct(id, isActive) {
  return updateProduct(id, { isActive: String(!isActive) });
}

export async function deleteProduct(id) {
  const res = await api.delete(`/products/${id}`);
  return res.data;
}
