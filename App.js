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
import { initBackendEnv } from './src/config';

const LOGO = require('./assets/fullhorzlogo.png');

function LoadingScreen() {
  const { width, height } = Dimensions.get('window');
  const logoWidth = Math.min(width * 0.7, 480);

  return (
    <View style={styles.splash}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={{ flex: 1.2 }} />
      <Image
        source={LOGO}
        style={{
          width: logoWidth,
          height: undefined,
          aspectRatio: 4,
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
  // gate tree on env resolution so the first api call doesn't race initBackendEnv
  const [envReady, setEnvReady] = React.useState(false);
  React.useEffect(() => {
    initBackendEnv().finally(() => setEnvReady(true));
  }, []);

  if (!envReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LoadingScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
  },
});
