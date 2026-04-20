import React from 'react';
import { View, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import { useAccessibility } from '../context/AccessibilityContext';

export default function ThemeCard({ children, style, ...rest }) {
  const { theme } = useAccessibility();

  if (theme.glassUI) {
    // Strip solid background so the glass blur is visible
    const flattened = StyleSheet.flatten(style) || {};
    const { backgroundColor, elevation, shadowColor, shadowOffset, shadowOpacity, shadowRadius, borderWidth, borderColor, borderTopWidth, borderBottomWidth, borderLeftWidth, borderRightWidth, ...glassStyle } = flattened;

    return (
      <GlassCard
        intensity="regular"
        style={glassStyle}
        tintOverride={theme.mode === 'dark' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.2)'}
        {...rest}
      >
        {children}
      </GlassCard>
    );
  }

  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}
