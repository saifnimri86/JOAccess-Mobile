/**
 * PrimaryButton
 * =============
 * The big branded call-to-action button. Used on Login submit,
 * Signup submit, AddLocation submit, etc.
 *
 * Variants:
 *   primary   — solid maroon background, white text (default)
 *   secondary — transparent with maroon border, maroon text
 *   ghost     — no border, subtle brand-muted background, brand text
 *   danger    — solid red background, white text
 *
 * Size:
 *   'md' (default) | 'lg'
 *
 * Props:
 *   label             string
 *   onPress           fn
 *   icon              Ionicon name (optional, rendered left of label)
 *   loading           boolean — shows spinner and disables
 *   disabled          boolean
 *   variant           'primary' | 'secondary' | 'ghost' | 'danger'
 *   size              'md' | 'lg'
 *   fullWidth         boolean — defaults true
 *   accessibilityHint
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedPressable from './AnimatedPressable';
import { useAccessibility } from '../context/AccessibilityContext';

export default function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  accessibilityHint,
}) {
  const { theme, scale } = useAccessibility();

  const styles = resolveStyles(theme, variant, disabled);
  const heightByPad = size === 'lg' ? 16 : 12;
  const fontSize    = size === 'lg' ? theme.fontSizes.lg : theme.fontSizes.md;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        rootStyles.base,
        {
          backgroundColor: styles.bg,
          borderColor:     styles.bd,
          borderRadius:    theme.radii.md,
          borderWidth:     styles.bw,
          paddingVertical: heightByPad,
          paddingHorizontal: 20,
          minHeight: 48,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styles.fg} />
      ) : (
        <View style={rootStyles.content}>
          {icon ? (
            <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={styles.fg} style={{ marginRight: 8 }} />
          ) : null}
          <Text
            style={{
              color:      styles.fg,
              fontSize:   scale(fontSize),
              fontWeight: theme.fontWeights.bold,
              fontFamily: theme.fontFamily,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

function resolveStyles(theme, variant, disabled) {
  const c = theme.color;
  switch (variant) {
    case 'secondary':
      return { bg: 'transparent',      fg: c.textBrand,   bd: c.brand,      bw: 1.5 };
    case 'ghost':
      return { bg: c.brandMuted,       fg: c.textBrand,   bd: 'transparent', bw: 0 };
    case 'danger':
      return { bg: c.danger,           fg: '#FFFFFF',      bd: c.danger,     bw: 0 };
    default:
      return { bg: c.brand,            fg: c.textOnBrand, bd: c.brand,      bw: 0 };
  }
}

const rootStyles = StyleSheet.create({
  base:    { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center' },
});
