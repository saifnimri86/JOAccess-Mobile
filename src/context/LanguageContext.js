/**
 * Language Context (Phase 1.5 edits)
 * ==================================
 * Change from previous: when switching between LTR (English) and RTL
 * (Arabic), we now automatically reload the app bundle so the RN
 * I18nManager's native layout flip takes effect. Previously the user
 * had to manually restart.
 *
 * Two reload paths, tried in order:
 *   1. `react-native-restart` if installed — cleanest, true native restart
 *   2. `DevSettings.reload()` — works in debug builds, reloads the JS bundle
 *   3. fallback: show an alert (release builds without the restart lib)
 *
 * The fontFamily / colorBlindMode / high-contrast settings don't need a
 * reload — they're all pure JS state and re-render every consumer instantly.
 * Only RTL direction-change requires a full native relayout.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, DevSettings, Alert, Platform, NativeModules } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import translations from '../utils/translations';

const LanguageContext = createContext(null);
const LANG_KEY = 'joaccess_language';

/**
 * Read the device locale from the native side, trying several sources
 * because different Android builds populate different fields at startup.
 *
 * Sources, in order:
 *   1. Android: NativeModules.I18nManager.localeIdentifier   → "ar_JO"
 *   2. iOS:     NativeModules.SettingsManager.settings.AppleLocale
 *   3. iOS:     first of AppleLanguages                       → "ar-JO"
 *   4. Cross:   global Intl.DateTimeFormat().resolvedOptions().locale
 *               — works even before RN's native modules have warmed up
 *   5. Cross:   I18nManager.isRTL — weakest signal, but if the native
 *               side has flipped to RTL, we know the device is in a
 *               RTL language and Arabic is by far the most likely one
 *               for our user base
 *
 * Returns one of 'ar' | 'en'.
 */
function detectDeviceLanguage() {
  const candidates = [];

  // 1 & 2 & 3 — native modules
  try {
    if (Platform.OS === 'ios') {
      const s = NativeModules?.SettingsManager?.settings;
      if (s?.AppleLocale) candidates.push(s.AppleLocale);
      if (Array.isArray(s?.AppleLanguages) && s.AppleLanguages[0]) {
        candidates.push(s.AppleLanguages[0]);
      }
    } else {
      const v = NativeModules?.I18nManager?.localeIdentifier;
      if (v) candidates.push(v);
    }
  } catch {}

  // 4 — Intl API. This is a JS-native source and doesn't depend on RN's
  // native modules having warmed up yet. Very reliable on modern Hermes.
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const loc = Intl.DateTimeFormat().resolvedOptions()?.locale;
      if (loc) candidates.push(loc);
    }
  } catch {}

  // Test each candidate
  for (const raw of candidates) {
    const normalized = String(raw).toLowerCase().replace(/-/g, '_');
    if (normalized === 'ar' || normalized.startsWith('ar_')) return 'ar';
  }

  // 5 — last resort: if the native side already thinks we're in RTL,
  // Arabic is the most plausible choice for this app's target audience.
  if (I18nManager.isRTL) return 'ar';

  return 'en';
}

// Try to import react-native-restart. If not installed, the try/catch
// falls through and we use DevSettings.reload() instead.
let RNRestart = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  RNRestart = require('react-native-restart')?.default || require('react-native-restart');
} catch (e) {
  RNRestart = null;
}

/**
 * Reload the app. Falls through several strategies depending on what's
 * available. Always returns — never throws.
 */
function reloadApp() {
  // 1. react-native-restart — preferred (true native Activity restart)
  if (RNRestart && typeof RNRestart.Restart === 'function') {
    try {
      RNRestart.Restart();
      return true;
    } catch {}
  }
  if (RNRestart && typeof RNRestart.restart === 'function') {
    try {
      RNRestart.restart();
      return true;
    } catch {}
  }

  // 2. DevSettings.reload — works in debug mode always, and in release
  //    builds ONLY if the dev menu is still wired in. Ship this as a
  //    fallback but don't rely on it for production.
  if (DevSettings && typeof DevSettings.reload === 'function') {
    try {
      DevSettings.reload('Language changed');
      return true;
    } catch {}
  }

  return false;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const saved = await EncryptedStorage.getItem(LANG_KEY);

      // The saved value is ONLY written when the user explicitly picks a
      // language (see setLanguage below). So if it exists here, it's the
      // user's chosen language and we respect it. If it's absent — which
      // includes the first-install case — we always go through detection.
      //
      // Why not persist the detected value on first launch? Because Android
      // auto-backup can restore EncryptedStorage contents across reinstalls
      // (via cloud backup of app data), which breaks "detect on fresh
      // install" behaviour if we pre-populate the key. By keeping the key
      // empty until user action, we get re-detection on every reinstall
      // regardless of backup state.

      if (saved === 'ar' || saved === 'en') {
        // User previously picked a language — respect it over device locale.
        setLang(saved);
        const wantRTL = saved === 'ar';
        if (I18nManager.isRTL !== wantRTL) {
          I18nManager.allowRTL(wantRTL);
          I18nManager.forceRTL(wantRTL);
        }
      } else {
        // No saved user choice — detect device locale every time.
        const detected = detectDeviceLanguage();
        setLang(detected);

        const wantRTL = detected === 'ar';
        if (I18nManager.isRTL !== wantRTL) {
          I18nManager.allowRTL(wantRTL);
          I18nManager.forceRTL(wantRTL);

          // If the direction flipped, reload so RN lays out RTL correctly.
          // Without this the first-launch user sees LTR layout even though
          // lang === 'ar' until they manually restart the app.
          setTimeout(() => {
            reloadApp();
          }, 120);
        }
      }
    } catch {
      // default to 'en'
    } finally {
      setIsReady(true);
    }
  }

  /**
   * Switch language, persist, and reload the app if the RTL flag actually
   * changed. If we were already in the target direction (e.g., switching
   * en → en), just set state and skip the reload.
   */
  async function setLanguage(newLang) {
    if (newLang !== 'en' && newLang !== 'ar') return;
    if (newLang === lang) return;

    const wantRTL = newLang === 'ar';
    const directionChanged = I18nManager.isRTL !== wantRTL;

    await EncryptedStorage.setItem(LANG_KEY, newLang);
    setLang(newLang);

    if (directionChanged) {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);

      // Give the write a tick to flush and setState to commit
      setTimeout(() => {
        const reloaded = reloadApp();
        if (!reloaded) {
          Alert.alert(
            wantRTL ? 'إعادة تشغيل مطلوبة' : 'Restart required',
            wantRTL
              ? 'يرجى إعادة تشغيل التطبيق لتطبيق تغيير الاتجاه.'
              : 'Please close and reopen the app to apply the direction change.',
          );
        }
      }, 80);
    }
  }

  async function toggleLanguage() {
    return setLanguage(lang === 'en' ? 'ar' : 'en');
  }

  function t(key) {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }

  function getLocalized(obj, field) {
    if (!obj) return '';
    if (lang === 'ar') {
      return obj[`${field}_ar`] || obj[field] || '';
    }
    return obj[field] || obj[`${field}_ar`] || '';
  }

  const isRTL = lang === 'ar';

  const value = { lang, isRTL, isReady, t, getLocalized, toggleLanguage, setLanguage };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
