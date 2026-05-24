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
import { useAuth } from '../context/AuthContext';
import ThemeCard from '../components/ThemeCard';
import AnimatedPressable from '../components/AnimatedPressable';

import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AddEditLocationScreen from '../screens/AddEditLocationScreen';
import LocationReviewsScreen from '../screens/LocationReviewsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function GlassTabBar({ state, descriptors, navigation }) {
  const { theme, prefersReducedMotion } = useAccessibility();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        { bottom: Math.max(insets.bottom, 8) + 6 },
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

export default function AppNavigator() {
  const { theme, prefersReducedMotion } = useAccessibility();
  const { isAuthenticated } = useAuth();

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

  const defaultScreenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: theme.color.bg },
    animation: prefersReducedMotion ? 'none' : 'slide_from_right',
    animationDuration: prefersReducedMotion ? 0 : 180,
    gestureEnabled: true,
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator 
        screenOptions={defaultScreenOptions}
        initialRouteName={isAuthenticated ? 'Main' : 'Login'}
      >
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
        <Stack.Screen name="LocationReviews" component={LocationReviewsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16, right: 16,
  },
  tabBar: {},
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
    // explicit dimensions — borderRadius:999 doesn't clip properly on some android layouts
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
