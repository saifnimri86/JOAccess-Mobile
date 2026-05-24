import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    setIsLoading(true);
    try {
      const storedUser = await api.getStoredUser();
      const token = await api.getAccessToken();

      if (storedUser && token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          await api.storeUser(data.user);
        } catch {
          // token expired or invalid
          await api.clearAuth();
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

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

  // does not auto-login — user must login after signup
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

  async function logout() {
    await api.clearAuth();
    setUser(null);
    setError(null);
  }

  async function refreshUser() {
    try {
      const data = await api.getMe();
      setUser(data.user);
      await api.storeUser(data.user);
    } catch {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
