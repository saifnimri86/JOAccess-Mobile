import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { JORDAN_CENTER, MAP_TILE_URL, UPLOADS_BASE } from '../config';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

const CATEGORIES = [
  'Restaurants & Cafes', 'Shopping Malls', 'Supermarkets', 'Healthcare',
  'Educational', 'Government Buildings', 'Religious Places', 'Transportation',
  'Tourist Attractions', 'Beauty & Wellness', 'Parks', 'Entertainment',
  'Hotels', 'Banks & ATMs', 'Sports & Fitness',
];

const FEATURES = [
  'wheelchair_ramp', 'accessible_restroom', 'braille_signage',
  'accessible_parking', 'elevator', 'audio_assistance',
  'wide_doorways', 'automatic_doors',
];

export default function AddEditLocationScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const webViewRef = useRef(null);
  const isEdit = route?.params?.locationId != null;
  const locationId = route?.params?.locationId;

  // ── Form state ──
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());
  const [photos, setPhotos] = useState([]); // Array of { uri, filename, base64 }
  const [existingPhotos, setExistingPhotos] = useState([]); // filenames from server
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // ── Load existing data for edit mode ──
  useEffect(() => {
    if (isEdit) loadLocation();
  }, [isEdit, locationId]);

  async function loadLocation() {
    try {
      const loc = await api.getLocation(locationId);
      setName(loc.name || '');
      setNameAr(loc.name_ar || '');
      setDescription(loc.description || '');
      setDescriptionAr(loc.description_ar || '');
      setCategory(loc.category || '');
      setAddress(loc.address || '');
      setAddressAr(loc.address_ar || '');
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setExistingPhotos(loc.photos || []);
      const feats = new Set(loc.accessibility_features?.map((f) => f.type) || []);
      setSelectedFeatures(feats);

      // Center map on location
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          if (typeof map !== 'undefined') {
            map.setView([${loc.latitude}, ${loc.longitude}], 15);
            placeMarker(${loc.latitude}, ${loc.longitude});
          }
        `);
      }, 1000);
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to load location');
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  }

  // ── Handle map tap from WebView ──
  function onWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'mapClick') {
        setLatitude(msg.lat);
        setLongitude(msg.lng);
      }
    } catch {}
  }

  // ── Toggle feature ──
  function toggleFeature(feat) {
    const next = new Set(selectedFeatures);
    if (next.has(feat)) next.delete(feat);
    else next.add(feat);
    setSelectedFeatures(next);
  }

  // ── Pick photos from gallery ──
  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Photo library permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset) => ({
        uri: asset.uri,
        filename: asset.fileName || `photo_${Date.now()}.jpg`,
        base64: asset.base64,
      }));
      setPhotos([...photos, ...newPhotos]);
    }
  }

  // ── Take photo with camera ──
  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Camera permission required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPhotos([...photos, {
        uri: asset.uri,
        filename: asset.fileName || `camera_${Date.now()}.jpg`,
        base64: asset.base64,
      }]);
    }
  }

  // ── Remove a new photo ──
  function removePhoto(index) {
    const next = [...photos];
    next.splice(index, 1);
    setPhotos(next);
  }

  // ── Save ──
  async function handleSave() {
    if (!name.trim()) { Alert.alert(t('error'), t('locationNameEn') + ' required'); return; }
    if (!nameAr.trim()) { Alert.alert(t('error'), t('locationNameAr') + ' required'); return; }
    if (!category) { Alert.alert(t('error'), t('category') + ' required'); return; }
    if (latitude === null || longitude === null) {
      Alert.alert(t('error'), t('tapMapToSelect'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        name_ar: nameAr.trim(),
        description: description.trim(),
        description_ar: descriptionAr.trim(),
        category,
        latitude,
        longitude,
        address: address.trim(),
        address_ar: addressAr.trim(),
        accessibility_features: Array.from(selectedFeatures),
        photos_base64: photos.map((p) => ({
          filename: p.filename,
          data: p.base64,
        })),
      };

      if (isEdit) {
        await api.updateLocation(locationId, payload);
        Alert.alert(t('success'), t('locationUpdated'));
      } else {
        await api.createLocation(payload);
        Alert.alert(t('success'), t('locationAdded'));
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const textAlign = isRTL ? 'right' : 'left';

  // ── Map picker HTML ──
  const pickerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, minZoom: 7, maxZoom: 18 })
      .setView([${JORDAN_CENTER.lat}, ${JORDAN_CENTER.lng}], 8);
    L.tileLayer('${MAP_TILE_URL}', { maxZoom: 19 }).addTo(map);

    var marker = null;
    function placeMarker(lat, lng) {
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
    }
    map.on('click', function(e) {
      placeMarker(e.latlng.lat, e.latlng.lng);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapClick', lat: e.latlng.lat, lng: e.latlng.lng
      }));
    });
  </script>
</body>
</html>
  `;

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>{isEdit ? t('editLocation') : t('addLocation')}</Text>

      {/* Name EN */}
      <Text style={[styles.label, { textAlign }]}>{t('locationNameEn')} *</Text>
      <TextInput style={[styles.input, isRTL && { textAlign: 'right' }]} value={name} onChangeText={setName} />

      {/* Name AR */}
      <Text style={[styles.label, { textAlign }]}>{t('locationNameAr')} *</Text>
      <TextInput style={[styles.input, { textAlign: 'right' }]} value={nameAr} onChangeText={setNameAr} />

      {/* Category */}
      <Text style={[styles.label, { textAlign }]}>{t('category')} *</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowCategoryPicker(!showCategoryPicker)}
      >
        <Text style={[styles.dropdownText, !category && { color: colors.mediumGrey }]}>
          {category ? t(category) : t('selectCategory')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.darkGrey} />
      </TouchableOpacity>
      {showCategoryPicker && (
        <View style={styles.pickerList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pickerItem, category === cat && styles.pickerItemActive]}
              onPress={() => { setCategory(cat); setShowCategoryPicker(false); }}
            >
              <Text style={[styles.pickerItemText, category === cat && { color: colors.primary, fontWeight: fontWeights.bold }]}>
                {t(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Address EN */}
      <Text style={[styles.label, { textAlign }]}>{t('addressEn')}</Text>
      <TextInput style={[styles.input, isRTL && { textAlign: 'right' }]} value={address} onChangeText={setAddress} />

      {/* Address AR */}
      <Text style={[styles.label, { textAlign }]}>{t('addressAr')}</Text>
      <TextInput style={[styles.input, { textAlign: 'right' }]} value={addressAr} onChangeText={setAddressAr} />

      {/* Description EN */}
      <Text style={[styles.label, { textAlign }]}>{t('descriptionEn')}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />

      {/* Description AR */}
      <Text style={[styles.label, { textAlign }]}>{t('descriptionAr')}</Text>
      <TextInput style={[styles.input, styles.textArea, { textAlign: 'right' }]} value={descriptionAr} onChangeText={setDescriptionAr} multiline />

      {/* Map Picker */}
      <Text style={[styles.label, { textAlign }]}>{t('locationCoordinates')} *</Text>
      <Text style={styles.hint}>{t('tapMapToSelect')}</Text>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: pickerHtml }}
          style={styles.mapPicker}
          onMessage={onWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      </View>
      {latitude !== null && (
        <Text style={styles.coordText}>
          Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
        </Text>
      )}

      {/* Accessibility Features */}
      <Text style={[styles.sectionTitle, { textAlign }]}>{t('accessibilityFeatures')}</Text>
      <View style={styles.featuresGrid}>
        {FEATURES.map((feat) => (
          <TouchableOpacity
            key={feat}
            style={[styles.featureToggle, selectedFeatures.has(feat) && styles.featureToggleActive]}
            onPress={() => toggleFeature(feat)}
          >
            <Ionicons
              name={selectedFeatures.has(feat) ? 'checkbox' : 'square-outline'}
              size={20}
              color={selectedFeatures.has(feat) ? colors.primary : colors.darkGrey}
            />
            <Text style={[styles.featureToggleText, selectedFeatures.has(feat) && { color: colors.primary }]}>
              {t(feat)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photos */}
      <Text style={[styles.sectionTitle, { textAlign }]}>{t('photos')}</Text>
      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos}>
          <Ionicons name="images" size={20} color={colors.primary} />
          <Text style={styles.photoBtnText}>{t('selectPhotos')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color={colors.primary} />
          <Text style={styles.photoBtnText}>{t('takePhoto')}</Text>
        </TouchableOpacity>
      </View>

      {/* Existing photos (edit mode) */}
      {existingPhotos.length > 0 && (
        <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
          {existingPhotos.map((filename, i) => (
            <Image
              key={i}
              source={{ uri: `${UPLOADS_BASE}/${filename}` }}
              style={styles.photoThumb}
            />
          ))}
        </ScrollView>
      )}

      {/* New photos */}
      {photos.length > 0 && (
        <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
          {photos.map((photo, i) => (
            <View key={i} style={styles.photoThumbContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Save / Cancel */}
      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelFormBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelFormText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey, padding: spacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: fontSizes.xxl, fontWeight: fontWeights.bold,
    color: colors.primary, textAlign: 'center', marginBottom: spacing.xxl,
  },
  label: {
    fontSize: fontSizes.md, fontWeight: fontWeights.semibold,
    color: colors.black, marginBottom: spacing.xs, marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 2, borderColor: colors.lightGrey, padding: spacing.md,
    fontSize: fontSizes.md, color: colors.black,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  hint: { fontSize: fontSizes.sm, color: colors.mediumGrey, marginBottom: spacing.sm },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 2, borderColor: colors.lightGrey, padding: spacing.md,
  },
  dropdownText: { fontSize: fontSizes.md, color: colors.black },
  pickerList: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.lightGrey, marginTop: 4, maxHeight: 250,
  },
  pickerItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.grey },
  pickerItemActive: { backgroundColor: colors.grey },
  pickerItemText: { fontSize: fontSizes.md, color: colors.black },

  mapContainer: { height: 250, borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.sm },
  mapPicker: { flex: 1 },
  coordText: { fontSize: fontSizes.sm, color: colors.darkGrey, marginTop: spacing.xs, textAlign: 'center' },

  sectionTitle: {
    fontSize: fontSizes.lg, fontWeight: fontWeights.bold,
    color: colors.primary, marginTop: spacing.xxl, marginBottom: spacing.md,
  },
  featuresGrid: { gap: spacing.sm },
  featureToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.lightGrey,
  },
  featureToggleActive: { borderColor: colors.primary, backgroundColor: 'rgba(128,0,0,0.03)' },
  featureToggleText: { fontSize: fontSizes.md, color: colors.darkGrey },

  photoActions: { flexDirection: 'row', gap: spacing.md },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary },
  photoScroll: { marginTop: spacing.md },
  photoThumbContainer: { position: 'relative', marginRight: spacing.sm },
  photoThumb: { width: 100, height: 100, borderRadius: borderRadius.md },
  photoRemove: { position: 'absolute', top: -6, right: -6 },

  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  cancelFormBtn: {
    flex: 1, paddingVertical: spacing.lg, borderRadius: borderRadius.md,
    backgroundColor: colors.lightGrey, alignItems: 'center',
  },
  cancelFormText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.darkGrey },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.lg, borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.white },
});
