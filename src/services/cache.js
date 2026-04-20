/**
 * Offline Cache Service
 * =====================
 * A thin wrapper over react-native-encrypted-storage for caching:
 *
 *   1. The last-fetched locations list (for offline map markers)
 *   2. The timestamp of the last successful fetch (shown in the UI as
 *      "Last updated: 2h ago")
 *
 * Tile caching is handled separately by the WebView itself — we set
 * cacheEnabled and cacheMode on the WebView and pre-bundle a small
 * Jordan-overview dataset. This file only handles JSON blobs.
 *
 * Why EncryptedStorage and not AsyncStorage?
 *   Consistency — the rest of the app already uses EncryptedStorage for
 *   JWT tokens. Adding AsyncStorage would be a second native dependency
 *   for no clear benefit. EncryptedStorage's size limit (~2MB per key on
 *   Android) is more than enough for ~1000 locations worth of JSON.
 *
 * API:
 *   cacheLocations(locations)  — writes the list + timestamp
 *   getCachedLocations()       — { locations, lastUpdated } | null
 *   clearLocationsCache()      — wipes both keys
 *
 * Keys are namespaced under `joaccess_cache_*` so they don't collide with
 * auth tokens or a11y settings.
 */

import EncryptedStorage from 'react-native-encrypted-storage';

const LOCATIONS_KEY   = 'joaccess_cache_locations_v1';
const TIMESTAMP_KEY   = 'joaccess_cache_locations_ts_v1';

/**
 * Persist a fresh list of locations along with the current timestamp.
 * Failures are swallowed silently — caching is best-effort, never required.
 *
 * @param {Array} locations — the raw API response for GET /locations
 */
export async function cacheLocations(locations) {
  if (!Array.isArray(locations)) return;
  try {
    await EncryptedStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    await EncryptedStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    // Storage full, value too big, etc. — not critical.
    if (__DEV__) console.warn('cacheLocations failed', err);
  }
}

/**
 * Retrieve the most recently cached locations.
 *
 * @returns {Promise<{ locations: Array, lastUpdated: number } | null>}
 */
export async function getCachedLocations() {
  try {
    const raw = await EncryptedStorage.getItem(LOCATIONS_KEY);
    if (!raw) return null;
    const tsRaw = await EncryptedStorage.getItem(TIMESTAMP_KEY);
    return {
      locations: JSON.parse(raw),
      lastUpdated: tsRaw ? Number(tsRaw) : null,
    };
  } catch (err) {
    if (__DEV__) console.warn('getCachedLocations failed', err);
    return null;
  }
}

/**
 * Wipe both keys. Called from the Settings "Clear cache" button in Phase 2.
 */
export async function clearLocationsCache() {
  try {
    await EncryptedStorage.removeItem(LOCATIONS_KEY);
    await EncryptedStorage.removeItem(TIMESTAMP_KEY);
  } catch {}
}

/**
 * Human-readable "X ago" formatter for the last-updated pill.
 * Used by the map screen's offline banner.
 *
 * @param {number} timestamp — ms since epoch
 * @param {'en' | 'ar'} lang
 * @returns {string}
 */
export function formatAgo(timestamp, lang = 'en') {
  if (!timestamp) return lang === 'ar' ? 'غير معروف' : 'unknown';
  const sec = Math.floor((Date.now() - timestamp) / 1000);

  const table = lang === 'ar'
    ? [
        { limit: 60,     text: 'الآن' },
        { limit: 3600,   fn: (s) => `قبل ${Math.floor(s / 60)} دقيقة` },
        { limit: 86400,  fn: (s) => `قبل ${Math.floor(s / 3600)} ساعة` },
        { limit: Infinity, fn: (s) => `قبل ${Math.floor(s / 86400)} يوم` },
      ]
    : [
        { limit: 60,     text: 'just now' },
        { limit: 3600,   fn: (s) => `${Math.floor(s / 60)}m ago` },
        { limit: 86400,  fn: (s) => `${Math.floor(s / 3600)}h ago` },
        { limit: Infinity, fn: (s) => `${Math.floor(s / 86400)}d ago` },
      ];

  for (const row of table) {
    if (sec < row.limit) return row.text ?? row.fn(sec);
  }
  return '';
}
