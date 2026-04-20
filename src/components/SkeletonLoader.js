/**
 * SkeletonLoader
 * ==============
 * A shimmering placeholder block you use to communicate "loading" without
 * the lazy spinner-in-the-middle-of-the-screen pattern.
 *
 * Respects reducedMotion — in that mode it's a plain static block.
 *
 * Props:
 *   width      number | '%' string
 *   height     number
 *   borderRadius number — defaults to theme.radii.md
 *   style      passthrough
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useAccessibility } from '../context/AccessibilityContext';

export default function SkeletonLoader({ width = '100%', height = 20, borderRadius, style }) {
  const { theme, prefersReducedMotion } = useAccessibility();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (prefersReducedMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 720 }),
        withTiming(0.5, { duration: 720 }),
      ),
      -1,
      false,
    );
  }, [prefersReducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: prefersReducedMotion ? 0.6 : opacity.value,
  }));

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[
        styles.base,
        {
          width,
          height,
          backgroundColor: theme.color.border,
          borderRadius: borderRadius ?? theme.radii.md,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});
