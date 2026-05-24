import React from 'react';
import { Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAccessibility } from '../context/AccessibilityContext';

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
  rippleColor,
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
      scale.value = withTiming(1, { duration: 0 });
      return;
    }
    scale.value = withSpring(1, theme.motion.spring.gentle);
  };

  // android_ripple disabled — callers pass rounded styling to an inner view,
  // so the ripple falls back to a rectangular bounding box and ghosts after
  // glass-ui toggles. scale + opacity already signal pressed state.
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
