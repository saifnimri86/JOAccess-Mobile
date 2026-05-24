import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAccessibilityStore, useAccessibility as useZustandAccessibility } from '../store/useAccessibilityStore';

// houses global listeners — no real Context.Provider needed
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

// re-export so existing screen imports don't break
export function useAccessibility() {
  return useZustandAccessibility();
}
