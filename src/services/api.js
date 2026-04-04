/**
 * API Service
 * ===========
 * Central HTTP client for all communication with the Flask backend.
 * Handles JWT token storage/refresh, request formatting, and error handling.
 * 
 * Uses expo-secure-store for token persistence (encrypted on-device storage).
 */

import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config';

// ─────────────────────────────────────────────
// Token Management
// ─────────────────────────────────────────────

const TOKEN_KEY = 'joaccess_access_token';
const REFRESH_TOKEN_KEY = 'joaccess_refresh_token';
const USER_KEY = 'joaccess_user';

/**
 * Store both tokens securely on the device.
 */
export async function storeTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Retrieve the stored access token.
 */
export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Retrieve the stored refresh token.
 */
export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Store user data as JSON string.
 */
export async function storeUser(user) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Retrieve stored user data.
 */
export async function getStoredUser() {
  try {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Clear all stored auth data (logout).
 */
export async function clearAuth() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// ─────────────────────────────────────────────
// HTTP Helper
// ─────────────────────────────────────────────

/**
 * Make an authenticated API request.
 * Automatically includes the JWT Bearer token in the Authorization header.
 * If the token is expired (401), attempts to refresh it once and retry.
 * 
 * @param {string} endpoint - Path relative to API_BASE (e.g. '/locations')
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} - The parsed JSON response
 * @throws {object} - { status, message, data } on error
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Build headers
  const headers = {
    ...(options.headers || {}),
  };

  // Only set Content-Type to JSON if we're not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach the JWT token if available
  const token = await getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  // If body is a plain object, stringify it (unless it's FormData)
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && typeof fetchOptions.body === 'object') {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw {
      status: 0,
      message: 'Network error. Please check your connection and server URL.',
      data: null,
    };
  }

  // If 401, try refreshing the token
  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request with the new token
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      fetchOptions.headers = headers;

      try {
        response = await fetch(url, fetchOptions);
      } catch (networkError) {
        throw {
          status: 0,
          message: 'Network error after token refresh.',
          data: null,
        };
      }
    }
  }

  // Parse the response
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.error || data?.message || `Request failed (${response.status})`,
      data,
    };
  }

  return data;
}

/**
 * Attempt to refresh the access token using the refresh token.
 * @returns {boolean} true if refresh succeeded
 */
async function tryRefreshToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      return true;
    }
  } catch {
    // Refresh failed — user needs to re-login
  }

  return false;
}

// ─────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  await storeTokens(data.access_token, data.refresh_token);
  await storeUser(data.user);

  return data;
}

export async function signup(userData) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: userData,
  });
}

export async function getMe() {
  return apiRequest('/auth/me');
}

// ─────────────────────────────────────────────
// LOCATIONS API
// ─────────────────────────────────────────────

export async function getLocations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.feature) params.append('feature', filters.feature);
  if (filters.verified !== undefined) params.append('verified', filters.verified);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const endpoint = `/locations${queryString ? `?${queryString}` : ''}`;

  return apiRequest(endpoint);
}

export async function getLocation(locationId) {
  return apiRequest(`/locations/${locationId}`);
}

export async function createLocation(locationData) {
  return apiRequest('/locations', {
    method: 'POST',
    body: locationData,
  });
}

export async function updateLocation(locationId, locationData) {
  return apiRequest(`/locations/${locationId}`, {
    method: 'PUT',
    body: locationData,
  });
}

export async function deleteLocation(locationId) {
  return apiRequest(`/locations/${locationId}`, {
    method: 'DELETE',
  });
}

export async function getMyLocations() {
  return apiRequest('/my-locations');
}

// ─────────────────────────────────────────────
// REVIEWS API
// ─────────────────────────────────────────────

export async function addReview(locationId, rating, comment) {
  return apiRequest(`/locations/${locationId}/reviews`, {
    method: 'POST',
    body: { rating, comment },
  });
}

export async function deleteReview(reviewId, reason = null) {
  const body = reason ? { reason } : {};
  return apiRequest(`/reviews/${reviewId}`, {
    method: 'DELETE',
    body,
  });
}

// ─────────────────────────────────────────────
// REPORTS API
// ─────────────────────────────────────────────

export async function reportLocation(locationId, reason, description) {
  return apiRequest(`/locations/${locationId}/report`, {
    method: 'POST',
    body: { reason, description },
  });
}

// ─────────────────────────────────────────────
// CHATBOT API
// ─────────────────────────────────────────────

export async function sendChatMessage(message, lang = 'en') {
  return apiRequest('/chatbot', {
    method: 'POST',
    body: { message, lang },
  });
}

// ─────────────────────────────────────────────
// ACCESSIBILITY SETTINGS API
// ─────────────────────────────────────────────

export async function getAccessibilitySettings() {
  return apiRequest('/accessibility-settings');
}

export async function updateAccessibilitySettings(settings) {
  return apiRequest('/accessibility-settings', {
    method: 'PUT',
    body: settings,
  });
}
