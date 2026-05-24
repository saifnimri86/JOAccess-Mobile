import EncryptedStorage from 'react-native-encrypted-storage';
import { getApiBase } from '../config';
import { cacheLocations, getCachedLocations } from './cache';

const TOKEN_KEY = 'joaccess_access_token';
const REFRESH_TOKEN_KEY = 'joaccess_refresh_token';
const USER_KEY = 'joaccess_user';

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

async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBase()}${endpoint}`;
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
    const response = await fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      await EncryptedStorage.setItem(TOKEN_KEY, data.access_token);
      return true;
    }
  } catch { }
  return false;
}

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


export async function changeUsername(newUsername) {
  return apiRequest('/auth/change-username', {
    method: 'PUT',
    body: { new_username: newUsername },
  });
}

// returns { available, username }; throws on transport error
export async function checkUsernameAvailable(username) {
  return apiRequest(`/auth/check-username?username=${encodeURIComponent(username)}`);
}

export async function changePassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'PUT',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}


// network-first; falls back to cache on transport failure with _fromCache marker.
export async function getLocations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.feature) params.append('feature', filters.feature);
  if (filters.verified !== undefined) params.append('verified', filters.verified);
  if (filters.search) params.append('search', filters.search);
  const queryString = params.toString();

  try {
    const data = await apiRequest(`/locations${queryString ? `?${queryString}` : ''}`);
    await cacheLocations(data);
    return data;
  } catch (err) {
    // only fall back on transport errors — 4xx/5xx should surface
    if (err && err.status === 0) {
      const cached = await getCachedLocations();
      if (cached && cached.locations) {
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

export async function reportLocation(locationId, reason, description) {
  return apiRequest(`/locations/${locationId}/report`, {
    method: 'POST',
    body: { reason, description },
  });
}

// location: { enabled, lat?, lng? }. lat/lng only sent when enabled and finite.
export async function sendChatMessage(message, lang = 'en', location) {
  const body = { message, lang };
  const enabled = !!(location && location.enabled);
  body.location_enabled = enabled;
  if (
    enabled &&
    location &&
    typeof location.lat === 'number' && Number.isFinite(location.lat) &&
    typeof location.lng === 'number' && Number.isFinite(location.lng)
  ) {
    body.lat = location.lat;
    body.lng = location.lng;
  }
  return apiRequest('/chatbot', { method: 'POST', body });
}

export async function getAccessibilitySettings() {
  return apiRequest('/accessibility-settings');
}

export async function updateAccessibilitySettings(settings) {
  return apiRequest('/accessibility-settings', { method: 'PUT', body: settings });
}
