// avoids @react-native-community/netinfo to keep native deps minimal.
// uses a /health probe + periodic re-checks. swap-in later if needed.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiBase } from '../config';

const NetworkContext = createContext(null);

const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS  = 4_000;

export function NetworkProvider({ children }) {
  // optimistic so cold start doesn't flash an offline banner
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const timerRef = useRef(null);

  const checkNow = useCallback(async () => {
    // AbortController gives fetch a reliable timeout, which RN's fetch lacks
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const res = await fetch(`${getApiBase()}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      setIsOnline(res.ok || res.status < 500);
    } catch {
      clearTimeout(timer);
      setIsOnline(false);
    }
    setLastChecked(Date.now());
  }, []);

  const markOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  const markOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  useEffect(() => {
    checkNow();
    timerRef.current = setInterval(checkNow, CHECK_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkNow]);

  const value = {
    isOnline,
    lastChecked,
    checkNow,
    markOffline,
    markOnline,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
