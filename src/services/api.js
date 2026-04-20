/**
 * API Service (Phase 1.5)
 * =======================
 * Same API surface as before, BUT `getLocations()` now has offline
 * fallback behavior:
 *
 *   1. Try network request as normal
 *   2. On success: cache the response + return it
 *   3. On network failure: return cached data if any, with a flag
 *
 * All other endpoints behave the same — they still throw on failure
 * because it wouldn't make sense to fake a login or a write.
 *
 * Auth token management, refresh flow, and all other endpoints are
 * unchanged from the original api.js.
 */

import EncryptedStorage from 'react-native-encrypted-storage';
import { API_BASE } from '../config';
import { cacheLocations, getCachedLocations } from './cache';

// ─────────────────────────────────────────────
// Token Management (unchanged)
// ─────────────────────────────────────────────
const TOKEN_KEY         = 'joaccess_access_token';
const REFRESH_TOKEN_KEY = 'joaccess_refresh_token';
const USER_KEY          = 'joaccess_user';

export async function storeTokens(accessToken, refreshToken) {
  await EncryptedStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    await EncryptedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function getAccessToken() {
  try { return await EncryptedStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function getRefreshToken() {
  try { return await EncryptedStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}

export async function storeUser(user) {
  await EncryptedStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser() {
  try {
    const data = await EncryptedStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function clearAuth() {
  await EncryptedStorage.removeItem(TOKEN_KEY);
  await EncryptedStorage.removeItem(REFRESH_TOKEN_KEY);
  await EncryptedStorage.removeItem(USER_KEY);
}

// ─────────────────────────────────────────────
// Core request helper (unchanged logic, just cleaner)
// ─────────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOptions = { ...options, headers };
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)
      && typeof fetchOptions.body === 'object') {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw { status: 0, message: 'Network error. Please check your connection.', data: null };
  }

  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      fetchOptions.headers = headers;
      try {
        response = await fetch(url, fetchOptions);
      } catch {
        throw { status: 0, message: 'Network error after token refresh.', data: null };
      }
    }
  }

  let data;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.error || data?.message || `Request failed (${response.status})`,
      data,
    };
  }

  return data;
}

async function tryRefreshToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      await EncryptedStorage.setItem(TOKEN_KEY, data.access_token);
      return true;
    }
  } catch {}
  return false;
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export async function login(email, password) {
  const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  await storeTokens(data.access_token, data.refresh_token);
  await storeUser(data.user);
  return data;
}

export async function signup(userData) {
  return apiRequest('/auth/signup', { method: 'POST', body: userData });
}

export async function getMe() {
  return apiRequest('/auth/me');
}

// ─────────────────────────────────────────────
// LOCATIONS — now with cache fallback
// ─────────────────────────────────────────────
/**
 * Fetch locations with optional filters.
 *
 * Network-first strategy:
 *   1. Try the API. If it works, cache and return fresh data.
 *   2. If network fails, return whatever's in the cache — the caller
 *      gets a `_fromCache: true` marker attached to the array so the
 *      UI can show a banner.
 *
 * Filters are sent to the API but ignored when falling back to cache —
 * the cached list contains everything, and the UI re-applies filters
 * client-side anyway (see MapScreen's filteredLocations useMemo).
 */
export async function getLocations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.feature)  params.append('feature',  filters.feature);
  if (filters.verified !== undefined) params.append('verified', filters.verified);
  if (filters.search)   params.append('search',   filters.search);
  const queryString = params.toString();

  try {
    const data = await apiRequest(`/locations${queryString ? `?${queryString}` : ''}`);
    // Success: write-through cache and return
    await cacheLocations(data);
    return data;
  } catch (err) {
    // Only fall back to cache on network errors (status 0). For 4xx/5xx we
    // want the UI to surface the real error instead of silently hiding it.
    if (err && err.status === 0) {
      const cached = await getCachedLocations();
      if (cached && cached.locations) {
        // Attach non-enumerable markers the UI can read
        const result = cached.locations.slice();
        result._fromCache = true;
        result._lastUpdated = cached.lastUpdated;
        return result;
      }
    }
    throw err;
  }
}

export async function getLocation(locationId) {
  return apiRequest(`/locations/${locationId}`);
}

export async function createLocation(locationData) {
  return apiRequest('/locations', { method: 'POST', body: locationData });
}

export async function updateLocation(locationId, locationData) {
  return apiRequest(`/locations/${locationId}`, { method: 'PUT', body: locationData });
}

export async function deleteLocation(locationId) {
  return apiRequest(`/locations/${locationId}`, { method: 'DELETE' });
}

export async function getMyLocations() {
  return apiRequest('/my-locations');
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────
export async function addReview(locationId, rating, comment) {
  return apiRequest(`/locations/${locationId}/reviews`, {
    method: 'POST',
    body: { rating, comment },
  });
}

export async function deleteReview(reviewId, reason = null) {
  return apiRequest(`/reviews/${reviewId}`, {
    method: 'DELETE',
    body: reason ? { reason } : {},
  });
}

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────
export async function reportLocation(locationId, reason, description) {
  return apiRequest(`/locations/${locationId}/report`, {
    method: 'POST',
    body: { reason, description },
  });
}

// ─────────────────────────────────────────────
// CHATBOT
// ─────────────────────────────────────────────
export async function sendChatMessage(message, lang = 'en') {
  return apiRequest('/chatbot', { method: 'POST', body: { message, lang } });
}

// ─────────────────────────────────────────────
// ACCESSIBILITY SETTINGS
// ─────────────────────────────────────────────
export async function getAccessibilitySettings() {
  return apiRequest('/accessibility-settings');
}

export async function updateAccessibilitySettings(settings) {
  return apiRequest('/accessibility-settings', { method: 'PUT', body: settings });
}
