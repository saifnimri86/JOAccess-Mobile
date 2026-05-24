import React, { useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import { useAccessibility } from '../context/AccessibilityContext';

export default function StaggeredReveal({
  index = 0,
  staggerMs,
  from = 'bottom',
  distance = 16,
  duration = 380,
  children,
  style,
}) {
  const { theme, prefersReducedMotion } = useAccessibility();
  const step = staggerMs ?? theme.motion.staggerStep;

  const opacity    = useSharedValue(prefersReducedMotion ? 1 : 0);
  const translateX = useSharedValue(prefersReducedMotion ? 0 : (from === 'right' ? distance : from === 'left' ? -distance : 0));
  const translateY = useSharedValue(prefersReducedMotion ? 0 : (from === 'bottom' ? distance : 0));

  useEffect(() => {
    if (prefersReducedMotion) return;
    const delay = index * step;
    opacity.value    = withDelay(delay, withTiming(1, { duration }));
    translateX.value = withDelay(delay, withTiming(0, { duration }));
    translateY.value = withDelay(delay, withTiming(0, { duration }));
  }, [prefersReducedMotion, index, step, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
