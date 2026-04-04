/**
 * App Navigation
 * ==============
 * Structure:
 *   RootStack
 *     ├── MainTabs (when logged in OR as guest)
 *     │     ├── Map (Tab)
 *     │     ├── Chatbot (Tab)
 *     │     ├── Profile (Tab) → navigates to Login if not authenticated
 *     │     └── Settings (Tab)
 *     ├── Login (Stack screen)
 *     ├── Signup (Stack screen)
 *     ├── AddLocation (Stack screen, requires auth)
 *     └── EditLocation (Stack screen, requires auth)
 * 
 * The map and chatbot are accessible without login.
 * Profile and Add/Edit Location require authentication.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, fontSizes, fontWeights } from '../utils/theme';

// ── Screens ──
import MapScreen from '../screens/MapScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AddEditLocationScreen from '../screens/AddEditLocationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ═══════════════════════════════════════════
// Bottom Tab Navigator
// ═══════════════════════════════════════════

function MainTabs() {
  const { t, isRTL } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mediumGrey,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.lightGrey,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'MapTab':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'ChatTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person-circle' : 'person-circle-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{ tabBarLabel: t('tabMap') }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatbotScreen}
        options={{ tabBarLabel: t('tabChat') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: t('tabProfile') }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: t('tabSettings') }}
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════
// Root Stack Navigator
// ═══════════════════════════════════════════

export default function AppNavigator() {
  const { t } = useLanguage();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeights.bold },
          headerBackTitleVisible: false,
        }}
      >
        {/* Main tabs — always accessible */}
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Auth screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: t('login'),
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{
            title: t('signup'),
            presentation: 'modal',
          }}
        />

        {/* Add / Edit Location */}
        <Stack.Screen
          name="AddLocation"
          component={AddEditLocationScreen}
          options={{ title: t('addLocation') }}
        />
        <Stack.Screen
          name="EditLocation"
          component={AddEditLocationScreen}
          options={{ title: t('editLocation') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
