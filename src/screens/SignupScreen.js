/**
 * SignupScreen (Phase 1.5)
 * ========================
 * Redesign mirrors Login: hero icon, FormField inputs, PrimaryButton,
 * staggered entrance animations. Adds individual/organization type
 * selector as a two-card picker with a spring on select.
 */

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
import DropdownPicker from '../components/DropdownPicker';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const { t, isRTL, lang } = useLanguage();
  const { theme, scale, announce } = useAccessibility();
  const { showDialog } = useDialog();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('individual');
  const [orgName, setOrgName] = useState('');
  const [selectedDisabilityValue, setSelectedDisabilityValue] = useState('');
  const [otherDisability, setOtherDisability] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errs, setErrs] = useState({});

  async function handleSignup() {
    const newErrs = {};
    if (!username.trim()) newErrs.username = t('usernameRequired');
    if (!email.trim())    newErrs.email    = t('emailRequired');
    if (!password || password.length < 6) newErrs.password = t('passwordMinLength');
    if (userType === 'organization' && !orgName.trim()) {
      newErrs.orgName = lang === 'ar' ? 'اسم المنظمة مطلوب' : 'Organization name required';
    }
    setErrs(newErrs);
    if (Object.keys(newErrs).length > 0) {
      announce(Object.values(newErrs)[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDisability = selectedDisabilityValue === 'other'
        ? otherDisability.trim() || null
        : selectedDisabilityValue
          ? t(selectedDisabilityValue)
          : null;

      await signup({
        username: username.trim(),
        email:    email.trim().toLowerCase(),
        password,
        user_type: userType,
        organization_name: userType === 'organization' ? orgName.trim() : null,
        disability: finalDisability,
      });
      showDialog(t('success'), t('signupSuccess'), [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (msg) {
      const text = typeof msg === 'string' ? msg : (msg?.message || 'Signup failed');
      showDialog(t('error'), text);
      announce(text);
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {/* Close */}
          <View style={styles.closeRow}>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              accessibilityLabel={t('cancel')}
              hitSlop={12}
              style={[styles.closeBtn, { backgroundColor: theme.color.surface, borderColor: theme.color.border }]}
            >
              <Ionicons name="close" size={22} color={theme.color.text} />
            </AnimatedPressable>
          </View>

          {/* Hero */}
          <StaggeredReveal index={0}>
            <View style={styles.hero}>
              <View style={[styles.iconCircle, { backgroundColor: theme.color.brand, ...theme.elevation.md }]}>
                <Ionicons name="person-add" size={34} color={theme.color.textOnBrand} />
              </View>
              <Text style={{
                fontSize: scale(theme.fontSizes.xxxl),
                fontWeight: theme.fontWeights.heavy,
                color: theme.color.text, fontFamily: theme.fontFamily,
                textAlign: 'center', marginTop: 16,
              }} accessibilityRole="header">{t('signup')}</Text>
              <Text style={{
                fontSize: scale(theme.fontSizes.md),
                color: theme.color.textMuted, marginTop: 6,
                fontFamily: theme.fontFamily, textAlign: 'center',
              }}>{t('signupSubtitle')}</Text>
            </View>
          </StaggeredReveal>

          {/* User Type Selector */}
          <StaggeredReveal index={1}>
            <Text style={{
              fontSize: scale(theme.fontSizes.sm),
              fontWeight: theme.fontWeights.semibold,
              color: theme.color.textMuted,
              marginBottom: 8, fontFamily: theme.fontFamily,
              textAlign: isRTL ? 'right' : 'left',
            }}>{t('userType')}</Text>
            <View style={styles.typeRow}>
              <TypeCard
                icon="person" label={t('individual')}
                active={userType === 'individual'}
                onPress={() => setUserType('individual')}
              />
              <TypeCard
                icon="business" label={t('organization')}
                active={userType === 'organization'}
                onPress={() => setUserType('organization')}
              />
            </View>
          </StaggeredReveal>

          {/* Fields */}
          <StaggeredReveal index={2}>
            <View style={{ marginTop: 12 }}>
              <FormField
                icon="person-outline"
                placeholder={t('username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                error={errs.username}
                returnKeyType="next"
              />
              <FormField
                icon="mail-outline"
                placeholder={t('email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                error={errs.email}
                returnKeyType="next"
              />
              <FormField
                icon="lock-closed-outline"
                placeholder={t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                error={errs.password}
              />
              {userType === 'organization' ? (
                <FormField
                  icon="business-outline"
                  placeholder={t('organizationName') || (lang === 'ar' ? 'اسم المنظمة' : 'Organization name')}
                  value={orgName}
                  onChangeText={setOrgName}
                  error={errs.orgName}
                />
              ) : null}

              <DropdownPicker
                icon="medkit-outline"
                placeholder={t('selectDisabilityType')}
                value={selectedDisabilityValue}
                onValueChange={setSelectedDisabilityValue}
                options={[
                  { label: t('wheelchairImpairment'), value: 'wheelchairImpairment' },
                  { label: t('visualImpairment'), value: 'visualImpairment' },
                  { label: t('hearingImpairment'), value: 'hearingImpairment' },
                  { label: t('cognitiveDisability'), value: 'cognitiveDisability' },
                  { label: t('multipleDisabilities'), value: 'multipleDisabilities' },
                  { label: t('otherDisability'), value: 'other' },
                ]}
              />

              {selectedDisabilityValue === 'other' ? (
                <FormField
                  icon="create-outline"
                  placeholder={t('disabilityOptional') || (lang === 'ar' ? 'الإعاقة (اختياري)' : 'Disability (optional)')}
                  value={otherDisability}
                  onChangeText={setOtherDisability}
                />
              ) : null}
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={3}>
            <View style={{ marginTop: 8 }}>
              <PrimaryButton
                label={t('signup')}
                icon="checkmark-circle-outline"
                loading={isSubmitting}
                onPress={handleSignup}
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
                {lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
              </Text>
              <AnimatedPressable
                onPress={() => navigation.replace('Login')}
                accessibilityLabel={t('login')}
                accessibilityRole="link"
                hitSlop={8}
                style={{ marginLeft: 6 }}
              >
                <Text style={{
                  color: theme.color.textBrand,
                  fontSize: scale(theme.fontSizes.md),
                  fontWeight: theme.fontWeights.bold,
                  fontFamily: theme.fontFamily,
                }}>{t('login')}</Text>
              </AnimatedPressable>
            </View>
          </StaggeredReveal>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TypeCard({ icon, label, active, onPress }) {
  const { theme, scale } = useAccessibility();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[
        styles.typeCard,
        {
          backgroundColor: active ? theme.color.brandMuted : theme.color.surface,
          borderColor:     active ? theme.color.brand      : theme.color.border,
          borderRadius:    theme.radii.lg,
        },
      ]}
    >
      <Ionicons name={icon} size={28} color={active ? theme.color.brand : theme.color.textMuted} />
      <Text style={{
        marginTop: 8,
        color: active ? theme.color.textBrand : theme.color.text,
        fontSize: scale(theme.fontSizes.md),
        fontWeight: active ? theme.fontWeights.bold : theme.fontWeights.semibold,
        fontFamily: theme.fontFamily,
      }}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', alignItems: 'center',
  },
  hero: { alignItems: 'center', marginVertical: 16 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1,
    paddingVertical: 20, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, minHeight: 96,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
