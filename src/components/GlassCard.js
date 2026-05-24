import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useAccessibility } from '../context/AccessibilityContext';

export default function GlassCard({
  children,
  intensity = 'regular',
  tintOverride,
  borderless = false,
  style,
  ...rest
}) {
  const { theme } = useAccessibility();
  const isDark = theme.mode === 'dark';

  const blurAmount = intensity === 'heavy' ? 40 : intensity === 'strong' ? 28 : 12;

  const defaultTint = isDark
    ? (intensity === 'heavy' ? theme.color.glassBgStrong : theme.color.glassBg)
    : (intensity === 'heavy' ? theme.color.glassBgStrong : theme.color.glassBg);

  const tint = tintOverride ?? defaultTint;

  // no `key` on BlurView — keying by mode remounts it and android takes
  // a frame to warm up, which causes HC glass to look solid until interaction.
  return (
    <View
      style={[
        styles.root,
        !borderless && { borderColor: theme.color.glassBorder, borderWidth: 1 },
        { borderRadius: style?.borderRadius ?? theme.radii.lg },
        style,
      ]}
      {...rest}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={theme.color.surface}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // android needs overflow:hidden to clip BlurView to rounded corners
    overflow: 'hidden',
  },
  content: {
    ...Platform.select({
      ios: {},
      android: {},
    }),
  },
});
