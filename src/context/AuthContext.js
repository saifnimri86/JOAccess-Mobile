/**
 * Auth Context
 * ============
 * Provides user authentication state to the entire app.
 * Handles login, signup, logout, and auto-restore of session from SecureStore.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // Current user object or null
  const [isLoading, setIsLoading] = useState(true); // True while checking stored tokens
  const [error, setError] = useState(null);          // Latest auth error message

  /**
   * On app start, check if we have a stored token and try to restore the session.
   */
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    setIsLoading(true);
    try {
      const storedUser = await api.getStoredUser();
      const token = await api.getAccessToken();

      if (storedUser && token) {
        // Verify the token is still valid by hitting /auth/me
        try {
          const data = await api.getMe();
          setUser(data.user);
          await api.storeUser(data.user); // Update stored data
        } catch {
          // Token expired or invalid — clear and go to login
          await api.clearAuth();
          setUser(null);
        }
      }
    } catch {
      // Storage error — start fresh
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Login with email and password.
   * On success, stores tokens and sets user state.
   * @returns {object} The user object
   * @throws {string} Error message on failure
   */
  async function login(email, password) {
    setError(null);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      throw message;
    }
  }

  /**
   * Register a new account.
   * Does NOT auto-login — user must login after signup.
   * @returns {object} The response data
   * @throws {string} Error message on failure
   */
  async function signup(userData) {
    setError(null);
    try {
      return await api.signup(userData);
    } catch (err) {
      const message = err.message || 'Signup failed';
      setError(message);
      throw message;
    }
  }

  /**
   * Logout — clears tokens and user state.
   */
  async function logout() {
    await api.clearAuth();
    setUser(null);
    setError(null);
  }

  /**
   * Refresh user data from the server (e.g., after editing profile).
   */
  async function refreshUser() {
    try {
      const data = await api.getMe();
      setUser(data.user);
      await api.storeUser(data.user);
    } catch {
      // Silently fail — user data stays as-is
    }
  }

  const value = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    login,
    signup,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and actions.
 * Must be used inside an <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
