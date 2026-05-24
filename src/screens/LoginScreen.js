import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useDialog } from '../context/DialogContext';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import StaggeredReveal from '../components/StaggeredReveal';
import { spacing, radii } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login, clearError } = useAuth();
  const { t, isRTL } = useLanguage();
  const { theme, scale, announce } = useAccessibility();
  const { showDialog } = useDialog();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState({});

  async function handleLogin() {
    clearError();
    setFieldError({});

    const errs = {};
    if (!email.trim()) errs.email = t('emailRequired');
    if (!password)     errs.password = t('passwordRequired');

    if (Object.keys(errs).length > 0) {
      setFieldError(errs);
      announce(Object.values(errs)[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
    } catch (msg) {
      const msgText = typeof msg === 'string' ? msg : (msg?.message || t('invalidCredentials'));
      showDialog(t('error'), msgText);
      announce(msgText);
    } finally {
      setIsSubmitting(false);
    }
  }

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView
        style={styles.root}
        edges={['top', 'left', 'right']}
      >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.closeRow}>
            <AnimatedPressable
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.replace('Main');
                }
              }}
              accessibilityLabel={t('cancel')}
              accessibilityRole="button"
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: theme.color.surface, borderColor: theme.color.border }]}
            >
              <Ionicons name="close" size={22} color={theme.color.text} />
            </AnimatedPressable>
          </View>

          <StaggeredReveal index={0}>
            <View style={styles.hero}>
              <View style={[styles.iconCircle, { backgroundColor: theme.color.brand, ...theme.elevation.md }]}>
                <Ionicons name="lock-closed" size={34} color={theme.color.textOnBrand} />
              </View>
              <Text
                style={{
                  fontSize:   scale(theme.fontSizes.xxxl),
                  fontWeight: theme.fontWeights.heavy,
                  color:      theme.color.text,
                  fontFamily: theme.fontFamily,
                  textAlign:  'center',
                  marginTop:  spacing.lg,
                }}
                accessibilityRole="header"
              >
                {t('login')}
              </Text>
              <Text
                style={{
                  fontSize:   scale(theme.fontSizes.md),
                  color:      theme.color.textMuted,
                  marginTop:  spacing.xs + 2,
                  fontFamily: theme.fontFamily,
                  textAlign:  'center',
                }}
              >
                {t('loginSubtitle')}
              </Text>
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={1}>
            <FormField
              icon="mail-outline"
              label={t('email')}
              placeholder={t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              error={fieldError.email}
              returnKeyType="next"
            />
          </StaggeredReveal>

          <StaggeredReveal index={2}>
            <FormField
              icon="lock-closed-outline"
              label={t('password')}
              placeholder={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              error={fieldError.password}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </StaggeredReveal>

          <StaggeredReveal index={3}>
            <View style={{ marginTop: spacing.sm }}>
              <PrimaryButton
                label={t('login')}
                icon="log-in-outline"
                loading={isSubmitting}
                onPress={handleLogin}
                accessibilityHint={t('loginSubtitle')}
              />
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={4}>
            <View style={styles.footerRow}>
              <Text style={{
                color: theme.color.textMuted,
                fontSize: scale(theme.fontSizes.md),
                fontFamily: theme.fontFamily,
              }}>
                {t('noAccount') || (isRTL ? 'ليس لديك حساب؟' : "Don't have an account?")}
              </Text>
              <AnimatedPressable
                onPress={() => navigation.replace('Signup')}
                accessibilityLabel={t('signup')}
                accessibilityRole="link"
                hitSlop={8}
                style={{ marginLeft: 6 }}
              >
                <Text style={{
                  color: theme.color.textBrand,
                  fontSize: scale(theme.fontSizes.md),
                  fontWeight: theme.fontWeights.bold,
                  fontFamily: theme.fontFamily,
                }}>
                  {t('signup')}
                </Text>
              </AnimatedPressable>
            </View>
          </StaggeredReveal>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.huge - spacing.sm, flexGrow: 1 },

  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  closeBtn: {
    width: 40, height: 40, borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', alignItems: 'center',
  },

  hero: { alignItems: 'center', marginVertical: spacing.xxl },
  iconCircle: {
    width: 80, height: 80, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
});
