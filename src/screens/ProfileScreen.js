import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Modal, Pressable, BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useDialog } from '../context/DialogContext';
import * as api from '../services/api';
import FormField from '../components/FormField';
import { UPLOADS_BASE } from '../config';

import AnimatedPressable from '../components/AnimatedPressable';
import PrimaryButton from '../components/PrimaryButton';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';
import SkeletonLoader from '../components/SkeletonLoader';
import ThemeCard from '../components/ThemeCard';
import { spacing, radii } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { t, isRTL, lang, getLocalized } = useLanguage();
  const { theme, scale, announce } = useAccessibility();
  const { showDialog } = useDialog();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountErr, setAccountErr] = useState('');
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  // status: 'idle' | 'checking' | 'available' | 'taken' | 'too-long'
  const USERNAME_MAX = 25;
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameCheckTimerRef = useRef(null);
  const latestUsernameRef = useRef('');

  function handleUsernameChange(raw) {
    const sanitized = (raw || '').replace(/[^A-Za-z0-9_]/g, '');
    setNewUsername(sanitized);
    setAccountErr('');
    latestUsernameRef.current = sanitized;

    if (usernameCheckTimerRef.current) {
      clearTimeout(usernameCheckTimerRef.current);
      usernameCheckTimerRef.current = null;
    }

    if (sanitized.length > USERNAME_MAX) {
      setUsernameStatus('too-long');
      return;
    }
    if (!sanitized) {
      setUsernameStatus('idle');
      return;
    }
    if (sanitized === user?.username) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    usernameCheckTimerRef.current = setTimeout(async () => {
      try {
        const result = await api.checkUsernameAvailable(sanitized);
        if (latestUsernameRef.current !== sanitized) return; // stale
        setUsernameStatus(result?.available ? 'available' : 'taken');
      } catch {
        if (latestUsernameRef.current !== sanitized) return;
        // offline — let submit retry
        setUsernameStatus('idle');
      }
    }, 400);
  }

  function openUsernameModal() {
    setAccountErr('');
    setUsernameStatus('idle');
    setNewUsername('');
    latestUsernameRef.current = '';
    if (usernameCheckTimerRef.current) {
      clearTimeout(usernameCheckTimerRef.current);
      usernameCheckTimerRef.current = null;
    }
    setShowUsernameModal(true);
  }



  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadMyLocations();
      else setLoading(false);
    }, [isAuthenticated])
  );

  async function loadMyLocations() {
    try {
      const data = await api.getMyLocations();
      setLocations(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => { setRefreshing(true); loadMyLocations(); };


  async function handleChangeUsername() {
    setAccountErr('');
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setAccountErr(lang === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required');
      return;
    }
    if (trimmed.length > USERNAME_MAX) {
      setAccountErr(lang === 'ar'
        ? `الحد الأقصى ${USERNAME_MAX} حرفًا`
        : `Username must be ${USERNAME_MAX} characters or fewer`);
      return;
    }
    if (usernameStatus === 'taken') {
      setAccountErr(lang === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'Username is already taken');
      return;
    }
    setAccountSubmitting(true);
    try {
      const result = await api.changeUsername(trimmed);
      const stored = await api.getStoredUser();
      if (stored) {
        stored.username = result.username;
        await api.storeUser(stored);
      }
      setShowUsernameModal(false);
      setNewUsername('');
      showDialog(
        lang === 'ar' ? 'تم التغيير' : 'Updated',
        lang === 'ar' ? 'تم تغيير اسم المستخدم بنجاح' : 'Username updated successfully',
      );
      await refreshUser();
      loadMyLocations();
    } catch (err) {
      setAccountErr(err.message || (lang === 'ar' ? 'فشل التغيير' : 'Update failed'));
    } finally {
      setAccountSubmitting(false);
    }
  }

  async function handleChangePassword() {
    setAccountErr('');
    if (!currentPassword) {
      setAccountErr(lang === 'ar' ? 'كلمة المرور الحالية مطلوبة' : 'Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      setAccountErr(lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' : 'New password must be at least 8 characters');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setAccountErr(lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تحتوي على رقم واحد على الأقل' : 'New password must contain at least one number');
      return;
    }
    setAccountSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      showDialog(
        lang === 'ar' ? 'تم التغيير' : 'Updated',
        lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password updated successfully',
      );
      await refreshUser();
    } catch (err) {
      setAccountErr(err.message || (lang === 'ar' ? 'فشل التغيير' : 'Update failed'));
    } finally {
      setAccountSubmitting(false);
    }
  }



  const handleDelete = (locationId, name) => {
    showDialog(
      t('delete'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'), style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteLocation(locationId);
              announce(lang === 'ar' ? 'تم الحذف' : 'Deleted');
              loadMyLocations();
            } catch (err) {
              showDialog(t('error'), err.message || 'Delete failed');
            }
          },
        },
      ]
    );
  };

  // not logged in
  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
        <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
          <View style={styles.centerContainer}>
            <View style={[styles.bigIconBox, {
              backgroundColor: theme.color.brandMuted,
              borderRadius: theme.radii.pill,
            }]}>
              <Ionicons name="person-circle-outline" size={80} color={theme.color.textBrand} />
            </View>
            <Text style={{
              fontSize: scale(theme.fontSizes.xl),
              fontWeight: theme.fontWeights.bold,
              color: theme.color.text,
              marginTop: 20, textAlign: 'center',
              fontFamily: theme.fontFamily,
            }}>
              {lang === 'ar' ? 'سجّل للوصول لملفك الشخصي' : 'Sign in to view your profile'}
            </Text>
            <Text style={{
              fontSize: scale(theme.fontSizes.md),
              color: theme.color.textMuted,
              marginTop: 8, marginBottom: 28, textAlign: 'center',
              fontFamily: theme.fontFamily, paddingHorizontal: 40,
            }}>
              {lang === 'ar'
                ? 'أضِف أماكن، قيّم، وأبلغ عن مشاكل بعد تسجيل الدخول.'
                : 'Add locations, rate, and report issues when signed in.'}
            </Text>
            <View style={{ width: '80%' }}>
              <PrimaryButton
                label={t('login')}
                icon="log-in-outline"
                onPress={() => navigation.navigate('Login')}
              />
              <View style={{ height: 10 }} />
              <PrimaryButton
                label={t('signup')}
                icon="person-add-outline"
                variant="secondary"
                onPress={() => navigation.navigate('Signup')}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const initial = user?.username ? user.username[0].toUpperCase() : '?';
  const verifiedCount = locations.filter(l => l.is_verified).length;

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 96 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.color.brand}
              colors={[theme.color.brand]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <StaggeredReveal index={0}>
            <ThemeCard style={[
              styles.headerCard,
              {
                backgroundColor: theme.color.brand,
                borderRadius: theme.radii.xl,
                ...theme.elevation.md,
              },
            ]}>
              <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={{
                  fontSize: scale(theme.fontSizes.xxxl),
                  fontWeight: theme.fontWeights.heavy,
                  color: theme.color.textOnBrand,
                  fontFamily: theme.fontFamily,
                }}>{initial}</Text>
              </View>
              <Text style={{
                fontSize: scale(theme.fontSizes.xl),
                fontWeight: theme.fontWeights.heavy,
                color: theme.color.textOnBrand, marginTop: spacing.md,
                fontFamily: theme.fontFamily,
              }}>{user?.username}</Text>
              <Text style={{
                fontSize: scale(theme.fontSizes.sm),
                color: theme.color.textOnBrand,
                opacity: 0.85,
                marginTop: spacing.xxs,
                fontFamily: theme.fontFamily,
              }}>{user?.email}</Text>
              {user?.user_type === 'organization' && user?.organization_name ? (
                <View style={styles.orgBadge}>
                  <Ionicons name="business" size={12} color={theme.color.textOnBrand} />
                  <Text style={{
                    color: theme.color.textOnBrand, marginLeft: spacing.xs + 2,
                    fontSize: scale(theme.fontSizes.xs),
                    fontWeight: theme.fontWeights.semibold,
                    fontFamily: theme.fontFamily,
                  }}>{user.organization_name}</Text>
                </View>
              ) : null}
            </ThemeCard>
          </StaggeredReveal>

          <StaggeredReveal index={1}>
            <View style={styles.statsRow}>
              <StatCard value={locations.length} label={lang === 'ar' ? 'أماكن مضافة' : 'Added'} icon="location" />
              <StatCard value={verifiedCount} label={lang === 'ar' ? 'موثّقة' : 'Verified'} icon="checkmark-circle" />
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={2}>
            <View style={{ marginTop: 20 }}>
              <SectionHeader
                title={lang === 'ar' ? 'الحساب' : 'Account'}
                icon="person-circle-outline"
                align={isRTL ? 'right' : 'left'}
              />
              <ThemeCard style={[{
                backgroundColor: theme.color.surface,
                borderColor: theme.color.border,
                borderRadius: theme.radii.lg,
                borderWidth: StyleSheet.hairlineWidth,
                ...theme.elevation.sm,
                overflow: 'hidden',
              }]}>
                <AnimatedPressable
                  onPress={openUsernameModal}
                  style={styles.accountRow}
                  accessibilityLabel={lang === 'ar' ? 'تغيير اسم المستخدم' : 'Change username'}
                >
                  <View style={[styles.accountIconBox, { backgroundColor: theme.color.brandMuted }]}>
                    <Ionicons name="person-outline" size={18} color={theme.color.textBrand} />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: scale(theme.fontSizes.md),
                    color: theme.color.text,
                    fontFamily: theme.fontFamily,
                    marginLeft: 12,
                  }}>
                    {lang === 'ar' ? 'تغيير اسم المستخدم' : 'Change username'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
                </AnimatedPressable>

                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border }} />

                <AnimatedPressable
                  onPress={() => { setAccountErr(''); setCurrentPassword(''); setNewPassword(''); setShowPasswordModal(true); }}
                  style={styles.accountRow}
                  accessibilityLabel={lang === 'ar' ? 'تغيير كلمة المرور' : 'Change password'}
                >
                  <View style={[styles.accountIconBox, { backgroundColor: theme.color.brandMuted }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.color.textBrand} />
                  </View>
                  <Text style={{
                    flex: 1,
                    fontSize: scale(theme.fontSizes.md),
                    color: theme.color.text,
                    fontFamily: theme.fontFamily,
                    marginLeft: 12,
                  }}>
                    {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change password'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
                </AnimatedPressable>
              </ThemeCard>
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={3}>
            <View style={{ marginTop: 20, marginBottom: 10 }}>
              <PrimaryButton
                label={t('addLocation') || (lang === 'ar' ? 'إضافة مكان' : 'Add a location')}
                icon="add-circle-outline"
                onPress={() => navigation.navigate('AddLocation')}
              />
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={4}>
            <View style={{ marginTop: 24 }}>
              <SectionHeader
                title={lang === 'ar' ? 'أماكني' : 'My locations'}
                icon="list"
                subtitle={loading
                  ? (lang === 'ar' ? 'جاري التحميل…' : 'Loading…')
                  : lang === 'ar'
                    ? `${locations.length} ${locations.length === 1 ? 'مدخل' : 'مدخلات'}`
                    : `${locations.length} ${locations.length === 1 ? 'entry' : 'entries'}`}
                align={isRTL ? 'right' : 'left'}
              />
            </View>
          </StaggeredReveal>

          {loading ? (
            <>
              <SkeletonLoader height={80} style={{ marginBottom: 10 }} />
              <SkeletonLoader height={80} style={{ marginBottom: 10 }} />
              <SkeletonLoader height={80} style={{ marginBottom: 10 }} />
            </>
          ) : locations.length === 0 ? (
            <ThemeCard style={[
              styles.emptyState,
              { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderRadius: theme.radii.lg },
            ]}>
              <Ionicons name="map-outline" size={40} color={theme.color.textMuted} />
              <Text style={{
                color: theme.color.textMuted,
                fontSize: scale(theme.fontSizes.md),
                marginTop: 10, textAlign: 'center',
                fontFamily: theme.fontFamily,
              }}>
                {lang === 'ar' ? 'لم تضِف أي مكان بعد.' : "You haven't added any locations yet."}
              </Text>
            </ThemeCard>
          ) : (
            locations.map((loc, i) => (
              <StaggeredReveal key={loc.id} index={5 + i}>
                <LocationRow
                  location={loc}
                  name={getLocalized(loc, 'name')}
                  onEdit={() => navigation.navigate('EditLocation', { locationId: loc.id })}
                  onDelete={() => handleDelete(loc.id, getLocalized(loc, 'name'))}
                />
              </StaggeredReveal>
            ))
          )}

          <StaggeredReveal index={locations.length + 6}>
            <View style={{ marginTop: 24 }}>
              <PrimaryButton
                label={t('logout')}
                icon="log-out-outline"
                variant="ghost"
                onPress={() => {
                  showDialog(
                    t('logout'),
                    lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
                    [
                      { text: t('cancel'), style: 'cancel' },
                      { text: t('logout'), style: 'destructive', onPress: logout },
                    ]
                  );
                }}
              />
            </View>
          </StaggeredReveal>
        </ScrollView>

        <AccountModal
          visible={showUsernameModal}
          title={lang === 'ar' ? 'تغيير اسم المستخدم' : 'Change Username'}
          onClose={() => setShowUsernameModal(false)}
          onSubmit={handleChangeUsername}
          submitLabel={lang === 'ar' ? 'حفظ' : 'Save'}
          cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
          loading={accountSubmitting}
          submitDisabled={
            usernameStatus === 'too-long' ||
            usernameStatus === 'taken' ||
            usernameStatus === 'checking' ||
            !newUsername.trim()
          }
          error={accountErr}
        >
          <FormField
            icon="person-outline"
            placeholder={lang === 'ar' ? 'اسم المستخدم الجديد' : 'New username'}
            value={newUsername}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            error={
              usernameStatus === 'too-long'
                ? (lang === 'ar'
                    ? `الحد الأقصى ${USERNAME_MAX} حرفًا`
                    : `Max ${USERNAME_MAX} characters`)
                : usernameStatus === 'taken'
                ? (lang === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'Username is already taken')
                : undefined
            }
            hint={
              usernameStatus === 'checking'
                ? (lang === 'ar' ? 'جارٍ التحقق…' : 'Checking availability…')
                : usernameStatus === 'available'
                ? (lang === 'ar' ? 'متاح' : 'Available')
                : (lang === 'ar'
                    ? `حروف وأرقام وشرطة سفلية فقط · الحد ${USERNAME_MAX}`
                    : `Letters, digits, and underscores only · max ${USERNAME_MAX}`)
            }
          />
        </AccountModal>

        <AccountModal
          visible={showPasswordModal}
          title={lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handleChangePassword}
          submitLabel={lang === 'ar' ? 'حفظ' : 'Save'}
          cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
          loading={accountSubmitting}
          error={accountErr}
        >
          <FormField
            icon="lock-closed-outline"
            placeholder={lang === 'ar' ? 'كلمة المرور الحالية' : 'Current password'}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <FormField
            icon="lock-open-outline"
            placeholder={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            hint={lang === 'ar'
              ? '٨ أحرف على الأقل، ورقم واحد على الأقل'
              : 'At least 8 characters and one number'}
          />
        </AccountModal>

      </SafeAreaView>
    </View>
  );
}

function AccountModal({
  visible, title, onClose, onSubmit, submitLabel, cancelLabel,
  loading, error, submitDisabled = false, children,
}) {
  const { theme, scale, prefersReducedMotion } = useAccessibility();

  const opacity = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const cardTranslateY = useSharedValue(18);

  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion) {
      opacity.value = 1;
      cardScale.value = 1;
      cardTranslateY.value = 0;
    } else {
      opacity.value = withTiming(1, { duration: 180 });
      cardScale.value = withSpring(1, theme.motion.spring.snappy);
      cardTranslateY.value = withSpring(0, theme.motion.spring.snappy);
    }
  }, [visible]);

  function animateOut(callback) {
    if (prefersReducedMotion) {
      callback();
      return;
    }
    opacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) runOnJS(callback)();
    });
    cardScale.value = withTiming(0.9, { duration: 140 });
    cardTranslateY.value = withTiming(8, { duration: 140 });
  }

  function handleClose() {
    animateOut(onClose);
  }

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.surfaceOverlay }, backdropStyle]}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <View style={modalStyles.centerer} pointerEvents="box-none">
        <Animated.View style={[{ borderRadius: theme.radii.xl, alignSelf: 'stretch' }, theme.elevation.xl, cardStyle]}>
          <View style={[modalStyles.card, {
            backgroundColor: theme.color.surface,
            borderRadius: theme.radii.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.color.border,
          }]}>
            <Text style={{
              fontSize: scale(theme.fontSizes.lg),
              fontWeight: theme.fontWeights.bold,
              color: theme.color.text,
              fontFamily: theme.fontFamily,
              marginBottom: 20,
              textAlign: 'center',
            }}>
              {title}
            </Text>

            {children}

            {error ? (
              <Text style={{
                color: theme.color.danger,
                fontSize: scale(theme.fontSizes.sm),
                fontFamily: theme.fontFamily,
                marginBottom: 8,
                textAlign: 'center',
              }}>{error}</Text>
            ) : null}

            <View style={{ gap: 10, marginTop: 8 }}>
              <PrimaryButton
                label={submitLabel}
                loading={loading}
                disabled={submitDisabled}
                onPress={onSubmit}
              />
              <PrimaryButton
                label={cancelLabel}
                variant="secondary"
                onPress={handleClose}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  centerer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    padding: spacing.xxl,
    overflow: 'hidden',
  },
});

