/**
 * SettingsScreen (Phase 1.5)
 * ==========================
 * Changes from Phase 1:
 *   - Removed the live preview card (redundant — the whole app is the
 *     preview now that we're on Phase 1.5's full design system)
 *   - Added more deep-link buttons: TalkBack settings, Reduce motion,
 *     System accessibility overview
 *   - Screen-reader status card shows more context about what's detected
 *   - The language card now explains that switching RTL requires app restart
 *     (RN's I18nManager limitation) with a helper to do a soft reload
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Linking, Platform, Alert,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import AnimatedPressable from '../components/AnimatedPressable';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';
import ThemeCard from '../components/ThemeCard';
import TalkBackGuide from '../components/TalkBackGuide';

export default function SettingsScreen() {
  const { t, lang, isRTL, setLanguage } = useLanguage();
  const a11y = useAccessibility();
  const {
    theme, scale, announce, screenReaderEnabled, prefersReducedMotion,
    highContrast, dyslexiaFont, reducedMotion, colorBlindMode, textSizePercent,
    glassUI, updateSettings,
  } = a11y;

  const toggleHighContrast = () => {
    const next = !highContrast;
    updateSettings({ highContrast: next });
    announce(`${t('highContrast')} ${next ? t('enabled') : t('disabled')}`);
  };

  const toggleDyslexiaFont = () => {
    const next = !dyslexiaFont;
    updateSettings({ dyslexiaFont: next });
    announce(`${t('dyslexiaFont')} ${next ? t('enabled') : t('disabled')}`);
  };

  const toggleReducedMotion = () => {
    const next = !reducedMotion;
    updateSettings({ reducedMotion: next });
    announce(`${t('reducedMotion')} ${next ? t('enabled') : t('disabled')}`);
  };

  const toggleGlassUI = () => {
    const next = !glassUI;
    updateSettings({ glassUI: next });
    announce(`${t('glassUI')} ${next ? t('enabled') : t('disabled')}`);
  };

  const setTextSize = (size) => {
    updateSettings({ textSizePercent: size });
    announce(`${t('textSize')} ${size}%`);
  };

  const setCbMode = (mode) => {
    updateSettings({ colorBlindMode: mode });
    announce(`${t('colorBlindMode')}: ${t(mode)}`);
  };

  const switchLang = (target) => {
    if (lang === target) return;
    // LanguageContext now auto-reloads the app on RTL change via
    // react-native-restart (or DevSettings.reload as fallback). No more
    // manual alert needed. If the reload fails for some reason, the
    // LanguageContext itself shows an alert as a last resort.
    setLanguage(target);
  };

  // ─── Deep-link helpers ────────────────────────────────────────────
  // These open system-level settings pages the user can't easily find.
  const openAccessibilitySettings = () => {
    if (Platform.OS === 'android') {
      // The generic accessibility settings page — lists every installed
      // service including TalkBack, Select to Speak, etc.
      Linking.sendIntent?.('android.settings.ACCESSIBILITY_SETTINGS').catch(() => {
        Linking.openSettings().catch(() => { });
      });
    } else {
      Linking.openURL('app-settings:').catch(() => Linking.openSettings().catch(() => { }));
    }
  };

  const openAppInfoPage = () => {
    // Opens this app's specific info page in system settings — useful for
    // granting permissions, clearing cache, etc.
    Linking.openSettings().catch(() => { });
  };

  const textAlign = isRTL ? 'right' : 'left';

  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: withTiming(theme.color.bg, { duration: prefersReducedMotion ? 0 : 200 })
  }), [theme.color.bg, prefersReducedMotion]);

  return (
    <Animated.View style={[styles.root, animatedBg]}>
      <SafeAreaView
        style={styles.root}
        edges={['top', 'left', 'right']}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            // Bottom padding accounts for the tab bar overlap
            { paddingBottom: 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero title */}
          <View style={styles.hero}>
            <Text
              style={{
                fontSize: scale(theme.fontSizes.xxxl),
                fontWeight: theme.fontWeights.heavy,
                color: theme.color.text,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
              }}
              accessibilityRole="header"
            >
              {t('settings')}
            </Text>
            <Text
              style={{
                fontSize: scale(theme.fontSizes.md),
                color: theme.color.textMuted,
                marginTop: 4,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
              }}
            >
              {lang === 'ar' ? 'تغييرات فورية عبر التطبيق' : 'Changes apply instantly across the app'}
            </Text>
          </View>

          {/* Language */}
          <StaggeredReveal index={0}>
            <SectionHeader title={t('language')} icon="language" align={textAlign} />
            <ThemeCard key={`lang-${theme.mode}-${colorBlindMode}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              <View style={styles.langRow}>
                <LanguagePill label="English" active={lang === 'en'} onPress={() => switchLang('en')} />
                <LanguagePill label="العربية" active={lang === 'ar'} onPress={() => switchLang('ar')} />
              </View>
            </ThemeCard>
          </StaggeredReveal>

          {/* Display */}
          <StaggeredReveal index={1}>
            <SectionHeader title={lang === 'ar' ? 'العرض' : 'Display'} icon="color-palette" align={textAlign} />
            <ThemeCard key={`disp-${theme.mode}-${colorBlindMode}-${highContrast}-${dyslexiaFont}-${reducedMotion}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              <SettingToggleRow
                icon="contrast"
                label={t('highContrast')}
                description={lang === 'ar' ? 'نمط داكن عالي التباين' : 'Dark, high-contrast theme'}
                value={highContrast}
                onToggle={toggleHighContrast}
              />
              <Divider />
              <SettingToggleRow
                icon="text"
                label={t('dyslexiaFont')}
                description={lang === 'ar' ? 'خط أسهل للقراءة' : 'Easier-to-read font'}
                value={dyslexiaFont}
                onToggle={toggleDyslexiaFont}
              />
              <Divider />
              <SettingToggleRow
                icon="pause-circle"
                label={t('reducedMotion')}
                description={lang === 'ar' ? 'تقليل الحركة والرسوم المتحركة' : 'Minimize animations'}
                value={reducedMotion}
                onToggle={toggleReducedMotion}
              />
              <Divider />
              <SettingToggleRow
                icon="color-filter"
                label={t('glassUI')}
                description={t('glassUIDesc')}
                value={glassUI}
                onToggle={toggleGlassUI}
              />
            </ThemeCard>
          </StaggeredReveal>

          {/* Text size */}
          <StaggeredReveal index={2}>
            <SectionHeader
              title={t('textSize')}
              icon="resize"
              subtitle={`${textSizePercent}%`}
              align={textAlign}
            />
            <ThemeCard key={`text-${theme.mode}-${colorBlindMode}-${textSizePercent}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              <View style={styles.sizeRow}>
                {[80, 100, 120, 150].map((size) => (
                  <SizeSegment
                    key={size}
                    size={size}
                    selected={textSizePercent === size}
                    onPress={() => setTextSize(size)}
                  />
                ))}
              </View>
            </ThemeCard>
          </StaggeredReveal>

          {/* Color vision */}
          <StaggeredReveal index={3}>
            <SectionHeader title={t('colorBlindMode')} icon="eye" align={textAlign} />
            <ThemeCard key={`cb-${theme.mode}-${colorBlindMode}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              {[
                { key: 'none', swatch: null },
                { key: 'protanopia', swatch: '#C85250' },
                { key: 'deuteranopia', swatch: '#2A9D5F' },
                { key: 'tritanopia', swatch: '#3E8BC9' },
                { key: 'achromatopsia', swatch: '#808080' },
              ].map((opt, i, arr) => (
                <React.Fragment key={opt.key}>
                  <ColorVisionRow
                    label={t(opt.key)}
                    swatch={opt.swatch}
                    selected={colorBlindMode === opt.key}
                    onPress={() => setCbMode(opt.key)}
                  />
                  {i < arr.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </ThemeCard>
          </StaggeredReveal>

          {/* Screen reader status + deep links */}
          <StaggeredReveal index={4}>
            <SectionHeader
              title={lang === 'ar' ? 'قارئ الشاشة والإمكانيات' : 'Screen Reader & System Accessibility'}
              icon="mic"
              align={textAlign}
            />

            {/* Inline help card — only renders when reader is off and the user
                hasn't dismissed it before. Silently a no-op otherwise. */}
            <TalkBackGuide />

            <ThemeCard key={`sr-${theme.mode}-${colorBlindMode}-${screenReaderEnabled}-${prefersReducedMotion}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              {/* Current state */}
              <View style={[styles.settingRow, { paddingBottom: theme.spacing.md }]}>
                <View style={[styles.settingIconBox, { backgroundColor: theme.color.brandMuted }]}>
                  <Ionicons name="mic" size={20} color={theme.color.textBrand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.settingLabel,
                    { color: theme.color.text, fontSize: scale(theme.fontSizes.md), fontFamily: theme.fontFamily },
                  ]}>
                    {screenReaderEnabled
                      ? (lang === 'ar' ? 'قارئ الشاشة مُفعّل' : 'Screen reader active')
                      : (lang === 'ar' ? 'قارئ الشاشة غير مفعّل' : 'Screen reader off')}
                  </Text>
                  <Text style={[
                    styles.settingDesc,
                    { color: theme.color.textMuted, fontSize: scale(theme.fontSizes.sm), fontFamily: theme.fontFamily },
                  ]}>
                    {Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack'}
                    {prefersReducedMotion ? (lang === 'ar' ? ' · تقليل الحركة ON' : ' · Reduce motion ON') : ''}
                  </Text>
                </View>
                <View
                  style={[styles.statusDot, { backgroundColor: screenReaderEnabled ? theme.color.success : theme.color.borderStrong }]}
                  accessible={false}
                />
              </View>

              <Text style={{
                fontSize: scale(theme.fontSizes.sm),
                color: theme.color.textMuted,
                fontFamily: theme.fontFamily,
                marginVertical: theme.spacing.md,
                textAlign,
                lineHeight: 20,
              }}>
                {lang === 'ar'
                  ? 'يستخدم التطبيق قارئ الشاشة المدمج في هاتفك. افتح إعدادات النظام لضبطه.'
                  : 'JOAccess uses your phone\'s built-in screen reader. Open system settings to configure it.'}
              </Text>

              <DeepLinkButton
                icon="accessibility"
                label={lang === 'ar' ? 'إعدادات إمكانية الوصول' : 'Accessibility settings'}
                hint={lang === 'ar' ? 'TalkBack، قارئات الشاشة، وأكثر' : 'TalkBack, screen readers, and more'}
                onPress={openAccessibilitySettings}
              />
              <View style={{ height: 8 }} />
              <DeepLinkButton
                icon="information-circle"
                label={lang === 'ar' ? 'معلومات التطبيق' : 'App info'}
                hint={lang === 'ar' ? 'الأذونات، التخزين، والإشعارات' : 'Permissions, storage, and notifications'}
                onPress={openAppInfoPage}
              />
            </ThemeCard>
          </StaggeredReveal>

          {/* About */}
          <StaggeredReveal index={5}>
            <SectionHeader title={t('about')} icon="information-circle" align={textAlign} />
            <ThemeCard key={`about-${theme.mode}-${colorBlindMode}-${glassUI}`} style={[styles.card, cardStyle(theme)]}>
              <AboutRow label={t('appName')} value="JOAccess" />
              <Divider />
              <AboutRow label={t('version')} value="1.0.0" />
              <Divider />
              <AboutRow label="© 2025–2026" value="JUST" />
            </ThemeCard>
          </StaggeredReveal>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════

function LanguagePill({ label, active, onPress }) {
  const { theme, scale } = useAccessibility();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.langPill,
        {
          backgroundColor: active ? theme.color.brand : theme.color.surface,
          borderColor: active ? theme.color.brand : theme.color.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <Text style={{
        color: active ? theme.color.textOnBrand : theme.color.text,
        fontSize: scale(theme.fontSizes.md),
        fontWeight: active ? theme.fontWeights.bold : theme.fontWeights.semibold,
        fontFamily: theme.fontFamily,
      }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function SettingToggleRow({ icon, label, description, value, onToggle }) {
  const { theme, scale } = useAccessibility();
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconBox, { backgroundColor: theme.color.brandMuted }]}>
        <Ionicons name={icon} size={18} color={theme.color.textBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.settingLabel,
          { color: theme.color.text, fontSize: scale(theme.fontSizes.md), fontFamily: theme.fontFamily },
        ]}>
          {label}
        </Text>
        {description ? (
          <Text style={[
            styles.settingDesc,
            { color: theme.color.textMuted, fontSize: scale(theme.fontSizes.sm), fontFamily: theme.fontFamily },
          ]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.color.border, true: theme.color.brand }}
        thumbColor={Platform.OS === 'android' ? (value ? theme.color.brand : theme.color.surface) : undefined}
        ios_backgroundColor={theme.color.border}
        accessibilityLabel={label}
        accessibilityHint={description}
      />
    </View>
  );
}

function SizeSegment({ size, selected, onPress }) {
  const { theme, scale } = useAccessibility();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={`Text size ${size} percent`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.sizeSegment,
        {
          backgroundColor: selected ? theme.color.brand : theme.color.surface,
          borderColor: selected ? theme.color.brand : theme.color.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <Text style={{
        fontSize: 14,
        fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.semibold,
        color: selected ? theme.color.textOnBrand : theme.color.textMuted,
        fontFamily: theme.fontFamily,
      }}>
        {size}%
      </Text>
    </AnimatedPressable>
  );
}

function ColorVisionRow({ label, swatch, selected, onPress }) {
  const { theme, scale } = useAccessibility();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={styles.settingRow}
    >
      <View style={styles.radio}>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
          color={selected ? theme.color.brand : theme.color.textMuted}
        />
      </View>
      <Text style={[
        styles.settingLabel,
        {
          flex: 1,
          color: theme.color.text,
          fontSize: scale(theme.fontSizes.md),
          fontFamily: theme.fontFamily,
          fontWeight: selected ? theme.fontWeights.semibold : theme.fontWeights.regular,
        },
      ]}>
        {label}
      </Text>
      {swatch ? (
        <View style={[styles.swatch, { backgroundColor: swatch, borderColor: theme.color.border }]} />
      ) : null}
    </AnimatedPressable>
  );
}

function DeepLinkButton({ icon, label, hint, onPress }) {
  const { theme, scale } = useAccessibility();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityRole="link"
      style={[
        styles.deepLinkRow,
        {
          backgroundColor: theme.color.brandMuted,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.color.textBrand} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{
          color: theme.color.textBrand,
          fontSize: scale(theme.fontSizes.md),
          fontWeight: theme.fontWeights.semibold,
          fontFamily: theme.fontFamily,
        }}>
          {label}
        </Text>
        <Text style={{
          color: theme.color.textBrand,
          fontSize: scale(theme.fontSizes.xs),
          opacity: 0.7,
          marginTop: 2,
          fontFamily: theme.fontFamily,
        }}>
          {hint}
        </Text>
      </View>
      <Ionicons name="open-outline" size={16} color={theme.color.textBrand} />
    </AnimatedPressable>
  );
}

function AboutRow({ label, value }) {
  const { theme, scale } = useAccessibility();
  return (
    <View style={styles.aboutRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={{
        color: theme.color.textMuted,
        fontSize: scale(theme.fontSizes.md),
        fontFamily: theme.fontFamily,
      }}>
        {label}
      </Text>
      <Text style={{
        color: theme.color.text,
        fontSize: scale(theme.fontSizes.md),
        fontWeight: theme.fontWeights.semibold,
        fontFamily: theme.fontFamily,
      }}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const { theme } = useAccessibility();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.divider, marginVertical: 2 }} />;
}

const cardStyle = (theme) => ({
  borderRadius: theme.radii.lg,
  backgroundColor: theme.color.surface,
  borderColor: theme.color.border,
  borderWidth: StyleSheet.hairlineWidth,
  padding: theme.spacing.md,
  marginBottom: theme.spacing.xl,
  ...theme.elevation.sm,
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  hero: { marginBottom: 24 },

  langRow: { flexDirection: 'row', gap: 10 },
  langPill: {
    flex: 1, paddingVertical: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
  },
  settingIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  settingLabel: { lineHeight: 22 },
  settingDesc: { marginTop: 2 },

  radio: { width: 24, alignItems: 'center' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },

  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeSegment: {
    flex: 1, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, minHeight: 44,
  },

  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
  },

  deepLinkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 52,
  },

  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
