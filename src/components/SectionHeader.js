/**
 * SectionHeader
 * =============
 * A consistent section header for grouping settings, form fields, etc.
 * Uses an eyebrow-style small-caps title above the content.
 *
 * Props:
 *   title     string  (required)
 *   icon      string  (Ionicon name) — optional
 *   subtitle  string  — optional supporting text below the title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAccessibility } from '../context/AccessibilityContext';

export default function SectionHeader({ title, icon, subtitle, align = 'left' }) {
  const { theme, scale } = useAccessibility();

  return (
    <View
      style={[styles.root, align === 'right' && { alignItems: 'flex-end' }]}
      accessibilityRole="header"
      accessible
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={[styles.titleRow, align === 'right' && { flexDirection: 'row-reverse' }]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={14}
            color={theme.color.textBrand}
            style={{ marginRight: align === 'right' ? 0 : 8, marginLeft: align === 'right' ? 8 : 0 }}
          />
        ) : null}
        <Text
          style={{
            fontSize: scale(theme.fontSizes.xs),
            fontWeight: theme.fontWeights.bold,
            color: theme.color.textBrand,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontFamily: theme.fontFamily,
          }}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text
          style={{
            fontSize: scale(theme.fontSizes.sm),
            color: theme.color.textMuted,
            marginTop: 4,
            fontFamily: theme.fontFamily,
            textAlign: align,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
