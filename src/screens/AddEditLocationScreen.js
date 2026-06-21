import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Platform,
  KeyboardAvoidingView, ActivityIndicator, PermissionsAndroid, FlatList, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useDialog } from '../context/DialogContext';
import * as api from '../services/api';
import { JORDAN_CENTER, JORDAN_BOUNDS, getUploadsBase, GOOGLE_PLACES_API_KEY } from '../config';

import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import Chip from '../components/Chip';
import BottomSheet from '../components/BottomSheet';
import SectionHeader from '../components/SectionHeader';
import StaggeredReveal from '../components/StaggeredReveal';

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

const JORDAN_POLYGON = [
  [32.393992, 35.545665],
  [32.709192, 35.719918],
  [32.312938, 36.834062],
  [33.378686, 38.792341],
  [32.161009, 39.195468],
  [32.010217, 39.004886],
  [31.508413, 37.002166],
  [30.5085, 37.998849],
  [30.338665, 37.66812],
  [30.003776, 37.503582],
  [29.865283, 36.740528],
  [29.505254, 36.501214],
  [29.197495, 36.068941],
  [29.356555, 34.956037],
  [29.501326, 34.922603],
  [31.100066, 35.420918],
  [31.489086, 35.397561],
  [31.782505, 35.545252],
  [32.393992, 35.545665],
];

