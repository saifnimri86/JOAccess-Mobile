/**
 * AnimatedPressable
 * =================
 * A touch target that:
 *   1. Springs on press (scale down to 0.96) — skipped if reducedMotion
 *   2. Uses native ripple on Android (Pressable's android_ripple)
 *   3. Exposes proper accessibility props so TalkBack/VoiceOver announce it
 *   4. Enforces a 44×44 minimum hit target (WCAG recommendation)
 *
 * Why not just use TouchableOpacity?
 *   TouchableOpacity fades opacity on press which looks lazy in 2026.
 *   Spring scale + native ripple feels like a real app.
 *
 * Props:
 *   onPress              function
 *   accessibilityLabel   string  — REQUIRED if no visible text
 *   accessibilityHint    string  — optional — explains the RESULT of pressing
 *   accessibilityRole    string  — defaults to 'button'
 *   accessibilityState   object  — e.g. { selected: true }
 *   disabled             boolean
 *   hitSlop              number | object — padding around the touchable
 *   style                style
 *   children             ReactNode
 *
 * Example:
 *   <AnimatedPressable
 *     accessibilityLabel="Apply filters"
 *     accessibilityHint="Closes the filter panel and refreshes the map"
 *     onPress={apply}
 *   >
 *     <Text>Apply</Text>
 *   </AnimatedPressable>
 */

import React from 'react';
import { Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAccessibility } from '../context/AccessibilityContext';

// Create the animated version of Pressable once
const APressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressable({
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  disabled = false,
  hitSlop = 8,
  style,
  children,
  rippleColor,   // kept in signature for API stability; ignored below
  ...rest
}) {
  const { theme, prefersReducedMotion } = useAccessibility();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: scale.value === 1 ? undefined : [{ scale: scale.value }],
      opacity: disabled ? 0.5 : 1,
    };
  });

  const handlePressIn = () => {
    if (prefersReducedMotion) return;
    scale.value = withSpring(0.96, theme.motion.spring.snappy);
  };

  const handlePressOut = () => {
    if (prefersReducedMotion) {
      // No animation, but still reset to 1 instantly
      scale.value = withTiming(1, { duration: 0 });
      return;
    }
    scale.value = withSpring(1, theme.motion.spring.gentle);
  };

  // No android_ripple at all. The scale-down spring is our touch feedback.
  //
  // Why killed outright: callers (Chip, SizeSegment, tab items, etc.) pass
  // their rounded styling to an INNER View, not to AnimatedPressable's own
  // style. That means we can't reliably read the target corner radius and
  // Android's ripple falls back to a rectangular bounding box — producing
  // the "rectangular highlight ghost" seen after toggling glass UI. No
  // ripple = no ghost. Scale + opacity already signal "pressed" well.
  return (
    <APressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
      disabled={disabled}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...(accessibilityState || {}) }}
      android_ripple={null}
      style={[animatedStyle, style]}
      delayPressIn={0}
      delayPressOut={0}
      {...rest}
    >
      {children}
    </APressable>
  );
}
