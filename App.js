/**
 * JOAccess Mobile App
 * ===================
 * Main entry point.
 * 
 * Wraps the entire app in:
 *   1. LanguageProvider — bilingual EN/AR support
 *   2. AuthProvider — JWT authentication state
 *   3. AppNavigator — React Navigation stack + bottom tabs
 * 
 * Shows a branded splash screen while auth state is being restored.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

// ── Splash / Loading screen shown while restoring auth session ──
function LoadingScreen() {
  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" backgroundColor="#800000" />
      <View style={styles.splashIcon}>
        <Ionicons name="accessibility" size={48} color="#FFFFFF" />
      </View>
      <Text style={styles.splashTitle}>JOAccess</Text>
      <Text style={styles.splashSubtitle}>Accessibility Map Jordan</Text>
      <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 30 }} />
    </View>
  );
}

// ── Inner app that checks loading state ──
function AppContent() {
  const { isLoading: authLoading } = useAuth();
  const { isReady: langReady } = useLanguage();

  // Show splash while auth or language is loading
  if (authLoading || !langReady) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

// ── Main App component ──
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#800000" />
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#800000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  splashSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
});
