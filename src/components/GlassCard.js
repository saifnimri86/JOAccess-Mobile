/**
 * GlassCard
 * =========
 * A translucent surface that blurs whatever is behind it.
 *
 * Why this exists:
 *   Every polished iOS/Android app uses frosted surfaces for overlays
 *   (search bars, bottom sheets, nav bars). React Native doesn't ship
 *   a blur primitive, so we wrap @react-native-community/blur + a semi-
 *   transparent fill layer that respects the active theme.
 *
 * Behavior:
 *   - In light mode: white-tinted blur on top of a warm tint
 *   - In dark/high-contrast: dark blur with subtle maroon border
 *   - If the user has OS "Reduce Transparency" on, BlurView degrades
 *     to the fallbackColor automatically — we don't have to handle it
 *
 * Props:
 *   intensity     'regular' | 'strong' | 'heavy'  (default 'regular')
 *   tintOverride  color string — override the default glass tint
 *   borderless    boolean — remove the 1px brand border
 *   style         passthrough
 *   children      whatever
 *
 * Usage:
 *   <GlassCard intensity="strong" style={{ padding: 16 }}>
 *     <Text>Hello</Text>
 *   </GlassCard>
 */

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

  // Blur amount per intensity level
  const blurAmount = intensity === 'heavy' ? 40 : intensity === 'strong' ? 28 : 12;

  // Default tint layered ON TOP of the blur (adds warmth/opacity)
  const defaultTint = isDark
    ? (intensity === 'heavy' ? theme.color.glassBgStrong : theme.color.glassBg)
    : (intensity === 'heavy' ? theme.color.glassBgStrong : theme.color.glassBg);

  const tint = tintOverride ?? defaultTint;

  // iOS: BlurView is a real blur. Android: it's decent on API 31+ and falls
  // back to a solid color on older devices (handled automatically by the lib).
  //
  // NOTE: No `key` prop on BlurView. Previously we keyed it by mode ('dark'/
  // 'light') which remounted the native view every time HC toggled, and on
  // Android the native blur takes a frame or two to warm up — which is why
  // HC glass looked fully solid until you interacted with the screen. The
  // BlurView accepts `blurType` as a live prop; it transitions in place.
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
      {/* Tint layer — gives the glass its "paper" quality */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} pointerEvents="none" />
      {/* Children sit above both layers */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    // On Android, overflow:hidden is required for BlurView to be clipped to the
    // rounded corners. iOS respects it automatically.
  },
  content: {
    // Children render above the blur+tint absoluteFill stack
    ...Platform.select({
      ios: {},
      android: {},
    }),
  },
});