function StatCard({ value, label, icon, tone = 'brand' }) {
  const { theme, scale } = useAccessibility();
  const accentColor = tone === 'success' ? theme.color.success : theme.color.brand;
  return (
    <ThemeCard style={[
      styles.statCard,
      {
        backgroundColor: theme.color.surface,
        borderColor: theme.color.border,
        borderRadius: theme.radii.lg,
        ...theme.elevation.sm,
      },
    ]}>
      <View style={[styles.statIconBox, { backgroundColor: theme.color.brandMuted }]}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <Text style={{
        fontSize: scale(theme.fontSizes.xxl),
        fontWeight: theme.fontWeights.heavy,
        color: theme.color.text, marginTop: 6,
        fontFamily: theme.fontFamily,
      }}>{value}</Text>
      <Text style={{
        fontSize: scale(theme.fontSizes.xs),
        fontWeight: theme.fontWeights.semibold,
        color: theme.color.textMuted, marginTop: 2,
        fontFamily: theme.fontFamily,
        textTransform: 'uppercase', letterSpacing: 0.8,
      }}>{label}</Text>
    </ThemeCard>
  );
}

function LocationRow({ location, name, onEdit, onDelete }) {
  const { theme, scale } = useAccessibility();
  const { t, lang } = useLanguage();
  return (
    <ThemeCard style={[
      styles.locationRow,
      {
        backgroundColor: theme.color.surface,
        borderColor: theme.color.border,
        borderRadius: theme.radii.md,
        ...theme.elevation.sm,
      },
    ]}>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: scale(theme.fontSizes.md),
          fontWeight: theme.fontWeights.bold,
          color: theme.color.text,
          fontFamily: theme.fontFamily,
        }} numberOfLines={1}>{name}</Text>
        <View style={styles.locationMetaRow}>
          <Ionicons
            name={location.is_verified ? 'checkmark-circle' : 'time'}
            size={14}
            color={location.is_verified ? theme.color.success : theme.color.warning}
          />
          <Text style={{
            fontSize: scale(theme.fontSizes.xs),
            color: location.is_verified ? theme.color.success : theme.color.warning,
            marginLeft: 4, fontFamily: theme.fontFamily,
            fontWeight: theme.fontWeights.semibold,
          }}>{location.is_verified ? t('verified') : t('unverified')}</Text>
          <Text style={{
            fontSize: scale(theme.fontSizes.xs),
            color: theme.color.textMuted,
            marginLeft: 12, fontFamily: theme.fontFamily,
          }}>{t(location.category)}</Text>
        </View>
      </View>
      <AnimatedPressable
        onPress={onEdit}
        accessibilityLabel={t('edit') || (lang === 'ar' ? 'تعديل' : 'Edit')}
        hitSlop={8}
        style={styles.locationAction}
      >
        <Ionicons name="create-outline" size={20} color={theme.color.textBrand} />
      </AnimatedPressable>
      <AnimatedPressable
        onPress={onDelete}
        accessibilityLabel={t('delete')}
        hitSlop={8}
        style={styles.locationAction}
      >
        <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
      </AnimatedPressable>
    </ThemeCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing.xxl,
  },
  bigIconBox: {
    width: 160, height: 160,
    justifyContent: 'center', alignItems: 'center',
  },

  headerCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
  },
  orgBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs,
    borderRadius: radii.pill, marginTop: spacing.sm,
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: radii.md,
    justifyContent: 'center', alignItems: 'center',
  },

  emptyState: {
    padding: spacing.xxxl, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },


  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 52,
  },
  accountIconBox: {
    width: 36, height: 36, borderRadius: radii.md,
    justifyContent: 'center', alignItems: 'center',
  },



  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm + 2,
  },
  locationMetaRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs,
  },
  locationAction: {
    width: 40, height: 40, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
  },
});
