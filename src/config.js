// other modules must read api/uploads base through the getters below.
// the legacy API_BASE/UPLOADS_BASE constants capture env at module load
// and may be stale before initBackendEnv() resolves.

import Config from 'react-native-config';
import EncryptedStorage from 'react-native-encrypted-storage';

export const PROD_BASE_URL = 'https://joaccess-backend.onrender.com';
export const STAGING_BASE_URL = 'https://joaccess-staging.onrender.com';

const BACKEND_ENV_KEY = 'joaccess_backend_env';
const URLS = { prod: PROD_BASE_URL, staging: STAGING_BASE_URL };

let _env = 'prod';

export function getBackendEnv() {
  return _env;
}

export function getApiBase() {
  return `${URLS[_env] || PROD_BASE_URL}/api/v1`;
}

export function getUploadsBase() {
  return `${getApiBase()}/uploads`;
}

// legacy constants captured at module load — new code should use the getters above
export const API_BASE = `${URLS[_env]}/api/v1`;
export const UPLOADS_BASE = `${API_BASE}/uploads`;

// reads persisted env and sets active backend. safe to call multiple times.
export async function initBackendEnv() {
  try {
    const saved = await EncryptedStorage.getItem(BACKEND_ENV_KEY);
    if (saved === 'staging' || saved === 'prod') {
      _env = saved;
    }
  } catch {
  }
  return _env;
}

// load like LanguageContext does so a missing native module doesn't crash eval.
// falls back to DevSettings.reload() in setBackendEnvAndRestart.
let RNRestart = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  RNRestart = require('react-native-restart')?.default || require('react-native-restart');
} catch {
  RNRestart = null;
}

// persist env and reload so module-level constants re-evaluate.
export async function setBackendEnvAndRestart(env) {
  const next = env === 'staging' ? 'staging' : 'prod';
  await EncryptedStorage.setItem(BACKEND_ENV_KEY, next);
  _env = next;

  if (RNRestart && typeof RNRestart.Restart === 'function') {
    try { RNRestart.Restart(); return true; } catch {}
  }
  if (RNRestart && typeof RNRestart.restart === 'function') {
    try { RNRestart.restart(); return true; } catch {}
  }
  try {
    const { DevSettings } = require('react-native');
    if (DevSettings && typeof DevSettings.reload === 'function') {
      DevSettings.reload('Backend env changed');
      return true;
    }
  } catch {}
  return false;
}

export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const MAP_TILE_ATTRIBUTION = '© OpenStreetMap contributors © CARTO';

export const JORDAN_CENTER = { lat: 31.9539, lng: 35.9106 };
export const JORDAN_BOUNDS = {
  south: 28.5,
  west: 34.0,
  north: 34.0,
  east: 40.0,
};
export const DEFAULT_ZOOM = 8;

export const GOOGLE_PLACES_API_KEY = Config.GOOGLE_MAPS_API_KEY;

export default {
  API_BASE,
  UPLOADS_BASE,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  JORDAN_CENTER,
  JORDAN_BOUNDS,
  DEFAULT_ZOOM,
  GOOGLE_PLACES_API_KEY,
};
