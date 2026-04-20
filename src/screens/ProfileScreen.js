/**
 * ProfileScreen (Phase 1.5)
 * =========================
 * Redesigned with:
 *   - Glass header card with avatar initial, username, email
 *   - Stats pill row (locations added, verified count)
 *   - "My Locations" list with staggered reveals
 *   - Pull-to-refresh with brand-colored spinner
 *   - Not-logged-in empty state with big primary CTA
 *   - Logout in a ghost button at the bottom
 *
 * All existing logic preserved: loads via useFocusEffect, supports pull-to-
 * refresh, delete with confirmation, navigates to Edit on tap.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useDialog } from '../context/DialogContext';
import * as api from '../services/api';
import { UPLOADS_BASE } from '../config';

import AnimatedPressable from '../components/AnimatedPressable';
import PrimaryButton from '../components/PrimaryButton';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';
import SkeletonLoader from '../components/SkeletonLoader';
import ThemeCard from '../components/ThemeCard';

export default function ProfileScreen({ navigation }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, isRTL, lang, getLocalized } = useLanguage();
  const { theme, scale, announce } = useAccessibility();
  const { showDialog } = useDialog();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => { setRefreshing(true); loadMyLocations(); };

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

  // ── Not logged in ──
  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
        <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
          <View style={styles.centerContainer}>
            <View style={[styles.bigIconBox, {
              backgroundColor: theme.color.brandMuted,
              borderRadius: 80,
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
          {/* Header card */}
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
                  fontSize: 34, fontWeight: '800', color: '#FFFFFF',
                  fontFamily: theme.fontFamily,
                }}>{initial}</Text>
              </View>
              <Text style={{
                fontSize: scale(theme.fontSizes.xl),
                fontWeight: theme.fontWeights.heavy,
                color: '#FFFFFF', marginTop: 12,
                fontFamily: theme.fontFamily,
              }}>{user?.username}</Text>
              <Text style={{
                fontSize: scale(theme.fontSizes.sm),
                color: 'rgba(255,255,255,0.85)', marginTop: 2,
                fontFamily: theme.fontFamily,
              }}>{user?.email}</Text>
              {user?.user_type === 'organization' && user?.organization_name ? (
                <View style={styles.orgBadge}>
                  <Ionicons name="business" size={12} color="#FFFFFF" />
                  <Text style={{
                    color: '#FFFFFF', marginLeft: 6,
                    fontSize: scale(theme.fontSizes.xs),
                    fontWeight: theme.fontWeights.semibold,
                    fontFamily: theme.fontFamily,
                  }}>{user.organization_name}</Text>
                </View>
              ) : null}
            </ThemeCard>
          </StaggeredReveal>

          {/* Stats */}
          <StaggeredReveal index={1}>
            <View style={styles.statsRow}>
              <StatCard value={locations.length} label={lang === 'ar' ? 'أماكن مضافة' : 'Added'} icon="pin" />
              <StatCard value={verifiedCount} label={lang === 'ar' ? 'موثّقة' : 'Verified'} icon="checkmark-circle" tone="success" />
            </View>
          </StaggeredReveal>

          {/* Add new location CTA */}
          <StaggeredReveal index={2}>
            <View style={{ marginTop: 20, marginBottom: 10 }}>
              <PrimaryButton
                label={t('addLocation') || (lang === 'ar' ? 'إضافة مكان' : 'Add a location')}
                icon="add-circle-outline"
                onPress={() => navigation.navigate('AddLocation')}
              />
            </View>
          </StaggeredReveal>

          {/* My locations list */}
          <StaggeredReveal index={3}>
            <View style={{ marginTop: 24 }}>
              <SectionHeader
                title={lang === 'ar' ? 'أماكني' : 'My locations'}
                icon="list"
                subtitle={loading ? (lang === 'ar' ? 'جاري التحميل…' : 'Loading…') :
                  `${locations.length} ${locations.length === 1 ? 'entry' : 'entries'}`}
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
              <StaggeredReveal key={loc.id} index={4 + i}>
                <LocationRow
                  location={loc}
                  name={getLocalized(loc, 'name')}
                  onEdit={() => navigation.navigate('EditLocation', { locationId: loc.id })}
                  onDelete={() => handleDelete(loc.id, getLocalized(loc, 'name'))}
                />
              </StaggeredReveal>
            ))
          )}

          {/* Logout */}
          <StaggeredReveal index={locations.length + 5}>
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
      </SafeAreaView>
    </View>
  );
}

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
  content: { paddingHorizontal: 20, paddingTop: 12 },

  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24,
  },
  bigIconBox: {
    width: 160, height: 160,
    justifyContent: 'center', alignItems: 'center',
  },

  headerCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  orgBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginTop: 8,
  },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  emptyState: {
    padding: 32, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  locationMetaRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4,
  },
  locationAction: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
});
