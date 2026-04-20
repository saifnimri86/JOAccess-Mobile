/**
 * StaggeredReveal
 * ===============
 * A one-liner animation wrapper that fades and slides a child in,
 * optionally staggered by an index so list items appear sequentially.
 *
 * Usage:
 *   {items.map((item, i) => (
 *     <StaggeredReveal key={item.id} index={i}>
 *       <Card />
 *     </StaggeredReveal>
 *   ))}
 *
 * Props:
 *   index         number — used to compute the stagger delay (default 0)
 *   staggerMs     number — ms between items (default: theme.motion.staggerStep)
 *   from          'bottom' | 'right' | 'left' | 'fade-only' (default 'bottom')
 *   distance      number — how many px to translate from (default 16)
 *
 * Respects reducedMotion: if the user has it on, children render with no
 * animation at all — no delay, no movement, no fade.
 */

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
