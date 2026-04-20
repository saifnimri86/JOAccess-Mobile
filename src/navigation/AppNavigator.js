/**
 * App Navigator (Phase 1.5)
 * =========================
 * Upgrades from Phase 1:
 *
 *  1. Custom stack transitions (spring slide + fade) using React Navigation's
 *     built-in `TransitionPresets`. Falls back to `ModalSlideFromBottomIOS`
 *     feel with Android-appropriate timing.
 *
 *  2. When `prefersReducedMotion` is on, transitions become instant (0ms).
 *
 *  3. A new glass tab bar — floating above the screen content with a blur
 *     background, rounded corners, and the active tab with a maroon pill
 *     indicator. Tab icons animate with a spring scale on focus.
 *
 *  4. Proper safe area handling — the tab bar sits ABOVE the gesture bar
 *     on Android 14+ devices instead of under it.
 *
 *  5. Bottom inset for the tab bar is forwarded to screens via a header-
 *     less stack so the ScrollViews know to add bottom padding equal to
 *     (tab bar height + safe-area bottom).
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';

import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import ThemeCard from '../components/ThemeCard';
import AnimatedPressable from '../components/AnimatedPressable';

// Screens
import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AddEditLocationScreen from '../screens/AddEditLocationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ════════════════════════════════════════════════════════════════
// Glass tab bar
// ════════════════════════════════════════════════════════════════
function GlassTabBar({ state, descriptors, navigation }) {
  const { theme, prefersReducedMotion } = useAccessibility();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          bottom: Math.max(insets.bottom, 8) + 6,
          // Don't interfere with touches on the map below the tab bar area
        },
      ]}
      pointerEvents="box-none"
    >
      <ThemeCard
        style={[styles.tabBar, { borderRadius: theme.radii.pill, backgroundColor: theme.glassUI ? theme.color.floatingSurface : theme.color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.border }]}
      >
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel ?? route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconName = iconForRoute(route.name, isFocused);

            return (
              <TabItem
                key={route.key}
                iconName={iconName}
                label={label}
                isFocused={isFocused}
                onPress={onPress}
                reducedMotion={prefersReducedMotion}
              />
            );
          })}
        </View>
      </ThemeCard>
    </View>
  );
}

function iconForRoute(name, focused) {
  switch (name) {
    case 'MapTab': return focused ? 'map' : 'map-outline';
    case 'ChatTab': return focused ? 'chatbubbles' : 'chatbubbles-outline';
    case 'ProfileTab': return focused ? 'person-circle' : 'person-circle-outline';
    case 'SettingsTab': return focused ? 'settings' : 'settings-outline';
    default: return 'ellipse-outline';
  }
}

function TabItem({ iconName, label, isFocused, onPress, reducedMotion }) {
  const { theme, scale } = useAccessibility();
  const sv = useSharedValue(isFocused ? 1 : 0.9);

  // Spring the scale up when this tab becomes focused
  React.useEffect(() => {
    if (reducedMotion) { sv.value = 1; return; }
    sv.value = withSpring(isFocused ? 1.05 : 0.95, theme.motion.spring.gentle);
  }, [isFocused, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={styles.tabItemTouch}
      hitSlop={4}
    >
      <Animated.View style={[styles.tabItem, animStyle]}>
        <View
          style={[
            styles.tabPill,
            isFocused && {
              backgroundColor: theme.color.brand,
              ...theme.elevation.lg,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isFocused ? theme.color.textOnBrand : theme.color.textMuted}
          />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale(10),
            fontWeight: isFocused ? '700' : '500',
            color: isFocused ? theme.color.textBrand : theme.color.textMuted,
            marginTop: 2,
            fontFamily: theme.fontFamily,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab navigator
// ════════════════════════════════════════════════════════════════
function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="MapTab" component={MapScreen} options={{ tabBarLabel: t('tabMap') }} />
      <Tab.Screen name="ChatTab" component={ChatbotScreen} options={{ tabBarLabel: t('tabChat') }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: t('tabProfile') }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: t('tabSettings') }} />
    </Tab.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════
// Root stack with custom transitions
// ════════════════════════════════════════════════════════════════
export default function AppNavigator() {
  const { theme, prefersReducedMotion } = useAccessibility();

  // Use React Navigation's theme so default background matches our app
  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.color.bg,
      card: theme.color.surface,
      text: theme.color.text,
      border: theme.color.border,
      primary: theme.color.brand,
    },
  };

  // Default screen options — slide-fade transition, or instant if reduced.
  // 180ms is fast enough to feel responsive, slow enough to convey direction.
  const defaultScreenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: theme.color.bg },
    animation: prefersReducedMotion ? 'none' : 'slide_from_right',
    animationDuration: prefersReducedMotion ? 0 : 180,
    gestureEnabled: true,
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={defaultScreenOptions}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            presentation: 'modal',
            animation: prefersReducedMotion ? 'none' : 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{
            presentation: 'modal',
            animation: prefersReducedMotion ? 'none' : 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="AddLocation" component={AddEditLocationScreen} />
        <Stack.Screen name="EditLocation" component={AddEditLocationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16, right: 16,
  },
  tabBar: {
    // GlassCard owns the blur + tint
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabItemTouch: {
    flex: 1,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabPill: {
    // Fully round pill — was 999 before which works in most cases but on
    // some Android layouts it didn't clip the active background to a
    // proper capsule. Explicit dimensions + pill radius fixes that.
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    height: 34,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
