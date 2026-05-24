// omit onPress to render as a static tag instead of a toggle

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
