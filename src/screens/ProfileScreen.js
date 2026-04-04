import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { UPLOADS_BASE } from '../config';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, isRTL, getLocalized } = useLanguage();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload locations every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadMyLocations();
    }, [isAuthenticated])
  );

  async function loadMyLocations() {
    try {
      const data = await api.getMyLocations();
      setLocations(data);
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadMyLocations();
  }

  async function handleDelete(locationId) {
    Alert.alert(
      t('delete'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteLocation(locationId);
              Alert.alert(t('success'), t('locationDeleted'));
              loadMyLocations();
            } catch (err) {
              Alert.alert(t('error'), err.message || 'Delete failed');
            }
          },
        },
      ]
    );
  }

  // ── Not logged in ──
  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-circle-outline" size={80} color={colors.lightGrey} />
        <Text style={styles.emptyText}>{t('loginToViewProfile')}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryBtnText}>{t('login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initial = user?.username ? user.username[0].toUpperCase() : '?';
  const memberDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Profile Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.username}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.badge}>
              <Ionicons
                name={user.user_type === 'organization' ? 'business' : 'person'}
                size={14}
                color={colors.white}
              />
              <Text style={styles.badgeText}>
                {t(user.user_type || 'individual')}
                {user.organization_name ? ` - ${user.organization_name}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{locations.length}</Text>
            <Text style={styles.statLabel}>{t('locationsAdded')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user.review_count || 0}</Text>
            <Text style={styles.statLabel}>{t('reviews')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{memberDate}</Text>
            <Text style={styles.statLabel}>{t('memberSince')}</Text>
          </View>
        </View>
      </View>

      {/* My Locations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('myLocations')}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddLocation')}
          >
            <Ionicons name="add-circle" size={20} color={colors.white} />
            <Text style={styles.addBtnText}>{t('addLocation')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : locations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={60} color={colors.lightGrey} />
            <Text style={styles.emptyTitle}>{t('noLocationsYet')}</Text>
            <Text style={styles.emptySubtitle}>{t('startContributing')}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: spacing.lg }]}
              onPress={() => navigation.navigate('AddLocation')}
            >
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text style={styles.primaryBtnText}>{t('addLocation')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          locations.map((loc) => (
            <View key={loc.id} style={styles.locationCard}>
              {/* Card image or placeholder */}
              <View style={styles.cardImage}>
                {loc.photos?.length > 0 ? (
                  <Image
                    source={{ uri: `${UPLOADS_BASE}/${loc.photos[0]}` }}
                    style={styles.cardImageFull}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="location" size={40} color={colors.primary} />
                )}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardCategoryRow}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{t(loc.category)}</Text>
                  </View>
                  <View style={[styles.verifiedTag, !loc.is_verified && styles.unverifiedTag]}>
                    <Text style={[styles.verifiedTagText, !loc.is_verified && styles.unverifiedTagText]}>
                      {loc.is_verified ? t('verified') : t('unverified')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardName}>{getLocalized(loc, 'name')}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  <Ionicons name="location-outline" size={14} color={colors.darkGrey} />{' '}
                  {getLocalized(loc, 'address')}
                </Text>

                {/* Feature tags */}
                {loc.accessibility_features?.length > 0 && (
                  <View style={styles.featureRow}>
                    {loc.accessibility_features.slice(0, 3).map((f, i) => (
                      <View key={i} style={styles.featureChip}>
                        <Ionicons name="checkmark" size={12} color={colors.success} />
                        <Text style={styles.featureChipText}>{t(f.type)}</Text>
                      </View>
                    ))}
                    {loc.accessibility_features.length > 3 && (
                      <View style={styles.featureChip}>
                        <Text style={styles.featureChipText}>+{loc.accessibility_features.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => navigation.navigate('EditLocation', { locationId: loc.id })}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.cardActionText}>{t('edit')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cardActionBtn, styles.cardActionDanger]}
                    onPress={() => handleDelete(loc.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.cardActionText, { color: colors.danger }]}>{t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyText: { fontSize: fontSizes.lg, color: colors.darkGrey, marginTop: spacing.lg, marginBottom: spacing.xl },

  // ── Header card ──
  headerCard: {
    backgroundColor: colors.primary, marginHorizontal: spacing.lg,
    marginTop: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.xl,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  avatarText: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.bold, color: colors.primary },
  profileInfo: { flex: 1 },
  userName: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.white },
  userEmail: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md,
    paddingVertical: 3, borderRadius: borderRadius.round, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: fontSizes.xs, color: colors.white },
  statsRow: { flexDirection: 'row', marginTop: spacing.xl, gap: spacing.sm },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center',
  },
  statNumber: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.white },
  statLabel: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // ── Section ──
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  addBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.xl, padding: spacing.xxxl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.darkGrey, marginTop: spacing.lg },
  emptySubtitle: { fontSize: fontSizes.md, color: colors.mediumGrey, marginTop: spacing.xs, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
  },
  primaryBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.white },

  // ── Location card ──
  locationCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    marginBottom: spacing.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardImage: {
    height: 140, backgroundColor: colors.grey,
    justifyContent: 'center', alignItems: 'center',
  },
  cardImageFull: { width: '100%', height: '100%' },
  cardContent: { padding: spacing.lg },
  cardCategoryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  categoryTag: {
    backgroundColor: colors.grey, paddingHorizontal: spacing.md,
    paddingVertical: 3, borderRadius: borderRadius.round,
  },
  categoryTagText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.primary },
  verifiedTag: {
    backgroundColor: colors.verifiedBg, paddingHorizontal: spacing.md,
    paddingVertical: 3, borderRadius: borderRadius.round,
  },
  unverifiedTag: { backgroundColor: colors.unverifiedBg },
  verifiedTagText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.verifiedText },
  unverifiedTagText: { color: colors.unverifiedText },
  cardName: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.black, marginBottom: 4 },
  cardAddress: { fontSize: fontSizes.sm, color: colors.darkGrey, marginBottom: spacing.sm },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.grey, paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: borderRadius.round,
  },
  featureChipText: { fontSize: fontSizes.xs, color: colors.darkGrey },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cardActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors.grey,
  },
  cardActionDanger: { backgroundColor: colors.dangerBg },
  cardActionText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.xxl, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, backgroundColor: colors.dangerBg,
  },
  logoutText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.danger },
});
