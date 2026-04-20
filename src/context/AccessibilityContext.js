/**
 * Accessibility Context (Phase 1.5 edits)
 * =======================================
 * Changes from v2:
 *   - buildTheme() now receives colorBlindMode so the transform applies
 *     to EVERY color in the theme. Previously it was dropped on the floor.
 *   - When dyslexiaFont flips off, theme.fontFamily is explicitly
 *     `undefined` (not null/'') so TextInput falls back to the device
 *     default. Xiaomi's MIUI leaves stale font refs if you set empty-string.
 *   - settings updates are idempotent — toggling the same value twice
 *     doesn't cause double server POSTs.
 */

import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAccessibilityStore, useAccessibility as useZustandAccessibility } from '../store/useAccessibilityStore';

// We provide an empty component just to house the global listeners
// without needing a real Context.Provider blocking the tree.
export function AccessibilityProvider({ children, isAuthenticated }) {
  const { init, syncServer, setScreenReaderEnabled, setOsReducedMotion } = useAccessibilityStore();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncServer(isAuthenticated);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (isMounted) setScreenReaderEnabled(enabled);
    }).catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => { if (isMounted) setScreenReaderEnabled(enabled); }
    );
    return () => {
      isMounted = false;
      if (sub?.remove) sub.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (AccessibilityInfo.isReduceMotionEnabled) {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        if (isMounted) setOsReducedMotion(enabled);
      }).catch(() => {});
    }
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => { if (isMounted) setOsReducedMotion(enabled); }
    );
    return () => {
      isMounted = false;
      if (sub?.remove) sub.remove();
    };
  }, []);

  return <>{children}</>;
}

// Transparently export the same hook signature so all 20+ screens 
// don't have to change their imports.
export function useAccessibility() {
  return useZustandAccessibility();
}
