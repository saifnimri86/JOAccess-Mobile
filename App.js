/**
 * JOAccess App Entry (Phase 1.5 edits)
 * ====================================
 * Changes from previous App.js:
 *   - Splash screen now shows fullhorzlogo image on solid #800000 bg.
 *   - Logo positions slightly above center for a more balanced look.
 *   - Logo width scales with screen width (max 70%) so it's consistent
 *     across small phones, tablets, and landscape orientation.
 *   - StatusBar kept translucent with transparent bg (Android 15 edge-to-edge).
 *   - GestureHandlerRootView still wraps everything (filter crash fix).
 *
 * Image resolution note:
 *   Expects /assets/fullhorzlogo.png at the project root. If you have
 *   fullhorzlogo.svg, rename to .png (or use react-native-svg and swap
 *   the Image to <SvgUri />). Plain PNG avoids adding another native dep.
 */

import React from 'react';
import {
  View, StyleSheet, ActivityIndicator, StatusBar, Image, Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { DialogProvider } from './src/context/DialogContext';
import AppNavigator from './src/navigation/AppNavigator';

// Logo asset. If you renamed your file, change the path here.
// Metro bundles PNGs at build time based on static require() calls.
const LOGO = require('./assets/fullhorzlogo.png');

function LoadingScreen() {
  // Read dimensions each render so rotations are handled naturally.
  const { width, height } = Dimensions.get('window');
  // Logo takes up to 70% of screen width on portrait, less in landscape
  const logoWidth = Math.min(width * 0.7, 480);

  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* The logo sits slightly above center — flex: 1.2 above, flex: 1 below.
          This gives a "weighted toward top" composition which feels more
          settled than perfect center on phones with tall aspect ratios. */}
      <View style={{ flex: 1.2 }} />
      <Image
        source={LOGO}
        style={{
          width: logoWidth,
          // Height auto-derives from image's intrinsic aspect ratio
          height: undefined,
          aspectRatio: 4, // typical horizontal logo aspect — adjust to taste
          // If your logo has a different ratio, change aspectRatio OR drop
          // it entirely and let resizeMode='contain' size things.
        }}
        resizeMode="contain"
        accessible
        accessibilityLabel="JOAccess"
        accessibilityRole="image"
      />
      <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 48 }}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
      </View>
    </View>
  );
}

function AppContent() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isReady: langReady } = useLanguage();

  if (authLoading || !langReady) {
    return <LoadingScreen />;
  }

  return (
    <AccessibilityProvider isAuthenticated={isAuthenticated}>
      <DialogProvider>
        <AppNavigator />
      </DialogProvider>
    </AccessibilityProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <NetworkProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#800000',
    alignItems: 'center',
    // No justifyContent — we use flex ratios above/below the logo to
    // position it above true center.
  },
});
