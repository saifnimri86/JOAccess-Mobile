import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, TextInput, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

export default function SettingsScreen() {
  const { t, lang, isRTL, toggleLanguage } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  // ── Accessibility settings (synced with server when logged in) ──
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState('none');
  const [textSizePercent, setTextSizePercent] = useState(100);

  // Load accessibility settings from server
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  async function loadSettings() {
    try {
      const settings = await api.getAccessibilitySettings();
      if (settings) {
        setHighContrast(settings.highContrast || false);
        setDyslexiaFont(settings.dyslexiaFont || false);
        setReducedMotion(settings.reducedMotion || false);
        setColorBlindMode(settings.colorBlindMode || 'none');
        setTextSizePercent(settings.textSize || 100);
      }
    } catch {
      // Use defaults
    }
  }

  async function saveSettings(updates) {
    const settings = {
      highContrast,
      dyslexiaFont,
      reducedMotion,
      colorBlindMode,
      textSize: textSizePercent,
      ...updates,
    };

    if (isAuthenticated) {
      try {
        await api.updateAccessibilitySettings(settings);
      } catch {
        // Silently fail — settings still apply locally
      }
    }
  }

  function handleToggleHighContrast(val) {
    setHighContrast(val);
    saveSettings({ highContrast: val });
  }

  function handleToggleDyslexia(val) {
    setDyslexiaFont(val);
    saveSettings({ dyslexiaFont: val });
  }

  function handleToggleMotion(val) {
    setReducedMotion(val);
    saveSettings({ reducedMotion: val });
  }

  function handleColorBlind(mode) {
    setColorBlindMode(mode);
    saveSettings({ colorBlindMode: mode });
  }

  function handleTextSize(size) {
    setTextSizePercent(size);
    saveSettings({ textSize: size });
  }

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <ScrollView style={styles.container}>
      {/* ── Language Section ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          <Ionicons name="language" size={18} color={colors.primary} /> {t('language')}
        </Text>

        <View style={styles.card}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => { if (lang !== 'en') toggleLanguage(); }}
            >
              <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
              onPress={() => { if (lang !== 'ar') toggleLanguage(); }}
            >
              <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextActive]}>
                العربية
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Accessibility Settings Section ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          <Ionicons name="accessibility" size={18} color={colors.primary} /> {t('accessibilitySettingsTitle')}
        </Text>

        <View style={styles.card}>
          {/* High Contrast */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="contrast" size={20} color={colors.darkGrey} />
              <Text style={styles.settingLabel}>{t('highContrast')}</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={handleToggleHighContrast}
              trackColor={{ false: colors.lightGrey, true: colors.primaryLight }}
              thumbColor={highContrast ? colors.primary : colors.mediumGrey}
            />
          </View>

          {/* Dyslexia Font */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="text" size={20} color={colors.darkGrey} />
              <Text style={styles.settingLabel}>{t('dyslexiaFont')}</Text>
            </View>
            <Switch
              value={dyslexiaFont}
              onValueChange={handleToggleDyslexia}
              trackColor={{ false: colors.lightGrey, true: colors.primaryLight }}
              thumbColor={dyslexiaFont ? colors.primary : colors.mediumGrey}
            />
          </View>

          {/* Reduced Motion */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="pause-circle" size={20} color={colors.darkGrey} />
              <Text style={styles.settingLabel}>{t('reducedMotion')}</Text>
            </View>
            <Switch
              value={reducedMotion}
              onValueChange={handleToggleMotion}
              trackColor={{ false: colors.lightGrey, true: colors.primaryLight }}
              thumbColor={reducedMotion ? colors.primary : colors.mediumGrey}
            />
          </View>

          {/* Text Size */}
          <View style={styles.settingRowVertical}>
            <View style={styles.settingInfo}>
              <Ionicons name="resize" size={20} color={colors.darkGrey} />
              <Text style={styles.settingLabel}>{t('textSize')}: {textSizePercent}%</Text>
            </View>
            <View style={styles.textSizeRow}>
              {[80, 100, 120, 150].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeBtn, textSizePercent === size && styles.sizeBtnActive]}
                  onPress={() => handleTextSize(size)}
                >
                  <Text style={[styles.sizeBtnText, textSizePercent === size && styles.sizeBtnTextActive]}>
                    {size}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Blind Mode */}
          <View style={styles.settingRowVertical}>
            <View style={styles.settingInfo}>
              <Ionicons name="eye" size={20} color={colors.darkGrey} />
              <Text style={styles.settingLabel}>{t('colorBlindMode')}</Text>
            </View>
            <View style={styles.colorBlindRow}>
              {[
                { key: 'none', label: t('none') },
                { key: 'protanopia', label: t('protanopia') },
                { key: 'deuteranopia', label: t('deuteranopia') },
                { key: 'tritanopia', label: t('tritanopia') },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.cbBtn, colorBlindMode === opt.key && styles.cbBtnActive]}
                  onPress={() => handleColorBlind(opt.key)}
                >
                  <Ionicons
                    name={colorBlindMode === opt.key ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={colorBlindMode === opt.key ? colors.primary : colors.darkGrey}
                  />
                  <Text style={[styles.cbBtnText, colorBlindMode === opt.key && { color: colors.primary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── About Section ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} /> {t('about')}
        </Text>

        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('appName')}</Text>
            <Text style={styles.aboutValue}>JOAccess</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('tagline')}</Text>
            <Text style={styles.aboutValue}>{t('tagline')}</Text>
          </View>

          <Text style={styles.copyright}>
            © 2025-2026 JOAccess - JUST
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey },

  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: fontSizes.lg, fontWeight: fontWeights.bold,
    color: colors.primary, marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },

  // ── Language ──
  langRow: { flexDirection: 'row', gap: spacing.md },
  langBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.grey, alignItems: 'center',
    borderWidth: 2, borderColor: colors.lightGrey,
  },
  langBtnActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  langBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  langBtnTextActive: { color: colors.white },

  // ── Settings rows ──
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.grey,
  },
  settingRowVertical: {
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.grey,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  settingLabel: { fontSize: fontSizes.md, color: colors.black },

  // ── Text size ──
  textSizeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  sizeBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.grey, alignItems: 'center',
    borderWidth: 1, borderColor: colors.lightGrey,
  },
  sizeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sizeBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  sizeBtnTextActive: { color: colors.white },

  // ── Color blind ──
  colorBlindRow: { marginTop: spacing.md, gap: spacing.sm },
  cbBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cbBtnActive: {},
  cbBtnText: { fontSize: fontSizes.md, color: colors.darkGrey },

  // ── About ──
  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.grey,
  },
  aboutLabel: { fontSize: fontSizes.md, color: colors.darkGrey },
  aboutValue: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.black },
  copyright: {
    fontSize: fontSizes.sm, color: colors.mediumGrey,
    textAlign: 'center', marginTop: spacing.lg,
  },
});