// ray-casting point-in-polygon
function isPointInJordan(lat, lng) {
  let inside = false;
  for (let i = 0, j = JORDAN_POLYGON.length - 1; i < JORDAN_POLYGON.length; j = i++) {
    const xi = JORDAN_POLYGON[i][0], yi = JORDAN_POLYGON[i][1];
    const xj = JORDAN_POLYGON[j][0], yj = JORDAN_POLYGON[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function AddEditLocationScreen({ route, navigation }) {
  const { t, lang, isRTL } = useLanguage();
  const { theme, scale, announce, colorBlindMode, highContrast } = useAccessibility();
  const { showDialog } = useDialog();
  const webViewRef = useRef(null);
  const searchTimerRef = useRef(null);
  const isEdit = route?.params?.locationId != null;
  const locationId = route?.params?.locationId;

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
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedExistingPhotos, setRemovedExistingPhotos] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapScrollLock, setMapScrollLock] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
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
        setSelectedFeatures(new Set(loc.accessibility_features?.map((f) => f.type) || []));

        // center map on existing location once the webview loads
        setTimeout(() => {
          webViewRef.current?.injectJavaScript(`
            if (typeof map !== 'undefined') {
              map.setView([${loc.latitude}, ${loc.longitude}], 15);
              placeMarker(${loc.latitude}, ${loc.longitude});
            }
          `);
        }, 1000);
      } catch (err) {
        showDialog(t('error'), err.message || 'Failed to load location');
        navigation.goBack();
      } finally {
        setLoadingData(false);
      }
    })();
  }, [isEdit, locationId]);

  // default map to user's current location (add mode only)
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
        }
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng } = position.coords;
            if (!isInJordan(lat, lng)) return;
            setLatitude(lat);
            setLongitude(lng);
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(`
                if (typeof map !== 'undefined') {
                  map.setView([${lat}, ${lng}], 15);
                  placeMarker(${lat}, ${lng});
                }
              `);
            }, 1000);
            autofillFromCoords(lat, lng);
          },
          () => {},
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 },
        );
      } catch {}
    })();
  }, [isEdit]);

  // autofill blank name/address fields from gps reverse geocode (add mode only)
  const autofillFromCoords = async (lat, lng) => {
    try {
      const fetchNearby = (languageCode) => fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress',
          },
          body: JSON.stringify({
            languageCode,
            locationRestriction: {
              circle: { center: { latitude: lat, longitude: lng }, radius: 100.0 },
            },
            maxResultCount: 1,
            rankPreference: 'DISTANCE',
          }),
        },
      ).then((r) => r.ok ? r.json() : null).catch(() => null);

      const [enData, arData] = await Promise.all([fetchNearby('en'), fetchNearby('ar')]);
      const enPlace = enData?.places?.[0];
      const arPlace = arData?.places?.[0];
      if (!enPlace && !arPlace) return;

      const enName = enPlace?.displayName?.text || '';
      const arName = arPlace?.displayName?.text || '';
      const enAddr = enPlace?.formattedAddress || '';
      const arAddr = arPlace?.formattedAddress || '';

      // never clobber typed input
      setName((prev) => prev || enName || arName);
      setNameAr((prev) => prev || arName || enName);
      setAddress((prev) => prev || enAddr || arAddr);
      setAddressAr((prev) => prev || arAddr || enAddr);

      if (enName || arName || enAddr || arAddr) {
        announce(lang === 'ar' ? 'تم تعبئة بيانات الموقع الحالي' : 'Current location details filled');
      }
    } catch {}
  };

  const isInJordan = (lat, lng) => isPointInJordan(lat, lng);

  const onWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'mapClick') {
        if (!isInJordan(msg.lat, msg.lng)) {
          showDialog(
            lang === 'ar' ? 'خارج الأردن' : 'Outside Jordan',
            lang === 'ar'
              ? 'لا يمكنك إضافة مواقع خارج حدود الأردن. الرجاء اختيار موقع داخل الأردن.'
              : 'You can only add locations within Jordan. Please pick a location inside Jordan.',
          );
          return;
        }
        setLatitude(msg.lat);
        setLongitude(msg.lng);
        announce(lang === 'ar'
          ? 'تم تحديد الموقع على الخريطة'
          : 'Location pinned on map');
      }
    } catch {}
  };

  const toggleFeature = (feat) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feat)) next.delete(feat);
      else next.add(feat);
      return next;
    });
  };

  const onSearchTextChange = (text) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text.trim() || text.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    // 300ms debounce
    searchTimerRef.current = setTimeout(() => {
      fetchPlacesSuggestions(text.trim());
    }, 300);
  };

  const fetchPlacesSuggestions = async (text) => {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input: text,
          includedRegionCodes: ['JO'],
          languageCode: lang === 'ar' ? 'ar' : 'en',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showDialog(
          'Places API Error',
          `Status: ${response.status}\n${data?.error?.message || JSON.stringify(data)}`,
        );
        setSuggestions([]);
        setSearchLoading(false);
        return;
      }

      if (data.suggestions) {
        setSuggestions(data.suggestions.map(s => s.placePrediction).filter(Boolean));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      showDialog('Network Error', err.message);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchPlaceDetails = async (placeId, languageCode) => {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${languageCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'location,displayName,formattedAddress',
      },
    });
    return response.json();
  };

  const handleSuggestionPress = async (placeId, placeText) => {
    setSearchQuery(placeText);
    setSuggestions([]);
    
    try {
      const [enData, arData] = await Promise.all([
        fetchPlaceDetails(placeId, 'en'),
        fetchPlaceDetails(placeId, 'ar'),
      ]);

      const enName = enData?.displayName?.text || '';
      const arName = arData?.displayName?.text || '';
      const enAddr = enData?.formattedAddress || '';
      const arAddr = arData?.formattedAddress || '';

      setName(enName || arName);
      setAddress(enAddr || arAddr);

      setNameAr(arName || enName);
      setAddressAr(arAddr || enAddr);

      const loc = enData?.location || arData?.location;
      if (loc) {
        const { latitude: lat, longitude: lng } = loc;
        if (!isInJordan(lat, lng)) {
          showDialog(
            lang === 'ar' ? 'خارج الأردن' : 'Outside Jordan',
            lang === 'ar'
              ? 'هذا المكان خارج حدود الأردن. يمكنك فقط إضافة مواقع داخل الأردن.'
              : 'This place is outside Jordan. You can only add locations within Jordan.',
          );
          // clear so save is blocked
          setLatitude(null);
          setLongitude(null);
          return;
        }
        setLatitude(lat);
        setLongitude(lng);
        webViewRef.current?.injectJavaScript(`
          if (typeof map !== 'undefined') {
            map.setView([${lat}, ${lng}], 15);
            placeMarker(${lat}, ${lng});
          }
        `);
      }

      announce(lang === 'ar' ? 'تم تعبئة بيانات المكان' : 'Place details filled');
    } catch (err) {
      console.error(err);
    }
  };

  const pickFromGallery = () => {
    const count = currentPhotoCount();
    if (count >= MAX_PHOTOS) {
      showDialog(
        lang === 'ar' ? 'تم الوصول للحد الأقصى' : 'Photo limit reached',
        lang === 'ar'
          ? 'يمكنك إضافة 5 صور كحد أقصى لكل موقع.'
          : 'You can add a maximum of 5 photos per location.',
      );
      return;
    }
    const remainingSlots = MAX_PHOTOS - count;
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: remainingSlots, quality: 0.7, includeBase64: true },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets) {
          const oversized = response.assets.find((a) => (a.fileSize || 0) > MAX_PHOTO_BYTES);
          if (oversized) {
            showDialog(
              lang === 'ar' ? 'الصورة كبيرة جداً' : 'Photo too large',
              lang === 'ar'
                ? 'يجب أن يكون حجم كل صورة أقل من 5 ميجابايت.'
                : 'Each photo must be less than 5 MB.',
            );
            return;
          }
          const newPhotos = response.assets.map((asset) => ({
            uri: asset.uri,
            filename: asset.fileName || `photo_${Date.now()}.jpg`,
            base64: asset.base64,
          }));
          setPhotos((prev) => [...prev, ...newPhotos]);
        }
      }
    );
  };

  const showCameraPermissionDenied = () => {
    showDialog(
      lang === 'ar' ? 'إذن الكاميرا مطلوب' : 'Camera permission needed',
      lang === 'ar'
        ? 'لا يمكن التقاط الصور بدون إذن الكاميرا. الرجاء تمكينه من إعدادات التطبيق.'
        : 'Cannot take photos without camera permission. Please enable it in your app settings.',
      [
        { text: lang === 'ar' ? 'فتح الإعدادات' : 'Open settings', onPress: () => Linking.openSettings() },
        { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ],
    );
  };

  const ensureCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (has) return true;
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: lang === 'ar' ? 'إذن الكاميرا' : 'Camera permission',
          message: lang === 'ar'
            ? 'يحتاج التطبيق إلى الوصول إلى الكاميرا لالتقاط الصور.'
            : 'The app needs camera access to take photos.',
          buttonPositive: lang === 'ar' ? 'موافق' : 'OK',
          buttonNegative: lang === 'ar' ? 'إلغاء' : 'Cancel',
        },
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      showCameraPermissionDenied();
      return false;
    } catch {
      showCameraPermissionDenied();
      return false;
    }
  };

  const takePhoto = async () => {
    if (currentPhotoCount() >= MAX_PHOTOS) {
      showDialog(
        lang === 'ar' ? 'تم الوصول للحد الأقصى' : 'Photo limit reached',
        lang === 'ar'
          ? 'يمكنك إضافة 5 صور كحد أقصى لكل موقع.'
          : 'You can add a maximum of 5 photos per location.',
      );
      return;
    }
    const ok = await ensureCameraPermission();
    if (!ok) return;
    launchCamera(
      { mediaType: 'photo', quality: 0.7, includeBase64: true },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          // ios surfaces 'permission' here; android may surface 'camera_unavailable'
          if (response.errorCode === 'permission') showCameraPermissionDenied();
          return;
        }
        if (response.assets?.[0]) {
          const asset = response.assets[0];
          if ((asset.fileSize || 0) > MAX_PHOTO_BYTES) {
            showDialog(
              lang === 'ar' ? 'الصورة كبيرة جداً' : 'Photo too large',
              lang === 'ar'
                ? 'يجب أن يكون حجم كل صورة أقل من 5 ميجابايت.'
                : 'Each photo must be less than 5 MB.',
            );
            return;
          }
          setPhotos((prev) => [...prev, {
            uri: asset.uri,
            filename: asset.fileName || `camera_${Date.now()}.jpg`,
            base64: asset.base64,
          }]);
        }
      }
    );
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const removeExistingPhoto = (filename) => {
    setRemovedExistingPhotos((prev) => new Set([...prev, filename]));
  };

  const MAX_PHOTOS = 5;
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  const currentPhotoCount = () =>
    existingPhotos.filter((f) => !removedExistingPhotos.has(f)).length + photos.length;

  async function handleSave() {
    if (!name.trim())     { showDialog(t('error'), lang === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name required'); return; }
    if (!nameAr.trim())   { showDialog(t('error'), lang === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name required'); return; }
    if (!category)        { showDialog(t('error'), t('category') + ' required'); return; }
    if (latitude === null || longitude === null) {
      showDialog(t('error'), t('tapMapToSelect'));
      return;
    }
    if (!isInJordan(latitude, longitude)) {
      showDialog(
        t('error'),
        lang === 'ar'
          ? 'الموقع المحدد خارج حدود الأردن. الرجاء اختيار موقع داخل الأردن.'
          : 'The selected location is outside Jordan. Please choose a location within Jordan.',
      );
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
        photos_base64: photos.map((p) => ({ filename: p.filename, data: p.base64 })),
        removed_photos: [...removedExistingPhotos],
      };

      if (isEdit) {
        await api.updateLocation(locationId, payload);
        showDialog(t('success'), t('locationUpdated'));
      } else {
        await api.createLocation(payload);
        showDialog(t('success'), t('locationAdded'));
      }
      navigation.goBack();
    } catch (err) {
      let errorMsg = err.message || 'Save failed';
      if (typeof errorMsg === 'string') {
        if (errorMsg.includes('already been added by another user') && errorMsg.includes('name')) {
          errorMsg = t('locationNameExists');
        } else if (errorMsg.includes('already been added by another user') && errorMsg.includes('spot')) {
          errorMsg = t('locationProximityExists');
        }
      }
      showDialog(t('error'), errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // memoized so it doesn't regenerate on every keystroke
  const pickerHtml = useMemo(
    () => generatePickerHtml(theme.mode, colorBlindMode, highContrast),
    [theme.mode, colorBlindMode, highContrast]
  );

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView
        style={styles.root}
        edges={['top', 'left', 'right']}
      >
      <View style={styles.topBar}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          accessibilityLabel={lang === 'ar' ? 'رجوع' : 'Back'}
          hitSlop={12}
          style={[styles.backBtn, { backgroundColor: theme.color.surface, borderColor: theme.color.border }]}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={theme.color.text} />
        </AnimatedPressable>
        <Text style={{
          flex: 1, marginHorizontal: 12,
          fontSize: scale(theme.fontSizes.lg),
          fontWeight: theme.fontWeights.bold,
          color: theme.color.text,
          fontFamily: theme.fontFamily,
          textAlign: 'center',
        }} accessibilityRole="header" numberOfLines={1}>
          {isEdit
            ? (lang === 'ar' ? 'تعديل المكان' : 'Edit location')
            : (lang === 'ar' ? 'إضافة مكان' : 'Add location')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!mapScrollLock}
        >
          <StaggeredReveal index={0}>
            <SectionHeader
              title={lang === 'ar' ? 'البحث وموقع الخريطة' : 'Search & Map Location'}
              icon="map"
              subtitle={latitude !== null
                ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                : (lang === 'ar' ? 'ابحث عن مكان أو اضغط على الخريطة' : 'Search for a place or tap the map')}
              align={textAlign}
            />
            
            <View>
              <FormField
                icon="search"
                placeholder={lang === 'ar' ? 'ابحث عن مكان للتحديد...' : 'Search place to pin...'}
                value={searchQuery}
                onChangeText={onSearchTextChange}
              />
              
              {searchLoading && suggestions.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={theme.color.brand} />
                </View>
              )}

              {suggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, {
                  backgroundColor: theme.color.surface,
                  borderColor: theme.color.border,
                }]}>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.placeId}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    style={{ maxHeight: 220 }}
                    renderItem={({ item: pred }) => (
                      <AnimatedPressable
                        style={[styles.suggestionItem, { borderBottomColor: theme.color.border }]}
                        onPress={() => handleSuggestionPress(pred.placeId, pred.text.text)}
                      >
                        <Ionicons name="location-outline" size={18} color={theme.color.textMuted} />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={{ color: theme.color.text, fontFamily: theme.fontFamily, fontSize: scale(theme.fontSizes.md) }}>
                            {pred.structuredFormat?.mainText?.text || pred.text.text}
                          </Text>
                          {pred.structuredFormat?.secondaryText?.text ? (
                            <Text style={{ color: theme.color.textMuted, fontFamily: theme.fontFamily, fontSize: scale(theme.fontSizes.sm), marginTop: 2 }}>
                              {pred.structuredFormat.secondaryText.text}
                            </Text>
                          ) : null}
                        </View>
                      </AnimatedPressable>
                    )}
                  />
                </View>
              )}
            </View>

            <View
              style={[
                styles.mapContainer,
                {
                  borderColor: theme.color.border,
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.color.bgSunken,
                },
              ]}
              onTouchStart={() => setMapScrollLock(true)}
              onTouchEnd={() => setMapScrollLock(false)}
              onTouchCancel={() => setMapScrollLock(false)}
            >
              <WebView
                key={theme.mode}
                ref={webViewRef}
                source={{ html: pickerHtml }}
                style={styles.map}
                onMessage={onWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />
            </View>
          </StaggeredReveal>

          <StaggeredReveal index={1}>
            <SectionHeader
              title={lang === 'ar' ? 'المعلومات الأساسية' : 'Basic info'}
              icon="information-circle"
              align={textAlign}
            />
            <FormField
              icon="text"
              placeholder={lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
              value={name}
              onChangeText={setName}
            />
            <FormField
              icon="text"
              placeholder={lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
              value={nameAr}
              onChangeText={setNameAr}
            />
            <FormField
              icon="document-text-outline"
              placeholder={lang === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <FormField
              icon="document-text-outline"
              placeholder={lang === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
              value={descriptionAr}
              onChangeText={setDescriptionAr}
              multiline
              numberOfLines={3}
            />
          </StaggeredReveal>

          <StaggeredReveal index={2}>
            <SectionHeader title={t('category')} icon="grid" align={textAlign} />
            <AnimatedPressable
              onPress={() => setShowCategoryPicker(true)}
              accessibilityLabel={t('category')}
              accessibilityRole="button"
              accessibilityState={{ selected: !!category }}
              style={[
                styles.pickerBtn,
                {
                  backgroundColor: theme.color.surface,
                  borderColor: category ? theme.color.brand : theme.color.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Ionicons
                name={category ? (theme.categoryIcon[category] || 'grid') : 'grid-outline'}
                size={20}
                color={category ? theme.color.brand : theme.color.textMuted}
              />
              <Text style={{
                flex: 1, marginLeft: 10,
                color: category ? theme.color.text : theme.color.textMuted,
                fontSize: scale(theme.fontSizes.md),
                fontWeight: category ? theme.fontWeights.semibold : theme.fontWeights.regular,
                fontFamily: theme.fontFamily,
                textAlign,
              }}>
                {category ? t(category) : (lang === 'ar' ? 'اختر فئة' : 'Pick a category')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
            </AnimatedPressable>
          </StaggeredReveal>

          <StaggeredReveal index={3}>
            <SectionHeader title={t('address')} icon="location" align={textAlign} />
            <FormField
              icon="location-outline"
              placeholder={lang === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}
              value={address}
              onChangeText={setAddress}
            />
            <FormField
              icon="location-outline"
              placeholder={lang === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
              value={addressAr}
              onChangeText={setAddressAr}
            />
          </StaggeredReveal>

          <StaggeredReveal index={4}>
            <SectionHeader
              title={t('accessibilityFeatures')}
              icon="accessibility"
              subtitle={selectedFeatures.size === 0
                ? (lang === 'ar' ? 'اختر الميزات المتاحة' : 'Select available features')
                : (lang === 'ar' ? `${selectedFeatures.size} محدد` : `${selectedFeatures.size} selected`)}
              align={textAlign}
            />
            <View style={styles.chipFlow}>
              {FEATURES.map((feat) => (
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
          </StaggeredReveal>

          <StaggeredReveal index={5}>
            <SectionHeader
              title={lang === 'ar' ? 'الصور' : 'Photos'}
              icon="camera"
              subtitle={lang === 'ar'
                ? `${currentPhotoCount()} / 5 صور · الحد الأقصى 5 ميجابايت لكل صورة`
                : `${currentPhotoCount()} / 5 photos · max 5 MB each`}
              align={textAlign}
            />
            <View style={styles.photoActions}>
              <AnimatedPressable
                onPress={pickFromGallery}
                accessibilityLabel={lang === 'ar' ? 'اختر من المعرض' : 'Pick from gallery'}
                style={[styles.photoBtn, {
                  backgroundColor: theme.color.brandMuted,
                  borderRadius: theme.radii.md,
                }]}
              >
                <Ionicons name="images" size={18} color={theme.color.textBrand} />
                <Text style={{
                  marginLeft: 8, color: theme.color.textBrand,
                  fontSize: scale(theme.fontSizes.sm),
                  fontWeight: theme.fontWeights.semibold,
                  fontFamily: theme.fontFamily,
                }}>
                  {lang === 'ar' ? 'من المعرض' : 'Gallery'}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={takePhoto}
                accessibilityLabel={lang === 'ar' ? 'التقط صورة' : 'Take photo'}
                style={[styles.photoBtn, {
                  backgroundColor: theme.color.brandMuted,
                  borderRadius: theme.radii.md,
                }]}
              >
                <Ionicons name="camera" size={18} color={theme.color.textBrand} />
                <Text style={{
                  marginLeft: 8, color: theme.color.textBrand,
                  fontSize: scale(theme.fontSizes.sm),
                  fontWeight: theme.fontWeights.semibold,
                  fontFamily: theme.fontFamily,
                }}>
                  {lang === 'ar' ? 'الكاميرا' : 'Camera'}
                </Text>
              </AnimatedPressable>
            </View>

            {(photos.length > 0 || existingPhotos.length > 0) ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                {existingPhotos
                  .filter((f) => !removedExistingPhotos.has(f))
                  .map((filename, i) => (
                    <View key={`existing-${i}`} style={styles.photoWrap}>
                      <Image
                        source={{ uri: `${getUploadsBase()}/${filename}` }}
                        style={[styles.photo, { borderRadius: theme.radii.md }]}
                      />
                      <AnimatedPressable
                        onPress={() => removeExistingPhoto(filename)}
                        accessibilityLabel={lang === 'ar' ? 'حذف الصورة' : 'Remove photo'}
                        hitSlop={6}
                        style={[styles.photoRemove, { backgroundColor: theme.color.danger }]}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </AnimatedPressable>
                    </View>
                  ))}
                {photos.map((p, i) => (
                  <View key={`new-${i}`} style={styles.photoWrap}>
                    <Image source={{ uri: p.uri }} style={[styles.photo, { borderRadius: theme.radii.md }]} />
                    <AnimatedPressable
                      onPress={() => removePhoto(i)}
                      accessibilityLabel={lang === 'ar' ? 'حذف الصورة' : 'Remove photo'}
                      hitSlop={6}
                      style={[styles.photoRemove, { backgroundColor: theme.color.danger }]}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </AnimatedPressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </StaggeredReveal>

          <StaggeredReveal index={6}>
            <View style={{ marginTop: 24 }}>
              <PrimaryButton
                label={isEdit
                  ? (lang === 'ar' ? 'حفظ التغييرات' : 'Save changes')
                  : (lang === 'ar' ? 'إضافة المكان' : 'Add location')}
                icon="checkmark-circle-outline"
                loading={saving}
                onPress={handleSave}
              />
            </View>
          </StaggeredReveal>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title={t('category')}
        scrollable
      >
        {CATEGORIES.map((cat) => {
          const selected = cat === category;
          return (
            <AnimatedPressable
              key={cat}
              onPress={() => {
                setCategory(cat);
                setShowCategoryPicker(false);
                announce(t(cat));
              }}
              accessibilityLabel={t(cat)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.catRow,
                {
                  backgroundColor: selected ? theme.color.brandMuted : 'transparent',
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <View style={[
                styles.catIconBox,
                { backgroundColor: theme.categoryColor[cat] || theme.color.brand },
              ]}>
                <Ionicons name={theme.categoryIcon[cat] || 'pin'} size={16} color="#FFFFFF" />
              </View>
              <Text style={{
                flex: 1, marginLeft: 12,
                color: selected ? theme.color.textBrand : theme.color.text,
                fontSize: scale(theme.fontSizes.md),
                fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.regular,
                fontFamily: theme.fontFamily,
              }}>
                {t(cat)}
              </Text>
              {selected ? (
                <Ionicons name="checkmark-circle" size={20} color={theme.color.brand} />
              ) : null}
            </AnimatedPressable>
          );
        })}
      </BottomSheet>
      </SafeAreaView>
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
    protanopia:   '0.567 0.433 0     0 0  0.558 0.442 0     0 0  0     0.242 0.758 0 0  0 0 0 1 0',
    deuteranopia: '0.625 0.375 0     0 0  0.7   0.3   0     0 0  0     0.3   0.7   0 0  0 0 0 1 0',
    tritanopia:   '0.95  0.05  0     0 0  0     0.433 0.567 0 0  0     0.475 0.525 0 0  0 0 0 1 0',
  };
  const m = matrices[colorBlindMode];
  if (!m) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden"><defs><filter id="cb-filter" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${m}"/></filter></defs></svg>`;
}

function generatePickerHtml(themeMode, colorBlindMode = 'none', highContrast = false) {
  const isDark = themeMode === 'dark';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const maroon = isDark ? '#B33838' : '#800000';
  const mapFilter = buildMapFilter(colorBlindMode, highContrast);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { ${mapFilter ? `filter: ${mapFilter};` : ''} }
    html, body, #map {
      width: 100%; height: 100%;
      background: ${isDark ? '#0A0707' : '#FAF7F5'};
    }
    .picker-marker {
      width: 28px; height: 28px;
      background-color: ${maroon};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid ${isDark ? '#0A0707' : '#FFFFFF'};
      box-shadow: 0 4px 12px rgba(128,0,0,0.4);
    }
    .picker-marker::after {
      content: '';
      width: 10px; height: 10px;
      background: ${isDark ? '#0A0707' : '#FFFFFF'};
      position: absolute;
      border-radius: 50%;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
  </style>
</head>
<body>
  ${buildColorBlindSVG(colorBlindMode)}
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, minZoom: 7, maxZoom: 18,
      maxBounds: [[28.5, 34.0], [34.0, 40.0]], maxBoundsViscosity: 1.0 })
      .setView([${JORDAN_CENTER.lat}, ${JORDAN_CENTER.lng}], 8);
    L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    var marker = null;

    var JORDAN_POLY = [
      [32.393992, 35.545665],[32.709192, 35.719918],[32.312938, 36.834062],
      [33.378686, 38.792341],[32.161009, 39.195468],[32.010217, 39.004886],
      [31.508413, 37.002166],[30.5085, 37.998849],[30.338665, 37.66812],
      [30.003776, 37.503582],[29.865283, 36.740528],[29.505254, 36.501214],
      [29.197495, 36.068941],[29.356555, 34.956037],[29.501326, 34.922603],
      [31.100066, 35.420918],[31.489086, 35.397561],[31.782505, 35.545252],
      [32.393992, 35.545665]
    ];

    function isPointInJordan(lat, lng) {
      var inside = false;
      for (var i = 0, j = JORDAN_POLY.length - 1; i < JORDAN_POLY.length; j = i++) {
        var xi = JORDAN_POLY[i][0], yi = JORDAN_POLY[i][1];
        var xj = JORDAN_POLY[j][0], yj = JORDAN_POLY[j][1];
        var intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    function placeMarker(lat, lng) {
      if (!isPointInJordan(lat, lng)) {
        showToast('Location must be within Jordan / \u0627\u0644\u0645\u0648\u0642\u0639 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062F\u0627\u062E\u0644 \u0627\u0644\u0623\u0631\u062F\u0646');
        return false;
      }
      if (marker) map.removeLayer(marker);
      var icon = L.divIcon({
        html: '<div class="picker-marker"></div>',
        className: 'picker-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      marker = L.marker([lat, lng], { icon: icon }).addTo(map);
      return true;
    }

    // out-of-bounds toast
    var toastEl = document.createElement('div');
    toastEl.id = 'bounds-toast';
    toastEl.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-family:sans-serif;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;text-align:center;max-width:90%;';
    toastEl.style.background = '${isDark ? "rgba(179,56,56,0.9)" : "rgba(128,0,0,0.9)"}';
    toastEl.style.color = '#fff';
    document.body.appendChild(toastEl);
    var toastTimer = null;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.style.opacity = '1';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function() { toastEl.style.opacity = '0'; }, 3000);
    }

    map.on('click', function(e) {
      if (!isPointInJordan(e.latlng.lat, e.latlng.lng)) {
        showToast('Location must be within Jordan / \u0627\u0644\u0645\u0648\u0642\u0639 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062F\u0627\u062E\u0644 \u0627\u0644\u0623\u0631\u062F\u0646');
        return;
      }
      placeMarker(e.latlng.lat, e.latlng.lng);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapClick',
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    });
  </script>
</body>
</html>
  `;
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
  content: { paddingHorizontal: 20, paddingTop: 8 },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    minHeight: 52,
  },

  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  mapContainer: {
    height: 240,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: { flex: 1 },

  chipFlow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 16,
  },

  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  photoWrap: { position: 'relative' },
  photo: { width: 100, height: 100 },
  photoRemove: {
    position: 'absolute',
    top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },

  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    minHeight: 52, marginBottom: 4,
  },
  catIconBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
});
