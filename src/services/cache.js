// uses EncryptedStorage for consistency with auth/a11y storage.
// tile caching is handled by the WebView itself — this file is JSON only.

import EncryptedStorage from 'react-native-encrypted-storage';

const LOCATIONS_KEY   = 'joaccess_cache_locations_v1';
const TIMESTAMP_KEY   = 'joaccess_cache_locations_ts_v1';

// best-effort write; failures are non-fatal
export async function cacheLocations(locations) {
  if (!Array.isArray(locations)) return;
  try {
    await EncryptedStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    await EncryptedStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    if (__DEV__) console.warn('cacheLocations failed', err);
  }
}

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

export async function clearLocationsCache() {
  try {
    await EncryptedStorage.removeItem(LOCATIONS_KEY);
    await EncryptedStorage.removeItem(TIMESTAMP_KEY);
  } catch {}
}

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
