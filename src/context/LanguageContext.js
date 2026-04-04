/**
 * Language Context
 * ================
 * Provides bilingual (EN/AR) support to the entire app.
 * Persists language choice using SecureStore.
 * 
 * Usage in components:
 *   const { lang, isRTL, t, toggleLanguage } = useLanguage();
 *   <Text style={isRTL && { textAlign: 'right' }}>{t('login')}</Text>
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import translations from '../utils/translations';

const LanguageContext = createContext(null);

const LANG_KEY = 'joaccess_language';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en'); // 'en' or 'ar'
  const [isReady, setIsReady] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const saved = await SecureStore.getItemAsync(LANG_KEY);
      if (saved === 'ar' || saved === 'en') {
        setLang(saved);
      }
    } catch {
      // Default to 'en'
    } finally {
      setIsReady(true);
    }
  }

  /**
   * Toggle between English and Arabic.
   * Persists the choice and updates RTL layout direction.
   */
  async function toggleLanguage() {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    await SecureStore.setItemAsync(LANG_KEY, newLang);

    // Update RTL layout direction
    // Note: On React Native, changing I18nManager.forceRTL requires an app restart
    // to take full effect. For this version, we handle RTL via styles.
    I18nManager.forceRTL(newLang === 'ar');
    I18nManager.allowRTL(newLang === 'ar');
  }

  /**
   * Set language explicitly.
   */
  async function setLanguage(newLang) {
    if (newLang !== 'en' && newLang !== 'ar') return;
    setLang(newLang);
    await SecureStore.setItemAsync(LANG_KEY, newLang);
    I18nManager.forceRTL(newLang === 'ar');
    I18nManager.allowRTL(newLang === 'ar');
  }

  /**
   * Translate a key. Returns the string for the current language.
   * If the key doesn't exist in translations, returns the key itself.
   * 
   * @param {string} key - The translation key (e.g. 'login', 'wheelchair_ramp')
   * @returns {string} The translated string
   */
  function t(key) {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }

  /**
   * Get the localized text for a location field.
   * For example, getLocalized(location, 'name') returns location.name_ar in Arabic.
   * 
   * @param {object} obj - Object with both EN and AR fields
   * @param {string} field - Base field name (e.g. 'name', 'description', 'address')
   * @returns {string} The appropriate language version
   */
  function getLocalized(obj, field) {
    if (!obj) return '';
    if (lang === 'ar') {
      return obj[`${field}_ar`] || obj[field] || '';
    }
    return obj[field] || obj[`${field}_ar`] || '';
  }

  const isRTL = lang === 'ar';

  const value = {
    lang,
    isRTL,
    isReady,
    t,
    getLocalized,
    toggleLanguage,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language state and translation functions.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
