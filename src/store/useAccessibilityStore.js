import { create } from 'zustand';
import { AccessibilityInfo } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as apiService from '../services/api';
import { buildTheme } from '../utils/theme';

const STORAGE_KEY = 'joaccess_a11y_settings_v3';

const DEFAULTS = {
  highContrast:    false,
  dyslexiaFont:    false,
  reducedMotion:   false,
  colorBlindMode:  'none',
  textSizePercent: 100,
  glassUI:         false,
};

export const useAccessibilityStore = create((set, get) => ({
  ...DEFAULTS,
  isReady: false,
  screenReaderEnabled: false,
  osReducedMotion: false,
  theme: buildTheme(DEFAULTS.highContrast, DEFAULTS.dyslexiaFont, DEFAULTS.colorBlindMode, DEFAULTS.glassUI),

  init: async () => {
    try {
      const raw = await EncryptedStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const theme = buildTheme(
          parsed.highContrast ?? DEFAULTS.highContrast,
          parsed.dyslexiaFont ?? DEFAULTS.dyslexiaFont,
          parsed.colorBlindMode ?? DEFAULTS.colorBlindMode,
          parsed.glassUI ?? DEFAULTS.glassUI
        );
        set({ ...parsed, theme });
      }
    } catch {
      // Keep defaults
    } finally {
      set({ isReady: true });
    }
  },

  syncServer: async (isAuthenticated) => {
    if (!isAuthenticated) return;
    try {
      const data = await apiService.getAccessibilitySettings();
      if (!data) return;
      const newHighContrast = data.highContrast ?? get().highContrast;
      const newDyslexiaFont = data.dyslexiaFont ?? get().dyslexiaFont;
      const newColorBlindMode = data.colorBlindMode ?? get().colorBlindMode;
      const newGlassUI = data.glassUI ?? get().glassUI;

      const merged = {
        highContrast:    newHighContrast,
        dyslexiaFont:    newDyslexiaFont,
        reducedMotion:   data.reducedMotion   ?? get().reducedMotion,
        colorBlindMode:  newColorBlindMode,
        textSizePercent: data.textSize        ?? get().textSizePercent,
        glassUI:         newGlassUI,
        theme: buildTheme(newHighContrast, newDyslexiaFont, newColorBlindMode, newGlassUI),
      };
      set(merged);
      await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // offline
    }
  },

  updateSettings: async (updates, { syncServer = true } = {}) => {
    const prevState = get();
    let changed = false;
    for (const k in updates) {
      if (prevState[k] !== updates[k]) { changed = true; break; }
    }
    if (!changed) return;

    const nextPartial = { ...prevState, ...updates };
    const nextTheme = buildTheme(nextPartial.highContrast, nextPartial.dyslexiaFont, nextPartial.colorBlindMode, nextPartial.glassUI);

    set({ ...updates, theme: nextTheme }); // Instant synchronous UI propagation via Zustand
    const nextState = {
      highContrast:    get().highContrast,
      dyslexiaFont:    get().dyslexiaFont,
      reducedMotion:   get().reducedMotion,
      colorBlindMode:  get().colorBlindMode,
      textSizePercent: get().textSizePercent,
      glassUI:         get().glassUI,
    };

    // Offload storage/api to next tick
    setTimeout(() => {
      EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)).catch(() => {});
      if (syncServer) {
        apiService.updateAccessibilitySettings({
          highContrast:    nextState.highContrast,
          dyslexiaFont:    nextState.dyslexiaFont,
          reducedMotion:   nextState.reducedMotion,
          colorBlindMode:  nextState.colorBlindMode,
          textSize:        nextState.textSizePercent,
          glassUI:         nextState.glassUI,
        }).catch(() => {});
      }
    }, 0);
  },

  setScreenReaderEnabled: (enabled) => set({ screenReaderEnabled: enabled }),
  setOsReducedMotion: (enabled) => set({ osReducedMotion: enabled }),

  announce: (message) => {
    if (!message) return;
    try {
      AccessibilityInfo.announceForAccessibility(String(message));
    } catch {}
  },
}));

export const useAccessibility = () => {
  const store = useAccessibilityStore();
  
  const theme = store.theme;

  const scale = (size) => Math.round((size * store.textSizePercent) / 100);
  const prefersReducedMotion = store.reducedMotion || store.osReducedMotion;

  const themedColors = {
    background:  theme.color.bg,
    surface:     theme.color.surface,
    text:        theme.color.text,
    subtext:     theme.color.textMuted,
    border:      theme.color.border,
    primaryText: theme.color.textBrand,
  };

  return {
    ...store,
    theme,
    themedColors,
    fontFamily: theme.fontFamily,
    scale,
    prefersReducedMotion,
  };
};
