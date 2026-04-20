/**
 * Chip
 * ====
 * A rounded pill-shaped toggle. Used in filter sheets, category selectors,
 * and as read-only tags (for accessibility features on a location).
 *
 * Two modes:
 *   - Interactive (pass onPress): renders as AnimatedPressable with selected state
 *   - Read-only  (no onPress):    renders as a plain View with 'text' role
 *
 * Props:
 *   label       string
 *   icon        string (Ionicon name) — optional
 *   iconColor   string — overrides default tinting
 *   selected    boolean
 *   onPress     function | undefined  (omit to make read-only)
 *   tone        'default' | 'success' | 'warning' | 'danger' | 'brand'
 *   size        'sm' | 'md' (default 'md')
 *
 * Example:
 *   <Chip label="Wheelchair ramp" icon="accessibility"
 *         selected={isOn} onPress={toggle} />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedPressable from './AnimatedPressable';
import { useAccessibility } from '../context/AccessibilityContext';

export default function Chip({
  label,
  icon,
  iconColor,
  selected = false,
  onPress,
  tone = 'default',
  size = 'md',
  style,
  accessibilityHint,
}) {
  const { theme, scale } = useAccessibility();

  // Tone → {bg, fg, border}
  const toneStyles = getToneStyles(theme, tone, selected);

  const padH = size === 'sm' ? theme.spacing.md : theme.spacing.lg;
  const padV = size === 'sm' ? theme.spacing.xs : theme.spacing.sm;
  const fontSize = size === 'sm' ? theme.fontSizes.sm : theme.fontSizes.md;
  const iconSize = size === 'sm' ? 14 : 16;

  const body = (
    <View style={[
      styles.root,
      {
        backgroundColor: toneStyles.bg,
        borderColor:     toneStyles.border,
        borderRadius:    theme.radii.pill,
        paddingHorizontal: padH,
        paddingVertical:   padV,
      },
      style,
    ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize}
          color={iconColor ?? toneStyles.fg}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={{
          color: toneStyles.fg,
          fontSize: scale(fontSize),
          fontWeight: selected ? '600' : '500',
          fontFamily: theme.fontFamily,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );

  // Read-only chip (no press handler) — static tag
  if (!onPress) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={label}>
        {body}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </AnimatedPressable>
  );
}

// Get background/foreground colors for each tone + state
function getToneStyles(theme, tone, selected) {
  const c = theme.color;
  if (selected) {
    switch (tone) {
      case 'success':  return { bg: c.successBg, fg: c.success, border: c.success };
      case 'warning':  return { bg: c.warningBg, fg: c.warning, border: c.warning };
      case 'danger':   return { bg: c.dangerBg,  fg: c.danger,  border: c.danger };
      case 'brand':    return { bg: c.brand,     fg: c.textOnBrand, border: c.brand };
      default:         return { bg: c.brand,     fg: c.textOnBrand, border: c.brand };
    }
  }
  // Unselected
  switch (tone) {
    case 'success':  return { bg: c.successBg, fg: c.success, border: 'transparent' };
    case 'warning':  return { bg: c.warningBg, fg: c.warning, border: 'transparent' };
    case 'danger':   return { bg: c.dangerBg,  fg: c.danger,  border: 'transparent' };
    case 'brand':    return { bg: c.brandMuted, fg: c.textBrand, border: 'transparent' };
    default:         return { bg: c.surface, fg: c.textMuted, border: c.border };
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1,
  },
  icon: { marginRight: 6 },
});
