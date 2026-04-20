/**
 * Network Context
 * ===============
 * Provides a global boolean `isOnline` that screens subscribe to so they can
 * show "using cached data" banners when the user's phone drops connection.
 *
 * Why not @react-native-community/netinfo?
 *   It's the obvious choice and it's more accurate, but it's another native
 *   dependency that needs autolinking + permissions. For Phase 1.5 we keep
 *   the dependency surface minimal and use a lightweight fetch probe against
 *   the API health endpoint + periodic re-checks. NetInfo can be swapped in
 *   later with no screen-level code changes — just replace what this file
 *   exports.
 *
 * How it works:
 *   - On mount, pings the API's /health endpoint with a 4-second timeout
 *   - Repeats every 30 seconds (cheap, one GET request)
 *   - Manually re-checks when any screen calls `checkNow()`
 *   - Also flips to `false` on any API request network error (api.js hooks in)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../config';

const NetworkContext = createContext(null);

const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS  = 4_000;

export function NetworkProvider({ children }) {
  // Start optimistic — assume online until proven otherwise so screens don't
  // flash a "you're offline" banner on cold start.
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const timerRef = useRef(null);

  const checkNow = useCallback(async () => {
    // AbortController gives us a reliable timeout on fetch, which RN's
    // fetch() doesn't support natively.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      // Prefer a lightweight /health endpoint. If the backend doesn't
      // expose one yet, we fall back to checking a common public endpoint.
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      setIsOnline(res.ok || res.status < 500);
    } catch {
      clearTimeout(timer);
      // Either timeout, DNS failure, or connection refused — all mean
      // we're effectively offline for our purposes.
      setIsOnline(false);
    }
    setLastChecked(Date.now());
  }, []);

  // Screens can call this to force a flip to offline (e.g., when an api
  // request fails with a network error). We debounce slightly so rapid
  // failures don't cause UI thrash.
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
