
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  Linking, Platform, PermissionsAndroid,
  Modal, Image, FlatList, Dimensions, TouchableOpacity, AppState, Keyboard
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeInUp, FadeOutUp,
} from 'react-native-reanimated';

import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useNetwork } from '../context/NetworkContext';
import { useDialog } from '../context/DialogContext';
import * as api from '../services/api';
import { formatAgo } from '../services/cache';
import { JORDAN_CENTER, getUploadsBase } from '../config';

import ThemeCard from '../components/ThemeCard';
import AnimatedPressable from '../components/AnimatedPressable';
import Chip from '../components/Chip';
import BottomSheet from '../components/BottomSheet';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';
import SkeletonLoader from '../components/SkeletonLoader';
import { spacing, radii, fontWeights } from '../utils/theme';

const ALL_CATEGORIES = [
  'Restaurants & Cafes', 'Shopping Malls', 'Supermarkets', 'Healthcare',
  'Educational', 'Government Buildings', 'Religious Places', 'Transportation',
  'Tourist Attractions', 'Beauty & Wellness', 'Parks', 'Entertainment',
  'Hotels', 'Banks & ATMs', 'Sports & Fitness',
];

const ALL_FEATURES = [
  'wheelchair_ramp', 'accessible_restroom', 'braille_signage',
  'accessible_parking', 'elevator', 'audio_assistance',
  'wide_doorways', 'automatic_doors',
];

const REPORT_REASONS = [
  { key: 'inaccurateInfo', val: 'Inaccurate Information' },
  { key: 'closedLocation', val: 'Location Closed/Moved' },
  { key: 'inappropriate', val: 'Inappropriate Content' },
  { key: 'safetyIssue', val: 'Safety Issue' },
  { key: 'other', val: 'Other' },
];

