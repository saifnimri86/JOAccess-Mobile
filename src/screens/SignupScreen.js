import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const { t, isRTL } = useLanguage();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [disability, setDisability] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup() {
    if (!username.trim()) { Alert.alert(t('error'), t('usernameRequired')); return; }
    if (!email.trim()) { Alert.alert(t('error'), t('emailRequired')); return; }
    if (!password || password.length < 6) { Alert.alert(t('error'), t('passwordMinLength')); return; }

    setIsSubmitting(true);
    try {
      await signup({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        user_type: userType,
        organization_name: userType === 'organization' ? organizationName.trim() : null,
        disability: disability.trim() || null,
      });
      Alert.alert(t('success'), t('signupSuccess'), [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (msg) {
      Alert.alert(t('error'), typeof msg === 'string' ? msg : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconCircle}>
          <Ionicons name="person-add" size={36} color={colors.white} />
        </View>

        <Text style={styles.title}>{t('signup')}</Text>
        <Text style={styles.subtitle}>{t('signupSubtitle')}</Text>

        {/* User Type Selector */}
        <Text style={[styles.label, { textAlign }]}>{t('userType')}</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeCard, userType === 'individual' && styles.typeCardActive]}
            onPress={() => setUserType('individual')}
          >
            <Ionicons name="person" size={28} color={userType === 'individual' ? colors.primary : colors.darkGrey} />
            <Text style={[styles.typeText, userType === 'individual' && styles.typeTextActive]}>
              {t('individual')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeCard, userType === 'organization' && styles.typeCardActive]}
            onPress={() => setUserType('organization')}
          >
            <Ionicons name="business" size={28} color={userType === 'organization' ? colors.primary : colors.darkGrey} />
            <Text style={[styles.typeText, userType === 'organization' && styles.typeTextActive]}>
              {t('organization')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Username */}
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={colors.darkGrey} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('username')}
            placeholderTextColor={colors.mediumGrey}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            textAlign={textAlign}
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={colors.darkGrey} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('email')}
            placeholderTextColor={colors.mediumGrey}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={textAlign}
          />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.darkGrey} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL, { flex: 1 }]}
            placeholder={t('password')}
            placeholderTextColor={colors.mediumGrey}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textAlign={textAlign}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.darkGrey} />
          </TouchableOpacity>
        </View>

        {/* Organization Name (conditional) */}
        {userType === 'organization' && (
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={20} color={colors.darkGrey} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('organizationName')}
              placeholderTextColor={colors.mediumGrey}
              value={organizationName}
              onChangeText={setOrganizationName}
              textAlign={textAlign}
            />
          </View>
        )}

        {/* Disability (optional) */}
        <View style={styles.inputContainer}>
          <Ionicons name="accessibility-outline" size={20} color={colors.darkGrey} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('disability')}
            placeholderTextColor={colors.mediumGrey}
            value={disability}
            onChangeText={setDisability}
            textAlign={textAlign}
          />
        </View>

        {/* Signup Button */}
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('signup')}</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>{t('hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkAction}>{t('login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  title: {
    fontSize: fontSizes.xxl, fontWeight: fontWeights.bold,
    color: colors.primary, textAlign: 'center', marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md, color: colors.darkGrey,
    textAlign: 'center', marginBottom: spacing.xxl,
  },
  label: {
    fontSize: fontSizes.md, fontWeight: fontWeights.semibold,
    color: colors.black, marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl,
  },
  typeCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.lightGrey,
  },
  typeCardActive: {
    borderColor: colors.primary, backgroundColor: colors.white,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  typeText: {
    fontSize: fontSizes.sm, color: colors.darkGrey,
    fontWeight: fontWeights.semibold, marginTop: spacing.xs,
  },
  typeTextActive: { color: colors.primary },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 2, borderColor: colors.lightGrey,
    marginBottom: spacing.lg, paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.lg, fontSize: fontSizes.md, color: colors.black },
  inputRTL: { textAlign: 'right' },
  eyeBtn: { padding: spacing.sm },
  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: fontWeights.bold },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  linkText: { fontSize: fontSizes.md, color: colors.darkGrey },
  linkAction: { fontSize: fontSizes.md, color: colors.primary, fontWeight: fontWeights.bold },
});
