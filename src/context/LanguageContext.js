// switching between LTR/RTL triggers a native reload so I18nManager's
// layout flip takes effect. only RTL direction change needs the reload.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, DevSettings, Alert, Platform, NativeModules } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import translations from '../utils/translations';

const LanguageContext = createContext(null);
const LANG_KEY = 'joaccess_language';

// returns 'ar' | 'en'. tries multiple sources because android builds
// populate different fields at startup.
function detectDeviceLanguage() {
  const candidates = [];

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

  // intl API doesn't depend on native modules being warm
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const loc = Intl.DateTimeFormat().resolvedOptions()?.locale;
      if (loc) candidates.push(loc);
    }
  } catch {}

  for (const raw of candidates) {
    const normalized = String(raw).toLowerCase().replace(/-/g, '_');
    if (normalized === 'ar' || normalized.startsWith('ar_')) return 'ar';
  }

  // last resort: if native side is in RTL, arabic is most plausible
  if (I18nManager.isRTL) return 'ar';

  return 'en';
}

let RNRestart = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  RNRestart = require('react-native-restart')?.default || require('react-native-restart');
} catch (e) {
  RNRestart = null;
}

function reloadApp() {
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

  // debug-mode fallback; not reliable in release builds
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

      // saved is only written on explicit user pick. left empty on fresh install
      // so android auto-backup can't restore a stale pick across reinstalls.

      if (saved === 'ar' || saved === 'en') {
        setLang(saved);
        const wantRTL = saved === 'ar';
        if (I18nManager.isRTL !== wantRTL) {
          I18nManager.allowRTL(wantRTL);
          I18nManager.forceRTL(wantRTL);
        }
      } else {
        const detected = detectDeviceLanguage();
        setLang(detected);

        const wantRTL = detected === 'ar';
        if (I18nManager.isRTL !== wantRTL) {
          I18nManager.allowRTL(wantRTL);
          I18nManager.forceRTL(wantRTL);

          // reload so RN lays out RTL correctly on first launch
          setTimeout(() => {
            reloadApp();
          }, 120);
        }
      }
    } catch {
    } finally {
      setIsReady(true);
    }
  }

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

      // let the write flush and setState commit
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
