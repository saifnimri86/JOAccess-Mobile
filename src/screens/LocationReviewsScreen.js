import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';

import AnimatedPressable from '../components/AnimatedPressable';
import Chip from '../components/Chip';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';

const SORTS = [
  { key: 'date_desc',   icon: 'arrow-down',  labelKey: 'sortDateNewest' },
  { key: 'date_asc',    icon: 'arrow-up',    labelKey: 'sortDateOldest' },
  { key: 'rating_desc', icon: 'star',        labelKey: 'sortRatingHighest' },
  { key: 'rating_asc',  icon: 'star-outline', labelKey: 'sortRatingLowest' },
];

function sortReviews(reviews, mode) {
  const arr = [...reviews];
  const ts = (r) => (r?.created_at ? new Date(r.created_at).getTime() : 0);
  switch (mode) {
    case 'date_asc':    return arr.sort((a, b) => ts(a) - ts(b));
    case 'rating_desc': return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0) || ts(b) - ts(a));
    case 'rating_asc':  return arr.sort((a, b) => (a.rating || 0) - (b.rating || 0) || ts(b) - ts(a));
    case 'date_desc':
    default:            return arr.sort((a, b) => ts(b) - ts(a));
  }
}

function formatDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return d.toDateString();
  }
}

function Stars({ rating, size = 14 }) {
  const { theme } = useAccessibility();
  const rounded = Math.round(Number(rating) || 0);
  return (
    <View
      style={{ flexDirection: 'row', gap: 1 }}
      accessibilityLabel={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rounded ? 'star' : 'star-outline'}
          size={size}
          color={i <= rounded ? theme.color.star : theme.color.starEmpty}
        />
      ))}
    </View>
  );
}

function ReviewItem({ review }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  return (
    <View
      style={[
        styles.reviewItem,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radii.md,
          borderColor: theme.color.border,
          ...theme.elevation.sm,
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserRow}>
          <View style={[styles.reviewAvatar, { backgroundColor: theme.color.brandMuted }]}>
            <Ionicons name="person" size={14} color={theme.color.textBrand} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={{
                color: theme.color.text,
                fontSize: scale(theme.fontSizes.sm),
                fontWeight: theme.fontWeights.semibold,
                fontFamily: theme.fontFamily,
              }}
              numberOfLines={1}
            >
              {review.user || '—'}
            </Text>
            {review.created_at ? (
              <Text
                style={{
                  color: theme.color.textMuted,
                  fontSize: scale(theme.fontSizes.xs),
                  fontFamily: theme.fontFamily,
                  marginTop: 2,
                }}
              >
                {formatDate(review.created_at, lang)}
              </Text>
            ) : null}
          </View>
        </View>
        <Stars rating={review.rating} size={14} />
      </View>
      {review.comment ? (
        <Text
          style={{
            color: theme.color.textMuted,
            fontSize: scale(theme.fontSizes.sm),
            marginTop: 8,
            lineHeight: scale(theme.fontSizes.sm) * 1.5,
            fontFamily: theme.fontFamily,
          }}
        >
          {review.comment}
        </Text>
      ) : null}
    </View>
  );
}

export default function LocationReviewsScreen({ route, navigation }) {
  const { t, lang, isRTL, getLocalized } = useLanguage();
  const { theme, scale } = useAccessibility();

  const location = route?.params?.location || {};
  const reviews = Array.isArray(location.reviews) ? location.reviews : [];

  const [sortMode, setSortMode] = useState('date_desc');

  const sorted = useMemo(() => sortReviews(reviews, sortMode), [reviews, sortMode]);

  const locationName = getLocalized(location, 'name') || '';

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('back')}
            accessibilityRole="button"
            hitSlop={12}
            style={[
              styles.backBtn,
              { backgroundColor: theme.color.surface, borderColor: theme.color.border },
            ]}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color={theme.color.text}
            />
          </AnimatedPressable>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={{
                fontSize: scale(theme.fontSizes.lg),
                fontWeight: theme.fontWeights.bold,
                color: theme.color.text,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
              }}
            >
              {t('allReviews')}
            </Text>
            {locationName ? (
              <Text
                numberOfLines={1}
                style={{
                  fontSize: scale(theme.fontSizes.xs),
                  color: theme.color.textMuted,
                  fontFamily: theme.fontFamily,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {locationName}
              </Text>
            ) : null}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <StaggeredReveal index={0}>
          <View style={styles.sortSection}>
            <SectionHeader
              title={t('sortBy')}
              icon="swap-vertical"
              subtitle={`${reviews.length} ${reviews.length === 1 ? t('review') : t('reviews')}`}
            />
            <View style={styles.sortRow}>
              {SORTS.map((s) => (
                <Chip
                  key={s.key}
                  label={t(s.labelKey)}
                  icon={s.icon}
                  size="sm"
                  selected={sortMode === s.key}
                  tone="brand"
                  onPress={() => setSortMode(s.key)}
                />
              ))}
            </View>
          </View>
        </StaggeredReveal>

        <FlatList
          data={sorted}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={({ item }) => <ReviewItem review={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={theme.color.textMuted}
              />
              <Text
                style={{
                  color: theme.color.textMuted,
                  fontSize: scale(theme.fontSizes.md),
                  fontFamily: theme.fontFamily,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {t('noReviewsYet')}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', alignItems: 'center',
  },
  sortSection: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  sortRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  listContent: {
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4,
  },
  reviewItem: {
    padding: 14, marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  reviewUserRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1,
  },
  reviewAvatar: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 64,
  },
});
