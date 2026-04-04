import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, ActivityIndicator, Switch, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { UPLOADS_BASE, JORDAN_CENTER, MAP_TILE_URL } from '../config';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

// ── All categories from the web version ──
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

export default function MapScreen({ navigation }) {
  const { t, lang, isRTL, getLocalized } = useLanguage();
  const { isAuthenticated } = useAuth();
  const webViewRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(new Set(ALL_CATEGORIES));
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());

  // Location detail modal
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Rate modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    setLoading(true);
    try {
      const data = await api.getLocations();
      setLocations(data);
    } catch (err) {
      Alert.alert(t('error'), t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  // ── Filter locations by search, categories, and features ──
  const filteredLocations = locations.filter((loc) => {
    // Category filter
    if (!selectedCategories.has(loc.category)) return false;

    // Feature filter
    if (selectedFeatures.size > 0) {
      const locFeatureTypes = loc.accessibility_features.map((f) => f.type);
      for (const feat of selectedFeatures) {
        if (!locFeatureTypes.includes(feat)) return false;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (loc.name || '').toLowerCase().includes(q);
      const matchNameAr = (loc.name_ar || '').toLowerCase().includes(q);
      const matchAddr = (loc.address || '').toLowerCase().includes(q);
      const matchAddrAr = (loc.address_ar || '').toLowerCase().includes(q);
      if (!matchName && !matchNameAr && !matchAddr && !matchAddrAr) return false;
    }

    return true;
  });

  // ── Generate the Leaflet HTML for the WebView ──
  const mapHtml = generateMapHtml(filteredLocations, lang, UPLOADS_BASE);

  // ── Handle messages from the WebView (marker clicks, etc.) ──
  function onWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerClick') {
        const loc = locations.find((l) => l.id === msg.locationId);
        if (loc) {
          setSelectedLocation(loc);
          setShowDetail(true);
        }
      }
    } catch {
      // ignore
    }
  }

  // ── Locate user ──
  async function locateUser() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), 'Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const js = `
        if (typeof map !== 'undefined') {
          map.setView([${loc.coords.latitude}, ${loc.coords.longitude}], 15);
          if (window._userMarker) map.removeLayer(window._userMarker);
          window._userMarker = L.circleMarker([${loc.coords.latitude}, ${loc.coords.longitude}], {
            radius: 10, fillColor: '#4285F4', fillOpacity: 1, color: '#fff', weight: 3
          }).addTo(map).bindPopup('${t('myLocation')}');
        }
      `;
      webViewRef.current?.injectJavaScript(js);
    } catch {
      Alert.alert(t('error'), 'Could not get location');
    }
  }

  // ── Category toggle ──
  function toggleCategory(cat) {
    const next = new Set(selectedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setSelectedCategories(next);
  }

  // ── Feature toggle ──
  function toggleFeature(feat) {
    const next = new Set(selectedFeatures);
    if (next.has(feat)) next.delete(feat);
    else next.add(feat);
    setSelectedFeatures(next);
  }

  // ── Submit rating ──
  async function submitRating() {
    if (rateStars < 1) { Alert.alert(t('error'), 'Select a rating'); return; }
    if (!isAuthenticated) { Alert.alert(t('error'), t('loginRequired')); return; }

    setRatingSubmitting(true);
    try {
      await api.addReview(selectedLocation.id, rateStars, rateComment);
      Alert.alert(t('success'), t('submitRating'));
      setShowRateModal(false);
      setRateStars(0);
      setRateComment('');
      loadLocations(); // Refresh
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  }

  // ── Submit report ──
  async function submitReport() {
    if (!reportReason) { Alert.alert(t('error'), 'Select a reason'); return; }
    if (!isAuthenticated) { Alert.alert(t('error'), t('loginRequired')); return; }

    setReportSubmitting(true);
    try {
      await api.reportLocation(selectedLocation.id, reportReason, reportDesc);
      Alert.alert(t('success'), t('submitReport'));
      setShowReportModal(false);
      setReportReason('');
      setReportDesc('');
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to submit report');
    } finally {
      setReportSubmitting(false);
    }
  }

  // ── Open directions in native maps ──
  function openDirections(lat, lng) {
    const url = Platform.OS === 'ios'
      ? `maps:0,0?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  }

  // ── Render stars ──
  function renderStars(rating, size = 16) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i <= Math.round(rating) ? colors.star : colors.starEmpty}
        />
      );
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.darkGrey} />
        <TextInput
          style={[styles.searchInput, isRTL && { textAlign: 'right' }]}
          placeholder={t('searchLocations')}
          placeholderTextColor={colors.mediumGrey}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map WebView */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loadingLocations')}</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={onWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          geolocationEnabled={true}
        />
      )}

      {/* Locate me FAB */}
      <TouchableOpacity style={styles.locateFab} onPress={locateUser}>
        <Ionicons name="locate" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* ═══════════ FILTER MODAL ═══════════ */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('filters')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.black} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScroll}>
              {/* Categories */}
              <Text style={styles.filterSectionTitle}>{t('categories')}</Text>
              {ALL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.filterRow}
                  onPress={() => toggleCategory(cat)}
                >
                  <Ionicons
                    name={selectedCategories.has(cat) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selectedCategories.has(cat) ? colors.primary : colors.darkGrey}
                  />
                  <Text style={styles.filterLabel}>{t(cat)}</Text>
                </TouchableOpacity>
              ))}

              {/* Features */}
              <Text style={[styles.filterSectionTitle, { marginTop: spacing.xl }]}>
                {t('accessibilityFeatures')}
              </Text>
              {ALL_FEATURES.map((feat) => (
                <TouchableOpacity
                  key={feat}
                  style={styles.filterRow}
                  onPress={() => toggleFeature(feat)}
                >
                  <Ionicons
                    name={selectedFeatures.has(feat) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selectedFeatures.has(feat) ? colors.primary : colors.darkGrey}
                  />
                  <Text style={styles.filterLabel}>{t(feat)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSelectedCategories(new Set(ALL_CATEGORIES));
                  setSelectedFeatures(new Set());
                }}
              >
                <Text style={styles.clearBtnText}>{t('clearFilters')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyBtnText}>{t('applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════ LOCATION DETAIL MODAL ═══════════ */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {selectedLocation && (
              <ScrollView>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailName}>
                    {getLocalized(selectedLocation, 'name')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <Ionicons name="close-circle" size={28} color={colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailBody}>
                  {/* Category + Verified badge */}
                  <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{t(selectedLocation.category)}</Text>
                    </View>
                    <View style={[styles.verifiedBadge, !selectedLocation.is_verified && styles.unverifiedBadge]}>
                      <Ionicons
                        name={selectedLocation.is_verified ? 'checkmark-circle' : 'time'}
                        size={14}
                        color={selectedLocation.is_verified ? colors.verifiedText : colors.unverifiedText}
                      />
                      <Text style={[
                        styles.verifiedText,
                        !selectedLocation.is_verified && styles.unverifiedTextColor,
                      ]}>
                        {selectedLocation.is_verified ? t('verified') : t('unverified')}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  {getLocalized(selectedLocation, 'description') ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionLabel}>
                        <Ionicons name="information-circle" size={16} color={colors.primary} /> {t('description')}
                      </Text>
                      <Text style={styles.sectionText}>{getLocalized(selectedLocation, 'description')}</Text>
                    </View>
                  ) : null}

                  {/* Address */}
                  {getLocalized(selectedLocation, 'address') ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionLabel}>
                        <Ionicons name="location" size={16} color={colors.primary} /> {t('address')}
                      </Text>
                      <Text style={styles.sectionText}>{getLocalized(selectedLocation, 'address')}</Text>
                    </View>
                  ) : null}

                  {/* Accessibility features */}
                  {selectedLocation.accessibility_features?.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionLabel}>
                        <Ionicons name="accessibility" size={16} color={colors.primary} /> {t('accessibilityFeatures')}
                      </Text>
                      <View style={styles.featureTags}>
                        {selectedLocation.accessibility_features.map((f, i) => (
                          <View key={i} style={styles.featureTag}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                            <Text style={styles.featureTagText}>{t(f.type)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Rating */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionLabel}>
                      <Ionicons name="star" size={16} color={colors.star} /> {t('rating')}
                    </Text>
                    <View style={styles.ratingRow}>
                      {renderStars(selectedLocation.avg_rating)}
                      <Text style={styles.ratingText}>
                        {selectedLocation.avg_rating} ({selectedLocation.review_count} {t('reviews')})
                      </Text>
                    </View>
                  </View>

                  {/* Reviews list */}
                  {selectedLocation.reviews?.length > 0 && (
                    <View style={styles.detailSection}>
                      {selectedLocation.reviews.slice(0, 5).map((review, i) => (
                        <View key={i} style={styles.reviewItem}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewUser}>
                              <Ionicons name="person-circle" size={14} color={colors.darkGrey} /> {review.user}
                            </Text>
                            {renderStars(review.rating, 12)}
                          </View>
                          {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openDirections(selectedLocation.latitude, selectedLocation.longitude)}
                    >
                      <Ionicons name="navigate" size={18} color={colors.white} />
                      <Text style={styles.actionBtnText}>{t('directions')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary]}
                      onPress={() => {
                        if (!isAuthenticated) { Alert.alert(t('error'), t('loginRequired')); return; }
                        setRateStars(0);
                        setRateComment('');
                        setShowRateModal(true);
                      }}
                    >
                      <Ionicons name="star" size={18} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t('rateLocation')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => {
                        if (!isAuthenticated) { Alert.alert(t('error'), t('loginRequired')); return; }
                        setReportReason('');
                        setReportDesc('');
                        setShowReportModal(true);
                      }}
                    >
                      <Ionicons name="flag" size={18} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>{t('reportLocation')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════ RATE MODAL ═══════════ */}
      <Modal visible={showRateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModal}>
            <Text style={styles.smallModalTitle}>{t('rateLocation')}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setRateStars(i)}>
                  <Ionicons
                    name={i <= rateStars ? 'star' : 'star-outline'}
                    size={36}
                    color={i <= rateStars ? colors.star : colors.starEmpty}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder={t('addComment')}
              placeholderTextColor={colors.mediumGrey}
              value={rateComment}
              onChangeText={setRateComment}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRateModal(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitRating} disabled={ratingSubmitting}>
                {ratingSubmitting
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.submitBtnText}>{t('submitRating')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════ REPORT MODAL ═══════════ */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModal}>
            <Text style={styles.smallModalTitle}>{t('reportLocation')}</Text>
            {[
              { key: 'inaccurateInfo', val: 'Inaccurate Information' },
              { key: 'closedLocation', val: 'Location Closed/Moved' },
              { key: 'inappropriate', val: 'Inappropriate Content' },
              { key: 'safetyIssue', val: 'Safety Issue' },
              { key: 'other', val: 'Other' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.reportOption, reportReason === opt.val && styles.reportOptionActive]}
                onPress={() => setReportReason(opt.val)}
              >
                <Ionicons
                  name={reportReason === opt.val ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={reportReason === opt.val ? colors.danger : colors.darkGrey}
                />
                <Text style={styles.reportOptionText}>{t(opt.key)}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.commentInput}
              placeholder={t('reportDescription')}
              placeholderTextColor={colors.mediumGrey}
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReportModal(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.danger }]}
                onPress={submitReport}
                disabled={reportSubmitting}
              >
                {reportSubmitting
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.submitBtnText}>{t('submitReport')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════
// Generate the Leaflet HTML for the WebView
// ═══════════════════════════════════════════

function generateMapHtml(locations, lang, uploadsBase) {
  const markersJson = JSON.stringify(
    locations.map((loc) => ({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
      name: lang === 'ar' ? (loc.name_ar || loc.name) : loc.name,
      verified: loc.is_verified,
      category: loc.category,
    }))
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker {
      background-color: #800000;
      width: 28px; height: 28px;
      display: block; position: relative;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 10px rgba(128,0,0,0.4);
    }
    .custom-marker.verified {
      background-color: #800000;
      box-shadow: 0 3px 10px rgba(128,0,0,0.5);
    }
    .custom-marker::after {
      content: '';
      width: 14px; height: 14px;
      background: white; position: absolute;
      border-radius: 50%;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .marker-tooltip {
      font-family: sans-serif;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      maxBounds: [[28.5, 34.0], [34.0, 40.0]],
      maxBoundsViscosity: 1.0,
      minZoom: 7,
      maxZoom: 18
    }).setView([${JORDAN_CENTER.lat}, ${JORDAN_CENTER.lng}], 8);

    L.tileLayer('${MAP_TILE_URL}', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19
    }).addTo(map);

    var markers = ${markersJson};
    markers.forEach(function(m) {
      var cls = m.verified ? 'custom-marker verified' : 'custom-marker';
      var icon = L.divIcon({
        html: '<div class="' + cls + '"></div>',
        className: 'custom-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });
      var marker = L.marker([m.lat, m.lng], { icon: icon });
      marker.bindTooltip(m.name, { className: 'marker-tooltip', direction: 'top', offset: [0, -30] });
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', locationId: m.id }));
      });
      marker.addTo(map);
    });
  </script>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, marginHorizontal: spacing.md,
    marginTop: spacing.sm, marginBottom: spacing.xs,
    borderRadius: borderRadius.xl, paddingHorizontal: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: fontSizes.md, color: colors.black },
  filterBtn: { padding: spacing.xs },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.darkGrey, fontSize: fontSizes.md },
  locateFab: {
    position: 'absolute', bottom: 20, right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, maxHeight: '80%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.lightGrey,
  },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.black },
  filterScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  filterSectionTitle: {
    fontSize: fontSizes.lg, fontWeight: fontWeights.bold,
    color: colors.primary, marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterLabel: { fontSize: fontSizes.md, color: colors.black },
  filterActions: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
  },
  clearBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.lightGrey, alignItems: 'center',
  },
  clearBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  applyBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  applyBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.white },

  // ── Detail Modal ──
  detailModal: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, maxHeight: '85%',
  },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  detailName: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.white, flex: 1, marginRight: spacing.md },
  detailBody: { padding: spacing.xl },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  categoryBadge: {
    backgroundColor: colors.grey, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: borderRadius.round,
  },
  categoryBadgeText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.verifiedBg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: borderRadius.round,
  },
  unverifiedBadge: { backgroundColor: colors.unverifiedBg },
  verifiedText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.verifiedText },
  unverifiedTextColor: { color: colors.unverifiedText },
  detailSection: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.primary, marginBottom: spacing.sm },
  sectionText: { fontSize: fontSizes.md, color: colors.darkGrey, lineHeight: 22 },
  featureTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  featureTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.grey, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: borderRadius.round,
  },
  featureTagText: { fontSize: fontSizes.sm, color: colors.darkGrey },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingText: { fontSize: fontSizes.md, color: colors.darkGrey },
  reviewItem: {
    backgroundColor: colors.grey, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewUser: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  reviewComment: { fontSize: fontSizes.sm, color: colors.darkGrey, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
  },
  actionBtnSecondary: { backgroundColor: colors.grey },
  actionBtnDanger: { backgroundColor: colors.dangerBg },
  actionBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },

  // ── Small modals (rate / report) ──
  smallModal: {
    backgroundColor: colors.white, margin: spacing.xl,
    borderRadius: borderRadius.xl, padding: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
    alignSelf: 'center', width: '90%', position: 'absolute',
    top: '20%',
  },
  smallModalTitle: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.bold,
    color: colors.primary, marginBottom: spacing.lg, textAlign: 'center',
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  commentInput: {
    borderWidth: 2, borderColor: colors.lightGrey, borderRadius: borderRadius.md,
    padding: spacing.md, fontSize: fontSizes.md, color: colors.black,
    minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.lg,
  },
  modalBtnRow: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.lightGrey, alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  submitBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  submitBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.white },
  reportOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, marginBottom: spacing.xs,
  },
  reportOptionActive: {},
  reportOptionText: { fontSize: fontSizes.md, color: colors.black },
});