export default function MapScreen({ navigation }) {
  const { t, lang, isRTL, getLocalized } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { theme, scale, announce, colorBlindMode, highContrast, prefersReducedMotion } = useAccessibility();
  const { isOnline, markOffline } = useNetwork();
  const { showDialog } = useDialog();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const webViewRef = useRef(null);
  const webViewReady = useRef(false);
  const isFirstFocusRef = useRef(true);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(new Set(ALL_CATEGORIES));
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showRateModal, setShowRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getLocations();
      // api.js attaches these markers on cache fallback
      if (data._fromCache) {
        setFromCache(true);
        setCacheTimestamp(data._lastUpdated);
        markOffline();
      } else {
        setFromCache(false);
        setCacheTimestamp(null);
      }
      setLocations(data);
    } catch (err) {
      setLoadError(err.message || t('networkError'));
      if (err.status === 0) markOffline();
    } finally {
      setLoading(false);
    }
  }, [t, markOffline]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  // refreshes without showing the loading skeleton
  const silentRefresh = useCallback(async () => {
    try {
      const data = await api.getLocations();
      if (data._fromCache) {
        setFromCache(true);
        setCacheTimestamp(data._lastUpdated);
        markOffline();
      } else {
        setFromCache(false);
        setCacheTimestamp(null);
      }
      setLocations(data);
    } catch {}
  }, [markOffline]);

  // refresh on focus + poll while focused; pauses on other tabs
  const MAP_POLL_INTERVAL_MS = 30 * 1000;

  useFocusEffect(useCallback(() => {
    if (isFirstFocusRef.current) {
      isFirstFocusRef.current = false;
    } else {
      silentRefresh();
    }
    const id = setInterval(silentRefresh, MAP_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [silentRefresh]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') silentRefresh();
    });
    return () => sub.remove();
  }, [silentRefresh]);

  // keep the open detail sheet in sync with the latest fetch
  useEffect(() => {
    setSelectedLocation((prev) => {
      if (!prev) return prev;
      const updated = locations.find((l) => l.id === prev.id);
      return updated || prev;
    });
  }, [locations]);

  // other tabs jump here by setting route.params.focusLocationId
  const focusLocationId = route.params?.focusLocationId;
  useEffect(() => {
    if (focusLocationId == null) return;
    const local = locations.find((l) => l.id === focusLocationId);
    if (local) {
      setSelectedLocation(local);
      setShowDetail(true);
      if (webViewRef.current && webViewReady.current) {
        webViewRef.current.injectJavaScript(
          `if(typeof map!=='undefined'){map.flyTo([${local.latitude},${local.longitude}],16,{duration:0.8});}true;`
        );
      }
      navigation.setParams({ focusLocationId: undefined });
      return;
    }
    // not in the list yet — direct fetch so the chat→map jump isn't a no-op
    if (locations.length > 0) {
      api.getLocation(focusLocationId).then((loc) => {
        if (!loc) return;
        setSelectedLocation(loc);
        setShowDetail(true);
        if (webViewRef.current && webViewReady.current
            && loc.latitude != null && loc.longitude != null) {
          webViewRef.current.injectJavaScript(
            `if(typeof map!=='undefined'){map.flyTo([${loc.latitude},${loc.longitude}],16,{duration:0.8});}true;`
          );
        }
      }).catch(() => {});
      navigation.setParams({ focusLocationId: undefined });
    }
  }, [focusLocationId, locations, navigation]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (!selectedCategories.has(loc.category)) return false;

      if (selectedFeatures.size > 0) {
        const locFeatureTypes = (loc.accessibility_features || []).map((f) => f.type);
        for (const feat of selectedFeatures) {
          if (!locFeatureTypes.includes(feat)) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = (
          (loc.name || '').toLowerCase().includes(q) ||
          (loc.name_ar || '').toLowerCase().includes(q) ||
          (loc.address || '').toLowerCase().includes(q) ||
          (loc.address_ar || '').toLowerCase().includes(q)
        );
        if (!match) return false;
      }
      return true;
    });
  }, [locations, selectedCategories, selectedFeatures, searchQuery]);

  const resultCount = filteredLocations.length;
  const prevCountRef = useRef(resultCount);
  useEffect(() => {
    if (prevCountRef.current === resultCount) return;
    prevCountRef.current = resultCount;
    if (!loading) {
      announce(lang === 'ar'
        ? `${resultCount} نتيجة`
        : `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`);
    }
  }, [resultCount, loading, announce, lang]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const matches = locations
      .filter((loc) =>
        (loc.name || '').toLowerCase().includes(q) ||
        (loc.name_ar || '').toLowerCase().includes(q) ||
        (loc.address || '').toLowerCase().includes(q) ||
        (loc.address_ar || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
    setSearchSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [searchQuery, locations]);

  const mapHtml = useMemo(
    () => generateMapHtml(theme.mode, colorBlindMode, highContrast),
    [theme.mode, colorBlindMode, highContrast]
  );

  // inject markers without a full webview reload
  const injectMarkers = useCallback((locs) => {
    if (!webViewRef.current || !webViewReady.current) return;
    const markersData = locs.map((loc) => ({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
      name: lang === 'ar' ? (loc.name_ar || loc.name) : loc.name,
      verified: loc.is_verified,
      category: loc.category,
    }));
    webViewRef.current.injectJavaScript(
      `if(typeof window.updateMarkers==='function'){window.updateMarkers(${JSON.stringify(markersData)});}true;`
    );
  }, [lang]);

  // reset readiness when HTML template rebuilds (theme/lang change)
  useEffect(() => { webViewReady.current = false; }, [mapHtml]);

  useEffect(() => { injectMarkers(filteredLocations); }, [filteredLocations, injectMarkers]);

  const onWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerClick') {
        const loc = locations.find((l) => l.id === msg.locationId);
        if (loc) {
          setSelectedLocation(loc);
          setShowDetail(true);
          announce(getLocalized(loc, 'name'));
        }
        setSearchSuggestions([]);
        setShowSuggestions(false);
        Keyboard.dismiss();
      } else if (msg.type === 'mapClick') {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        Keyboard.dismiss();
      }
    } catch { }
  };

  async function locateUser() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: lang === 'ar' ? 'إذن الموقع' : 'Location permission',
            message: lang === 'ar'
              ? 'يحتاج JOAccess موقعك لإظهاره على الخريطة.'
              : 'JOAccess needs your location to show it on the map.',
            buttonPositive: lang === 'ar' ? 'موافق' : 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showDialog(t('error'), lang === 'ar' ? 'تم رفض إذن الموقع' : 'Location permission denied');
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const isDark = theme.mode === 'dark';
          const js = `
            if (typeof map !== 'undefined') {
              map.flyTo([${latitude}, ${longitude}], 15, { duration: 0.9 });
              if (window._userMarker) map.removeLayer(window._userMarker);
              window._userMarker = L.circleMarker([${latitude}, ${longitude}], {
                radius: 10, fillColor: '${isDark ? '#B33838' : '#4285F4'}',
                fillOpacity: 1, color: '#fff', weight: 3
              }).addTo(map);
              if (window._userPulse) map.removeLayer(window._userPulse);
              window._userPulse = L.circleMarker([${latitude}, ${longitude}], {
                radius: 18, fillColor: '${isDark ? '#B33838' : '#4285F4'}',
                fillOpacity: 0.15, color: 'transparent'
              }).addTo(map);
            }
          `;
          webViewRef.current?.injectJavaScript(js);
          announce(lang === 'ar' ? 'تم تحديد موقعك' : 'Location found');
        },
        () => { showDialog(t('error'), lang === 'ar' ? 'تعذّر تحديد الموقع' : 'Could not get location'); },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    } catch {
      showDialog(t('error'), lang === 'ar' ? 'تعذّر تحديد الموقع' : 'Could not get location');
    }
  }

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleFeature = (feat) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feat)) next.delete(feat); else next.add(feat);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories(new Set(ALL_CATEGORIES));
    setSelectedFeatures(new Set());
    announce(lang === 'ar' ? 'تم مسح عوامل التصفية' : 'Filters cleared');
  };

  const handleSuggestionSelect = useCallback((loc) => {
    setSearchQuery(lang === 'ar' ? (loc.name_ar || loc.name) : loc.name);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setSelectedLocation(loc);
    setShowDetail(true);
    announce(getLocalized(loc, 'name'));
  }, [lang, announce, getLocalized]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.size < ALL_CATEGORIES.length) count++;
    if (selectedFeatures.size > 0) count++;
    return count;
  }, [selectedCategories, selectedFeatures]);

  async function submitRating() {
    if (rateStars < 1) {
      showDialog(t('error'), lang === 'ar' ? 'اختر تقييماً' : 'Select a rating');
      return;
    }
    if (!isAuthenticated) {
      showDialog(t('error'), t('loginRequired'));
      return;
    }
    setRatingSubmitting(true);
    try {
      await api.addReview(selectedLocation.id, rateStars, rateComment);
      showDialog(t('success'), t('submitRating'));
      setShowRateModal(false);
      setRateStars(0);
      setRateComment('');
      announce(lang === 'ar' ? 'تم إرسال التقييم' : 'Rating submitted');
      loadLocations();
    } catch (err) {
      showDialog(t('error'), err.message || 'Failed');
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function submitReport() {
    if (!reportReason) {
      showDialog(t('error'), lang === 'ar' ? 'اختر سبباً' : 'Select a reason');
      return;
    }
    if (!isAuthenticated) {
      showDialog(t('error'), t('loginRequired'));
      return;
    }
    setReportSubmitting(true);
    try {
      await api.reportLocation(selectedLocation.id, reportReason, reportDesc);
      showDialog(t('success'), t('submitReport'));
      setShowReportModal(false);
      setReportReason('');
      setReportDesc('');
      announce(lang === 'ar' ? 'تم إرسال البلاغ' : 'Report submitted');
    } catch (err) {
      showDialog(t('error'), err.message || 'Failed');
    } finally {
      setReportSubmitting(false);
    }
  }

  function openDirections(lat, lng) {
    const url = Platform.OS === 'ios'
      ? `maps:0,0?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  }

  const s = makeStyles(theme, insets);

  return (
    <View style={[s.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView
        style={s.root}
        edges={['left', 'right']}
      >
        {loading ? (
          <MapSkeleton />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadLocations} />
        ) : (
          <WebView
            key={theme.mode}
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={s.map}
            onMessage={onWebViewMessage}
            onLoadEnd={() => {
              webViewReady.current = true;
              injectMarkers(filteredLocations);
            }}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            geolocationEnabled
            cacheEnabled={true}
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            androidLayerType="hardware"
          />
        )}

        <View
          style={[s.searchBarContainer, { top: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <ThemeCard
            style={[s.searchBar, { borderRadius: theme.radii.pill, backgroundColor: theme.color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.border, ...theme.elevation.md }]}
          >
            <View style={s.searchInner}>
              <Ionicons name="search" size={20} color={theme.color.textMuted} />
              <TextInput
                style={[
                  s.searchInput,
                  {
                    color: theme.color.text,
                    fontSize: scale(theme.fontSizes.md),
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: theme.fontFamily,
                  },
                ]}
                placeholder={t('searchLocations')}
                placeholderTextColor={theme.color.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel={t('searchLocations')}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <AnimatedPressable
                  onPress={() => { setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false); }}
                  accessibilityLabel={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                  hitSlop={10}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.color.textMuted} />
                </AnimatedPressable>
              ) : null}
              <AnimatedPressable
                onPressIn={() => {
                  setSearchSuggestions([]);
                  setShowSuggestions(false);
                  Keyboard.dismiss();
                  // break out of render queue so the scale animation plays
                  setTimeout(() => setShowFilters(true), 16);
                }}
                accessibilityLabel={lang === 'ar' ? 'عوامل التصفية' : 'Filters'}
                accessibilityHint={lang === 'ar'
                  ? 'يفتح لوحة تصفية الفئات والميزات'
                  : 'Opens the filters panel'}
                style={[s.filterButton, { backgroundColor: theme.color.brand }]}
              >
                <Ionicons name="options-outline" size={18} color={theme.color.textOnBrand} />
                {activeFilterCount > 0 ? (
                  <View style={[s.filterBadge, {
                    backgroundColor: theme.color.star,
                    borderColor: theme.color.surface,
                  }]}>
                    <Text style={[s.filterBadgeText, {
                      color: theme.color.text,
                      fontFamily: theme.fontFamily,
                    }]}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </AnimatedPressable>
            </View>
          </ThemeCard>

          {showSuggestions ? (
            <Animated.View
              entering={prefersReducedMotion ? undefined : FadeInUp.duration(200)}
              exiting={prefersReducedMotion ? undefined : FadeOutUp.duration(150)}
              style={[s.suggestionsDropdown, {
                backgroundColor: theme.color.surface,
                borderColor: theme.color.border,
                borderRadius: theme.radii.md,
                ...theme.elevation.md,
              }]}
            >
              {searchSuggestions.map((loc, i) => (
                <AnimatedPressable
                  key={loc.id}
                  onPress={() => handleSuggestionSelect(loc)}
                  accessibilityRole="button"
                  accessibilityLabel={getLocalized(loc, 'name')}
                  style={[s.suggestionItem, {
                    borderBottomColor: theme.color.border,
                    borderBottomWidth: i < searchSuggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                  }]}
                >
                  <View style={[s.suggestionIconBox, {
                    backgroundColor: theme.categoryColor?.[loc.category] || theme.color.brand,
                  }]}>
                    <Ionicons name={theme.categoryIcon?.[loc.category] || 'pin'} size={14} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{
                      color: theme.color.text,
                      fontFamily: theme.fontFamily,
                      fontSize: scale(theme.fontSizes.sm),
                      fontWeight: '600',
                    }} numberOfLines={1}>
                      {getLocalized(loc, 'name')}
                    </Text>
                    {getLocalized(loc, 'address') ? (
                      <Text style={{
                        color: theme.color.textMuted,
                        fontFamily: theme.fontFamily,
                        fontSize: scale(theme.fontSizes.xs),
                        marginTop: 1,
                      }} numberOfLines={1}>
                        {getLocalized(loc, 'address')}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={theme.color.textMuted} />
                </AnimatedPressable>
              ))}
            </Animated.View>
          ) : null}

          {!loading && !loadError ? (
            <View style={s.pillRow}>
              <ResultCountPill count={resultCount} />
              {fromCache ? <OfflinePill timestamp={cacheTimestamp} /> : null}
            </View>
          ) : null}
        </View>

        <View
          style={[s.fabContainer, { bottom: Math.max(insets.bottom, 8) + 90 }]}
          pointerEvents="box-none"
        >
          <AnimatedPressable
            onPress={() => {
              setSearchSuggestions([]);
              setShowSuggestions(false);
              Keyboard.dismiss();
              locateUser();
            }}
            accessibilityLabel={lang === 'ar' ? 'موقعي' : 'My location'}
            style={[
              s.fab,
              {
                backgroundColor: theme.color.surface,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Ionicons name="locate" size={22} color={theme.color.brand} />
          </AnimatedPressable>
        </View>

        <BottomSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          title={t('filters')}
          scrollable
          footer={
            <AnimatedPressable
              onPress={clearFilters}
              accessibilityLabel={t('clearFilters')}
              style={[
                s.footerBtn,
                {
                  backgroundColor: theme.color.brand,
                  borderColor: theme.color.brand,
                  borderWidth: 1,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Text style={{
                color: theme.color.textOnBrand,
                fontSize: scale(theme.fontSizes.md),
                fontWeight: theme.fontWeights.bold,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
                flexShrink: 1,
              }}>{t('clearFilters')}</Text>
            </AnimatedPressable>
          }
        >
          <SectionHeader
            title={t('categories')}
            icon="grid"
            subtitle={lang === 'ar'
              ? `${selectedCategories.size} من ${ALL_CATEGORIES.length} محدد`
              : `${selectedCategories.size} of ${ALL_CATEGORIES.length} selected`}
          />
          <View style={s.chipFlow}>
            {ALL_CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={t(cat)}
                icon={theme.categoryIcon[cat] || 'pin'}
                selected={selectedCategories.has(cat)}
                onPress={() => toggleCategory(cat)}
                tone="brand"
                size="sm"
              />
            ))}
          </View>

          <View style={{ height: 20 }} />

          <SectionHeader
            title={t('accessibilityFeatures')}
            icon="accessibility"
            subtitle={selectedFeatures.size === 0
              ? (lang === 'ar' ? 'لا توجد فلاتر' : 'No filters')
              : (lang === 'ar' ? `${selectedFeatures.size} محدد` : `${selectedFeatures.size} selected`)}
          />
          <View style={s.chipFlow}>
            {ALL_FEATURES.map((feat) => (
              <Chip
                key={feat}
                label={t(feat)}
                icon={theme.featureIcon[feat] || 'checkmark'}
                selected={selectedFeatures.has(feat)}
                onPress={() => toggleFeature(feat)}
                tone="brand"
                size="sm"
              />
            ))}
          </View>
        </BottomSheet>

        <BottomSheet visible={showDetail} onClose={() => setShowDetail(false)} scrollable>
          {selectedLocation ? (
            <LocationDetail
              location={selectedLocation}
              onDirections={() => openDirections(selectedLocation.latitude, selectedLocation.longitude)}
              onRate={() => {
                if (!isAuthenticated) { showDialog(t('error'), t('loginRequired')); return; }
                setRateStars(0); setRateComment('');
                setShowRateModal(true);
              }}
              onReport={() => {
                if (!isAuthenticated) { showDialog(t('error'), t('loginRequired')); return; }
                setReportReason(''); setReportDesc('');
                setShowReportModal(true);
              }}
              onViewAllReviews={() => {
                setShowDetail(false);
                navigation.navigate('LocationReviews', { location: selectedLocation });
              }}
            />
          ) : null}
        </BottomSheet>

        <BottomSheet visible={showRateModal} onClose={() => setShowRateModal(false)} title={t('rateLocation')} avoidKeyboard>
          <RatePanel
            stars={rateStars} setStars={setRateStars}
            comment={rateComment} setComment={setRateComment}
            submitting={ratingSubmitting}
            onSubmit={submitRating}
            onCancel={() => setShowRateModal(false)}
          />
        </BottomSheet>

        <BottomSheet visible={showReportModal} onClose={() => setShowReportModal(false)} title={t('reportLocation')} avoidKeyboard>
          <ReportPanel
            reason={reportReason} setReason={setReportReason}
            desc={reportDesc} setDesc={setReportDesc}
            submitting={reportSubmitting}
            onSubmit={submitReport}
            onCancel={() => setShowReportModal(false)}
          />
        </BottomSheet>
      </SafeAreaView>
    </View>
  );
}

function ResultCountPill({ count }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.color.glassBgStrong,
        borderWidth: 1, borderColor: theme.color.glassBorder,
        ...theme.elevation.sm,
      }}
      accessible
      accessibilityLabel={lang === 'ar' ? `${count} نتيجة` : `${count} results`}
    >
      <Text style={{
        fontSize: scale(theme.fontSizes.xs),
        fontWeight: theme.fontWeights.semibold,
        color: theme.color.textMuted,
        fontFamily: theme.fontFamily,
      }}>
        {lang === 'ar' ? `${count} نتيجة` : `${count} ${count === 1 ? 'result' : 'results'}`}
      </Text>
    </View>
  );
}

function OfflinePill({ timestamp }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  const ago = formatAgo(timestamp, lang);
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.color.warningBg,
        borderWidth: 1, borderColor: theme.color.warning,
      }}
      accessible
      accessibilityLabel={lang === 'ar'
        ? `بيانات مخزنة، ${ago}`
        : `Cached data, ${ago}`}
    >
      <Ionicons name="cloud-offline" size={12} color={theme.color.warning} />
      <Text style={{
        fontSize: scale(theme.fontSizes.xs),
        fontWeight: theme.fontWeights.semibold,
        color: theme.color.warning,
        fontFamily: theme.fontFamily,
      }}>
        {lang === 'ar' ? `مخزّن · ${ago}` : `Cached · ${ago}`}
      </Text>
    </View>
  );
}

function MapSkeleton() {
  const { theme } = useAccessibility();
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bgSunken, padding: 16 }}>
      <SkeletonLoader height={200} style={{ marginBottom: 16 }} />
      <SkeletonLoader height={80} style={{ marginBottom: 12 }} />
      <SkeletonLoader height={80} style={{ marginBottom: 12 }} />
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  return (
    <View style={{
      flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
      backgroundColor: theme.color.bg,
    }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: theme.color.dangerBg,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      }}>
        <Ionicons name="cloud-offline" size={32} color={theme.color.danger} />
      </View>
      <Text style={{
        fontSize: scale(theme.fontSizes.lg),
        fontWeight: theme.fontWeights.bold,
        color: theme.color.text,
        fontFamily: theme.fontFamily,
        marginBottom: 8, textAlign: 'center',
      }}>
        {lang === 'ar' ? 'تعذّر تحميل الأماكن' : "Couldn't load locations"}
      </Text>
      <Text style={{
        fontSize: scale(theme.fontSizes.sm),
        color: theme.color.textMuted,
        fontFamily: theme.fontFamily,
        marginBottom: 20, textAlign: 'center',
      }}>{message}</Text>
      <AnimatedPressable
        onPress={onRetry}
        accessibilityLabel={lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        style={{
          paddingHorizontal: 24, paddingVertical: 12,
          backgroundColor: theme.color.brand,
          borderRadius: theme.radii.md,
        }}
      >
        <Text style={{
          color: theme.color.textOnBrand,
          fontWeight: theme.fontWeights.semibold,
          fontSize: scale(theme.fontSizes.md),
          fontFamily: theme.fontFamily,
        }}>{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}</Text>
      </AnimatedPressable>
    </View>
  );
}

function getLatestReview(reviews) {
  if (!reviews || reviews.length === 0) return null;
  let latest = reviews[0];
  let latestTs = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
  for (let i = 1; i < reviews.length; i++) {
    const ts = reviews[i]?.created_at ? new Date(reviews[i].created_at).getTime() : 0;
    if (ts > latestTs) { latest = reviews[i]; latestTs = ts; }
  }
  return latest;
}

function LocationDetail({ location, onDirections, onRate, onReport, onViewAllReviews }) {
  const { t, lang, isRTL, getLocalized } = useLanguage();
  const { theme, scale } = useAccessibility();
  const categoryAccent = theme.categoryColor[location.category] || theme.color.brand;
  const [fullScreenIndex, setFullScreenIndex] = useState(null);
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

  return (
    <View>
      <StaggeredReveal index={0}>
        <View style={[detailStyles.hero, { backgroundColor: categoryAccent, borderRadius: theme.radii.lg }]}>
          <View style={detailStyles.heroIconBox}>
            <Ionicons name={theme.categoryIcon[location.category] || 'pin'} size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: '#FFFFFF', fontSize: scale(theme.fontSizes.xl),
              fontWeight: theme.fontWeights.heavy,
              fontFamily: theme.fontFamily,
            }} accessibilityRole="header" numberOfLines={2}>
              {getLocalized(location, 'name')}
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.85)', fontSize: scale(theme.fontSizes.sm),
              marginTop: 2, fontFamily: theme.fontFamily,
            }}>{t(location.category)}</Text>
          </View>
        </View>
      </StaggeredReveal>

      <StaggeredReveal index={1}>
        <View style={detailStyles.metaRow}>
          <Chip
            label={location.is_verified ? t('verified') : t('unverified')}
            icon={location.is_verified ? 'checkmark-circle' : 'time'}
            tone={location.is_verified ? 'success' : 'warning'}
            selected size="sm"
          />
          <View style={detailStyles.ratingBadge}>
            <Stars rating={location.avg_rating} />
            <Text style={{
              color: theme.color.textMuted,
              fontSize: scale(theme.fontSizes.sm),
              fontWeight: theme.fontWeights.semibold,
              marginLeft: 6, fontFamily: theme.fontFamily,
            }}>
              {Number(location.avg_rating || 0).toFixed(1)}
              {' · '}{location.review_count || 0} {t('reviews')}
            </Text>
          </View>
        </View>
      </StaggeredReveal>

      {getLocalized(location, 'description') ? (
        <StaggeredReveal index={2}>
          <View style={detailStyles.section}>
            <SectionHeader title={t('description')} icon="information-circle" />
            <Text style={{
              color: theme.color.text,
              fontSize: scale(theme.fontSizes.md),
              lineHeight: scale(theme.fontSizes.md) * 1.5,
              fontFamily: theme.fontFamily,
            }}>{getLocalized(location, 'description')}</Text>
          </View>
        </StaggeredReveal>
      ) : null}

      {getLocalized(location, 'address') ? (
        <StaggeredReveal index={3}>
          <View style={detailStyles.section}>
            <SectionHeader title={t('address')} icon="location" />
            <Text style={{
              color: theme.color.text,
              fontSize: scale(theme.fontSizes.md),
              lineHeight: scale(theme.fontSizes.md) * 1.5,
              fontFamily: theme.fontFamily,
            }}>{getLocalized(location, 'address')}</Text>
          </View>
        </StaggeredReveal>
      ) : null}

      {location.accessibility_features?.length > 0 ? (
        <StaggeredReveal index={4}>
          <View style={detailStyles.section}>
            <SectionHeader title={t('accessibilityFeatures')} icon="accessibility" />
            <View style={detailStyles.featureChipRow}>
              {location.accessibility_features.map((f, i) => (
                <Chip
                  key={`${f.type}-${i}`}
                  label={t(f.type)}
                  icon={theme.featureIcon[f.type] || 'checkmark-circle'}
                  tone="brand"
                  size="sm"
                  style={{ borderColor: theme.color.brand }}
                />
              ))}
            </View>
          </View>
        </StaggeredReveal>
      ) : null}

      {location.photos?.length > 0 ? (
        <StaggeredReveal index={5}>
          <View style={detailStyles.section}>
            <SectionHeader title={t('photos')} icon="images" />
            <GHScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
              waitFor={[]}
            >
              {location.photos.map((photoUrl, i) => {
                const uri = photoUrl.startsWith('http') ? photoUrl : `${getUploadsBase()}/${photoUrl}`;
                return (
                  <View key={i} style={{ width: 140 }}>
                    <TouchableOpacity onPress={() => setFullScreenIndex(i)} activeOpacity={0.8}>
                      <Image
                        source={{ uri }}
                        style={{ width: 140, height: 100, borderRadius: theme.radii.md, backgroundColor: theme.color.surfaceHover }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <Text style={{
                      color: theme.color.textMuted,
                      fontSize: scale(theme.fontSizes.xs),
                      fontFamily: theme.fontFamily,
                      marginTop: 4,
                      textAlign: 'center',
                    }} numberOfLines={1}>
                      {t('uploadedBy')} {location.creator || t('anonymous')}
                    </Text>
                  </View>
                );
              })}
            </GHScrollView>
          </View>
        </StaggeredReveal>
      ) : null}

      {location.reviews?.length > 0 ? (
        <StaggeredReveal index={6}>
          <View style={detailStyles.section}>
            <SectionHeader
              title={t('latestReview')}
              icon="chatbubbles"
              subtitle={`${location.reviews.length} ${location.reviews.length === 1 ? t('review') : t('reviews')}`}
            />
            <ReviewItem review={getLatestReview(location.reviews)} />
            <AnimatedPressable
              onPress={onViewAllReviews}
              accessibilityRole="button"
              accessibilityLabel={t('viewAllReviews')}
              style={[
                detailStyles.viewAllBtn,
                {
                  backgroundColor: theme.color.surface,
                  borderColor: theme.color.brand,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Ionicons
                name="list"
                size={16}
                color={theme.color.textBrand}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: theme.color.textBrand,
                  fontSize: scale(theme.fontSizes.sm),
                  fontWeight: theme.fontWeights.semibold,
                  fontFamily: theme.fontFamily,
                }}
              >
                {t('viewAllReviews')} ({location.reviews.length})
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={16}
                color={theme.color.textBrand}
                style={{ marginLeft: 6 }}
              />
            </AnimatedPressable>
          </View>
        </StaggeredReveal>
      ) : null}

      <StaggeredReveal index={7}>
        <View style={detailStyles.actionRow}>
          <ActionButton icon="navigate" label={t('directions')} onPress={onDirections} tone="brand" />
          <ActionButton icon="star" label={t('rateLocation')} onPress={onRate} tone="secondary" />
          <ActionButton icon="flag" label={t('reportLocation')} onPress={onReport} tone="danger" />
        </View>
      </StaggeredReveal>

      <View style={{ height: 20 }} />

      <Modal
        visible={fullScreenIndex !== null}
        transparent={true}
        onRequestClose={() => setFullScreenIndex(null)}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <TouchableOpacity
            style={{
              position: 'absolute', top: 50, right: theme.spacing.xl,
              zIndex: 20, padding: theme.spacing.sm + 2,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: theme.radii.pill,
            }}
            onPress={() => setFullScreenIndex(null)}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          {fullScreenIndex !== null && (
            <View style={{ position: 'absolute', top: 55, left: theme.spacing.xl, zIndex: 20 }}>
              <Text style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: scale(theme.fontSizes.sm),
                fontWeight: theme.fontWeights.semibold,
                fontFamily: theme.fontFamily,
              }}>
                {fullScreenIndex + 1} / {location.photos.length}
              </Text>
            </View>
          )}

          {fullScreenIndex !== null && (
            <FlatList
              data={location.photos}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={fullScreenIndex}
              getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setFullScreenIndex(idx);
              }}
              renderItem={({ item: photoUrl }) => {
                const uri = photoUrl.startsWith('http') ? photoUrl : `${getUploadsBase()}/${photoUrl}`;
                return (
                  <View style={{ width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' }}>
                    <Image source={{ uri }} style={{ width: SCREEN_W, height: SCREEN_H * 0.75 }} resizeMode="contain" />
                    <Text style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: scale(theme.fontSizes.sm),
                      fontFamily: theme.fontFamily,
                      marginTop: theme.spacing.md,
                    }}>
                      {t('uploadedBy')} {location.creator || t('anonymous')}
                    </Text>
                  </View>
                );
              }}
            />
          )}

          {location.photos?.length > 1 && (
            <View style={{
              position: 'absolute', bottom: 40, alignSelf: 'center',
              flexDirection: 'row', gap: theme.spacing.sm,
            }}>
              {location.photos.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === fullScreenIndex ? 18 : 8,
                    height: 8,
                    borderRadius: theme.radii.pill,
                    backgroundColor: i === fullScreenIndex ? '#FFF' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function ReviewItem({ review }) {
  const { theme, scale } = useAccessibility();
  return (
    <View style={[
      detailStyles.reviewItem,
      {
        backgroundColor: theme.color.surface,
        borderRadius: theme.radii.md,
        borderColor: theme.color.border,
        ...theme.elevation.sm,
      },
    ]}>
      <View style={detailStyles.reviewHeader}>
        <View style={detailStyles.reviewUserRow}>
          <View style={[detailStyles.reviewAvatar, { backgroundColor: theme.color.brandMuted }]}>
            <Ionicons name="person" size={12} color={theme.color.textBrand} />
          </View>
          <Text style={{
            color: theme.color.text,
            fontSize: scale(theme.fontSizes.sm),
            fontWeight: theme.fontWeights.semibold,
            fontFamily: theme.fontFamily,
          }}>{review.user}</Text>
        </View>
        <Stars rating={review.rating} size={12} />
      </View>
      {review.comment ? (
        <Text style={{
          color: theme.color.textMuted,
          fontSize: scale(theme.fontSizes.sm),
          marginTop: 6,
          lineHeight: scale(theme.fontSizes.sm) * 1.5,
          fontFamily: theme.fontFamily,
        }}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

function ActionButton({ icon, label, onPress, tone }) {
  const { theme, scale } = useAccessibility();
  const styles = tone === 'brand'
    ? { bg: theme.color.brand, fg: theme.color.textOnBrand, bd: theme.color.brand }
    : tone === 'danger'
      ? { bg: theme.color.dangerBg, fg: theme.color.danger, bd: 'transparent' }
      : { bg: theme.color.surface, fg: theme.color.textBrand, bd: theme.color.border };
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        detailStyles.actionBtn,
        {
          backgroundColor: styles.bg,
          borderColor: styles.bd,
          borderRadius: theme.radii.md,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={styles.fg} />
      <Text style={{
        color: styles.fg,
        fontSize: scale(theme.fontSizes.sm),
        fontWeight: theme.fontWeights.semibold,
        marginLeft: 6, fontFamily: theme.fontFamily,
        textAlign: 'center',
        flexShrink: 1,
      }}>{label}</Text>
    </AnimatedPressable>
  );
}

function Stars({ rating, size = 14 }) {
  const { theme } = useAccessibility();
  const rounded = Math.round(Number(rating) || 0);
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`${rating} out of 5 stars`}>
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

function RatePanel({ stars, setStars, comment, setComment, submitting, onSubmit, onCancel }) {
  const { t, lang, isRTL } = useLanguage();
  const { theme, scale, prefersReducedMotion } = useAccessibility();

  return (
    <View>
      <Text style={{
        color: theme.color.textMuted,
        fontSize: scale(theme.fontSizes.md),
        textAlign: 'center', marginBottom: 20,
        fontFamily: theme.fontFamily,
      }}>
        {lang === 'ar' ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
      </Text>

      <View style={rateStyles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <AnimatedStar
            key={i} index={i}
            selected={i <= stars}
            onPress={() => setStars(i)}
            reducedMotion={prefersReducedMotion}
          />
        ))}
      </View>

      <TextInput
        style={[
          rateStyles.comment,
          {
            color: theme.color.text,
            backgroundColor: theme.color.bgSunken,
            borderColor: theme.color.border,
            borderRadius: theme.radii.md,
            textAlign: isRTL ? 'right' : 'left',
            fontFamily: theme.fontFamily,
            fontSize: scale(theme.fontSizes.md),
          },
        ]}
        placeholder={t('addComment')}
        placeholderTextColor={theme.color.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <View style={rateStyles.buttonRow}>
        <AnimatedPressable
          onPress={onCancel}
          accessibilityLabel={t('cancel')}
          style={[rateStyles.btn, {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border, borderWidth: 1,
            borderRadius: theme.radii.md,
          }]}
        >
          <Text style={{
            color: theme.color.textMuted,
            fontSize: scale(theme.fontSizes.md),
            fontWeight: theme.fontWeights.semibold,
            fontFamily: theme.fontFamily,
            textAlign: 'center',
            flexShrink: 1,
          }}>{t('cancel')}</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onSubmit}
          disabled={submitting}
          accessibilityLabel={t('submitRating')}
          style={[rateStyles.btn, {
            backgroundColor: theme.color.brand,
            borderRadius: theme.radii.md,
          }]}
        >
          <Text style={{
            color: theme.color.textOnBrand,
            fontSize: scale(theme.fontSizes.md),
            fontFamily: theme.fontFamily,
            textAlign: 'center',
            flexShrink: 1,
          }}>{submitting ? '...' : t('submitRating')}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function AnimatedStar({ index, selected, onPress, reducedMotion }) {
  const { theme } = useAccessibility();
  const sv = useSharedValue(selected ? 1.1 : 1);

  useEffect(() => {
    if (reducedMotion) { sv.value = 1; return; }
    if (selected) {
      sv.value = withSpring(1.2, theme.motion.spring.bouncy);
      setTimeout(() => { sv.value = withSpring(1, theme.motion.spring.gentle); }, 150);
    } else {
      sv.value = withTiming(1, { duration: 120 });
    }
  }, [selected, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={`${index} star${index > 1 ? 's' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={selected ? 'star' : 'star-outline'}
          size={44}
          color={selected ? theme.color.star : theme.color.starEmpty}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

function ReportPanel({ reason, setReason, desc, setDesc, submitting, onSubmit, onCancel }) {
  const { t, lang, isRTL } = useLanguage();
  const { theme, scale } = useAccessibility();

  return (
    <View>
      <Text style={{
        color: theme.color.textMuted,
        fontSize: scale(theme.fontSizes.md),
        marginBottom: 16, textAlign: isRTL ? 'right' : 'left',
        fontFamily: theme.fontFamily,
      }}>{lang === 'ar' ? 'ما سبب الإبلاغ؟' : 'What\'s the issue?'}</Text>

      {REPORT_REASONS.map((opt, i) => {
        const selected = reason === opt.key;
        return (
          <AnimatedPressable
            key={opt.key}
            onPress={() => setReason(opt.key)}
            accessibilityLabel={t(opt.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              reportStyles.reason,
              {
                backgroundColor: selected ? theme.color.dangerBg : 'transparent',
                borderColor: selected ? theme.color.danger : theme.color.border,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                marginBottom: i < REPORT_REASONS.length - 1 ? 8 : 0,
              },
            ]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? theme.color.danger : theme.color.textMuted}
            />
            <Text style={{
              color: selected ? theme.color.danger : theme.color.text,
              fontSize: scale(theme.fontSizes.md),
              fontWeight: selected ? theme.fontWeights.semibold : theme.fontWeights.regular,
              marginLeft: 12, fontFamily: theme.fontFamily, flex: 1,
            }}>{t(opt.key)}</Text>
          </AnimatedPressable>
        );
      })}

      <TextInput
        style={[
          reportStyles.desc,
          {
            color: theme.color.text,
            backgroundColor: theme.color.bgSunken,
            borderColor: theme.color.border,
            borderRadius: theme.radii.md,
            textAlign: isRTL ? 'right' : 'left',
            fontFamily: theme.fontFamily,
            fontSize: scale(theme.fontSizes.md),
            marginTop: 16,
          },
        ]}
        placeholder={t('reportDescription')}
        placeholderTextColor={theme.color.textMuted}
        value={desc}
        onChangeText={setDesc}
        multiline
      />

      <View style={reportStyles.buttonRow}>
        <AnimatedPressable
          onPress={onCancel}
          accessibilityLabel={t('cancel')}
          style={[reportStyles.btn, {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border, borderWidth: 1,
            borderRadius: theme.radii.md,
          }]}
        >
          <Text style={{
            color: theme.color.textMuted,
            fontSize: scale(theme.fontSizes.md),
            fontWeight: theme.fontWeights.semibold,
            fontFamily: theme.fontFamily,
            textAlign: 'center',
            flexShrink: 1,
          }}>{t('cancel')}</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onSubmit}
          disabled={submitting}
          accessibilityLabel={t('submitReport')}
          style={[reportStyles.btn, {
            backgroundColor: theme.color.danger,
            borderRadius: theme.radii.md,
          }]}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: scale(theme.fontSizes.md),
            fontFamily: theme.fontFamily,
            textAlign: 'center',
            flexShrink: 1,
          }}>{submitting ? '...' : t('submitReport')}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function buildMapFilter(colorBlindMode, highContrast) {
  const parts = [];
  if (highContrast) parts.push('contrast(1.2) brightness(1.05)');
  if (colorBlindMode === 'achromatopsia') parts.push('grayscale(100%)');
  else if (['protanopia', 'deuteranopia', 'tritanopia'].includes(colorBlindMode)) parts.push('url(#cb-filter)');
  return parts.join(' ');
}

function buildColorBlindSVG(colorBlindMode) {
  const matrices = {
    protanopia: '0.567 0.433 0     0 0  0.558 0.442 0     0 0  0     0.242 0.758 0 0  0 0 0 1 0',
    deuteranopia: '0.625 0.375 0     0 0  0.7   0.3   0     0 0  0     0.3   0.7   0 0  0 0 0 1 0',
    tritanopia: '0.95  0.05  0     0 0  0     0.433 0.567 0 0  0     0.475 0.525 0 0  0 0 0 1 0',
  };
  const m = matrices[colorBlindMode];
  if (!m) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden"><defs><filter id="cb-filter" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${m}"/></filter></defs></svg>`;
}

function generateMapHtml(themeMode, colorBlindMode = 'none', highContrast = false) {
  const isDark = themeMode === 'dark';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const mapFilter = buildMapFilter(colorBlindMode, highContrast);

  const maroon = isDark ? '#B33838' : '#800000';
  const maroonGlow = isDark ? 'rgba(179,56,56,0.65)' : 'rgba(128,0,0,0.55)';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <!-- Cache-Control directives nudge Android's WebView to cache tiles on disk -->
  <meta http-equiv="Cache-Control" content="public, max-age=2592000">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { ${mapFilter ? `filter: ${mapFilter};` : ''} }
    html, body, #map {
      width: 100%; height: 100%;
      background: ${isDark ? '#0A0707' : '#FAF7F5'};
    }
    .jo-marker-wrapper {
      width: 32px; height: 40px; position: relative;
      filter: drop-shadow(0 4px 14px ${maroonGlow});
    }
    .jo-marker-wrapper.crowded {
      filter: drop-shadow(0 2px 3px ${isDark ? 'rgba(179,56,56,0.12)' : 'rgba(128,0,0,0.10)'});
    }
    .jo-marker {
      width: 28px; height: 28px;
      background-color: ${maroon};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      position: absolute; left: 2px; top: 2px;
      border: 2px solid ${isDark ? '#0A0707' : '#FFFFFF'};
    }
    .jo-marker::after {
      content: '';
      width: 10px; height: 10px;
      background: ${isDark ? '#0A0707' : '#FFFFFF'};
      position: absolute; border-radius: 50%;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .marker-tooltip {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px; font-weight: 600;
      padding: 6px 10px; border-radius: 8px;
      border: 1px solid ${isDark ? 'rgba(179,56,56,0.3)' : 'rgba(128,0,0,0.15)'};
      background: ${isDark ? '#1F1A1A' : '#FFFFFF'};
      color: ${isDark ? '#F5EFEC' : '#1A1512'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .leaflet-control-attribution {
      background: ${isDark ? 'rgba(20,16,16,0.8)' : 'rgba(255,255,255,0.8)'};
      color: ${isDark ? '#B8AFAB' : '#6B6360'};
      font-size: 10px; border-radius: 4px;
    }
    .leaflet-bar a {
      background: ${isDark ? '#1F1A1A' : '#FFFFFF'} !important;
      color: ${maroon} !important;
      border-color: ${isDark ? '#2B2424' : '#E0E0E0'} !important;
    }
  </style>
</head>
<body>
  ${buildColorBlindSVG(colorBlindMode)}
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      zoomControlOptions: { position: 'bottomleft' },
      maxBounds: [[28.5, 34.0], [34.0, 40.0]],
      maxBoundsViscosity: 1.0,
      minZoom: 7, maxZoom: 18,
      attributionControl: true
    }).setView([${JORDAN_CENTER.lat}, ${JORDAN_CENTER.lng}], 8);

    L.tileLayer('${tileUrl}', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
      subdomains: 'abcd',
      // crossOrigin needed for webview tile caching
      crossOrigin: true
    }).addTo(map);

    map.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapClick'
      }));
    });

    window._markerGroup = L.layerGroup().addTo(map);
    window.updateMarkers = function(markers) {
      window._markerGroup.clearLayers();

      // proximity crowding: tag markers with 2+ neighbours within ~500m
      var CROWD_DEG = 0.027;
      var CROWD_THRESH = 3;
      var crowded = markers.map(function(m) {
        var count = 0;
        for (var j = 0; j < markers.length; j++) {
          if (markers[j] === m) continue;
          var dlat = markers[j].lat - m.lat;
          var dlng = markers[j].lng - m.lng;
          if (Math.sqrt(dlat * dlat + dlng * dlng) < CROWD_DEG) count++;
          if (count >= CROWD_THRESH) break;
        }
        return count >= CROWD_THRESH;
      });

      markers.forEach(function(m, idx) {
        var verifiedClass = m.verified ? ' verified' : '';
        var crowdedClass  = crowded[idx] ? ' crowded' : '';
        var icon = L.divIcon({
          html: '<div class="jo-marker-wrapper' + verifiedClass + crowdedClass + '"><div class="jo-marker"></div></div>',
          className: 'jo-marker-icon',
          iconSize: [32, 40],
          iconAnchor: [16, 36],
          popupAnchor: [0, -36]
        });
        var marker = L.marker([m.lat, m.lng], { icon: icon });
        marker.bindTooltip(m.name, { className: 'marker-tooltip', direction: 'top', offset: [0, -36] });
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick', locationId: m.id
          }));
        });
        marker.addTo(window._markerGroup);
      });
    };
  </script>
</body>
</html>
  `;
}

const makeStyles = (theme, insets) => StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },

  searchBarContainer: {
    position: 'absolute',
    left: 12, right: 12,
    zIndex: 10,
  },
  searchBar: {},
  searchInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 10, minHeight: 48,
  },
  searchInput: { flex: 1, padding: 0 },
  filterButton: {
    width: 36, height: 36, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute', top: -spacing.xs, right: -spacing.xs,
    width: 18, height: 18, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  filterBadgeText: {
    fontSize: 10, fontWeight: fontWeights.heavy,
  },

  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  fabContainer: {
    position: 'absolute', right: spacing.lg,
  },
  fab: {
    width: 52, height: 52, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  chipFlow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 4,
  },

  footerBtn: {
    flex: 1, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },

  suggestionsDropdown: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 52,
  },
  suggestionIconBox: {
    width: 28, height: 28, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
});

const detailStyles = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12, marginBottom: 16,
  },
  heroIconBox: {
    width: 48, height: 48, borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 10, marginBottom: 20,
  },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  section: { marginBottom: 20 },
  featureChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reviewItem: {
    padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  reviewUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: {
    width: 22, height: 22, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    minHeight: 44, flexGrow: 1,
  },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1.5,
    minHeight: 44,
  },
});

const rateStyles = StyleSheet.create({
  starsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, marginBottom: 24,
  },
  comment: {
    padding: 12, minHeight: 96,
    textAlignVertical: 'top', borderWidth: 1,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: {
    flex: 1, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },
});

const reportStyles = StyleSheet.create({
  reason: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    minHeight: 52,
  },
  desc: {
    padding: 12, minHeight: 80,
    textAlignVertical: 'top', borderWidth: 1,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: {
    flex: 1, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },
});
