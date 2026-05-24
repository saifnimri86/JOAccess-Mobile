import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import AnimatedPressable from './AnimatedPressable';
import { useAccessibility } from '../context/AccessibilityContext';
import { useLanguage } from '../context/LanguageContext';

export default function FormField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType,
  autoComplete,
  autoCapitalize,
  multiline = false,
  numberOfLines = 1,
  error,
  hint,
  accessibilityHint,
  returnKeyType,
  onSubmitEditing,
}) {
  const { theme, scale, prefersReducedMotion } = useAccessibility();
  const { isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden]   = useState(secureTextEntry);

  const focusProgress = useSharedValue(0);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      focusProgress.value = focused ? 1 : 0;
      return;
    }
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, prefersReducedMotion]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const color = focusProgress.value === 1
      ? theme.color.brand
      : error ? theme.color.danger : theme.color.border;
    return { borderColor: color };
  });

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={styles.root}>
      {label ? (
        <Text
          style={{
            fontSize:   scale(theme.fontSizes.sm),
            fontWeight: theme.fontWeights.semibold,
            color:      theme.color.textMuted,
            marginBottom: 6,
            fontFamily: theme.fontFamily,
            textAlign,
          }}
        >
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.fieldRow,
          {
            backgroundColor: theme.color.surface,
            borderRadius:    theme.radii.md,
          },
          animatedBorderStyle,
          focused && { ...theme.elevation.sm },
          multiline && { alignItems: 'flex-start', paddingVertical: 12 },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? theme.color.brand : theme.color.textMuted}
            style={[
              styles.fieldIcon,
              isRTL ? { marginLeft: 10, marginRight: 0 } : null,
            ]}
          />
        ) : null}
        <TextInput
          key={`input-${theme.fontFamily}`}
          style={[
            styles.input,
            {
              color:      theme.color.text,
              fontSize:   scale(theme.fontSizes.md),
              fontFamily: theme.fontFamily,
              textAlign,
              minHeight:  multiline ? 80 : Platform.OS === 'ios' ? 28 : 44,
              // android multiline otherwise centers
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize ?? (secureTextEntry || keyboardType === 'email-address' ? 'none' : undefined)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label || placeholder}
          accessibilityHint={accessibilityHint}
        />
        {secureTextEntry ? (
          <AnimatedPressable
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.color.textMuted}
            />
          </AnimatedPressable>
        ) : null}
      </Animated.View>

      {error ? (
        <Text
          style={{
            color:    theme.color.danger,
            fontSize: scale(theme.fontSizes.sm),
            marginTop: 6,
            fontFamily: theme.fontFamily,
            textAlign,
          }}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color:    theme.color.textMuted,
            fontSize: scale(theme.fontSizes.xs),
            marginTop: 6,
            marginLeft: 4,
            fontFamily: theme.fontFamily,
            textAlign,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  fieldIcon: { marginRight: 10 },
  input:     { flex: 1, padding: 0 },
  eyeBtn:    { padding: 4, marginLeft: 6 },
});
