/**
 * TalkBackGuide
 * =============
 * A dismissible inline help card shown in Settings when:
 *   - The OS screen reader is OFF (we don't nag users who already use it), AND
 *   - The user hasn't dismissed the guide before.
 *
 * Why it exists:
 *   JOAccess is an accessibility app. Many of its users will benefit from
 *   TalkBack/VoiceOver being on. Rather than assuming they know how to
 *   enable it, we offer a one-tap deep link into the system settings page
 *   with a short, bilingual explanation.
 *
 * Persistence:
 *   Dismissal state is kept in EncryptedStorage so it survives reinstalls
 *   of the app bundle but is local to the device. Key: `joaccess_tbguide_dismissed`.
 *
 * Props:
 *   onOpenSettings  function — called when the user taps "Open"
 *
 * Behavior:
 *   Renders nothing if dismissed or if a screen reader is already active.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EncryptedStorage from 'react-native-encrypted-storage';

import { useAccessibility } from '../context/AccessibilityContext';
import { useLanguage } from '../context/LanguageContext';
import AnimatedPressable from './AnimatedPressable';
import ThemeCard from './ThemeCard';

const DISMISS_KEY = 'joaccess_tbguide_dismissed';

export default function TalkBackGuide() {
  const { theme, scale, screenReaderEnabled, announce } = useAccessibility();
  const { t, lang, isRTL } = useLanguage();

  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check the persisted dismissed flag on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await EncryptedStorage.getItem(DISMISS_KEY);
        if (!cancelled) setDismissed(v === '1');
      } catch {
        // If storage fails (rare), default to "not dismissed" and show it
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    try { await EncryptedStorage.setItem(DISMISS_KEY, '1'); } catch {}
    announce(lang === 'ar' ? 'تم الإخفاء' : 'Dismissed');
  }, [announce, lang]);

  const openSystemAccessibility = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent?.('android.settings.ACCESSIBILITY_SETTINGS').catch(() => {
        Linking.openSettings().catch(() => {});
      });
    } else {
      // iOS doesn't expose a direct deep link to the Accessibility page —
      // falling back to the app-specific settings screen is the closest
      // we can get from a sandboxed app.
      Linking.openURL('app-settings:').catch(() => {
        Linking.openSettings().catch(() => {});
      });
    }
  }, []);

  // Guard: do nothing until we've read the flag, and hide when
  // already-dismissed or a screen reader is already active.
  if (!loaded) return null;
  if (dismissed) return null;
  if (screenReaderEnabled) return null;

  const readerName = Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack';
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <ThemeCard
      style={[
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={
        lang === 'ar'
          ? `نصيحة قارئ الشاشة. قارئ الشاشة ${readerName} غير مفعل.`
          : `Screen reader tip. ${readerName} is not active.`
      }
    >
      {/* Top row — icon + close button */}
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.color.brandMuted }]}>
          <Ionicons name="mic-circle" size={24} color={theme.color.textBrand} />
        </View>
        <View style={{ flex: 1 }} />
        <AnimatedPressable
          onPress={handleDismiss}
          accessibilityLabel={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
          accessibilityHint={
            lang === 'ar'
              ? 'يخفي هذه النصيحة من صفحة الإعدادات'
              : 'Hides this tip from the Settings screen'
          }
          hitSlop={12}
          style={styles.closeBtn}
          rippleColor={null}
        >
          <Ionicons name="close" size={20} color={theme.color.textMuted} />
        </AnimatedPressable>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: scale(theme.fontSizes.lg),
          fontWeight: theme.fontWeights.bold,
          color: theme.color.text,
          fontFamily: theme.fontFamily,
          textAlign,
          marginTop: theme.spacing.sm,
        }}
        accessibilityRole="header"
      >
        {lang === 'ar'
          ? `استخدم ${readerName} مع JOAccess`
          : `Use ${readerName} with JOAccess`}
      </Text>

      {/* Body */}
      <Text
        style={{
          fontSize: scale(theme.fontSizes.sm),
          color: theme.color.textMuted,
          fontFamily: theme.fontFamily,
          textAlign,
          marginTop: theme.spacing.xs,
          lineHeight: 20,
        }}
      >
        {lang === 'ar'
          ? `${readerName} هو قارئ الشاشة المدمج في هاتفك. JOAccess مصمم للعمل معه بالكامل — كل الأزرار والقوائم لها تسميات واضحة. افتح الإعدادات لتشغيله.`
          : `${readerName} is your phone's built-in screen reader. JOAccess is fully wired for it — every button and menu has clear labels and hints. Open your system settings to turn it on.`}
      </Text>

      {/* Action row */}
      <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <AnimatedPressable
          onPress={openSystemAccessibility}
          accessibilityLabel={
            lang === 'ar' ? 'فتح إعدادات إمكانية الوصول' : 'Open accessibility settings'
          }
          accessibilityHint={
            lang === 'ar'
              ? `ينقلك إلى إعدادات النظام حيث يمكنك تشغيل ${readerName}`
              : `Takes you to system settings where you can turn ${readerName} on`
          }
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.color.brand,
              borderRadius: theme.radii.md,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        >
          <Ionicons
            name="open-outline"
            size={16}
            color={theme.color.textOnBrand}
            style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}
          />
          <Text
            style={{
              color: theme.color.textOnBrand,
              fontWeight: theme.fontWeights.bold,
              fontSize: scale(theme.fontSizes.sm),
              fontFamily: theme.fontFamily,
            }}
          >
            {lang === 'ar' ? 'فتح الإعدادات' : 'Open settings'}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleDismiss}
          accessibilityLabel={lang === 'ar' ? 'لا، شكراً' : 'No thanks'}
          style={[
            styles.secondaryBtn,
            {
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radii.md,
            },
          ]}
          rippleColor={null}
        >
          <Text
            style={{
              color: theme.color.textMuted,
              fontWeight: theme.fontWeights.semibold,
              fontSize: scale(theme.fontSizes.sm),
              fontFamily: theme.fontFamily,
            }}
          >
            {lang === 'ar' ? 'لا، شكراً' : 'No thanks'}
          </Text>
        </AnimatedPressable>
      </View>
    </ThemeCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Card-level overrides live in the inline style for theme reactivity
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  actions: {
    marginTop: 14,
    alignItems: 'center',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
