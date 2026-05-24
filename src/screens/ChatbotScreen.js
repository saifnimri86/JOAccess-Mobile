import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Platform, Image,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withSpring,
} from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { getUploadsBase } from '../config';

import AnimatedPressable from '../components/AnimatedPressable';
import Chip from '../components/Chip';
import StaggeredReveal from '../components/StaggeredReveal';
import ThemeCard from '../components/ThemeCard';
import { spacing, radii } from '../utils/theme';

export default function ChatbotScreen() {
  const { t, lang, isRTL } = useLanguage();
  const { theme, scale, announce, prefersReducedMotion } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { height: kbHeight, isVisible: kbVisible } = useKeyboardHeight();
  const scrollRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();

  // map tab reads focusLocationId on focus to open the detail sheet
  const openLocationDetail = (locationId) => {
    navigation.navigate('MapTab', { focusLocationId: locationId });
  };

  const [messages, setMessages] = useState([
    {
      id: '0',
      type: 'bot',
      text: t('chatWelcome'),
      suggestions: lang === 'ar'
        ? ['كرسي متحرك', 'مطاعم', 'مواقف']
        : ['Wheelchair access', 'Restaurants', 'Parking'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // persisted so we only prompt undetermined users, not denied ones
  const LOC_PERM_ASKED_KEY = 'joaccess_loc_perm_ever_asked';

  // returns {lat,lng} or null
  async function getCoordsFix() {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    });
  }

  // returns { enabled, lat?, lng? }. fires OS prompt on first undetermined
  // android case without awaiting so the current message still sends.
  async function getLocationInfo() {
    try {
      if (Platform.OS === 'android') {
        const has = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (has) {
          const coords = await getCoordsFix();
          return coords
            ? { enabled: true, lat: coords.lat, lng: coords.lng }
            : { enabled: true };
        }
        // distinguish undetermined from denied
        let everAsked = false;
        try {
          everAsked = (await EncryptedStorage.getItem(LOC_PERM_ASKED_KEY)) === '1';
        } catch {}
        if (!everAsked) {
          // fire-and-forget; mark asked so we don't re-prompt after denial
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: lang === 'ar' ? 'إذن الموقع' : 'Location permission',
              message: lang === 'ar'
                ? 'يساعد المساعد على اقتراح أماكن قريبة منك.'
                : 'Sharing your location helps the assistant suggest nearby places.',
              buttonPositive: lang === 'ar' ? 'موافق' : 'OK',
              buttonNegative: lang === 'ar' ? 'لا' : 'No',
            },
          ).finally(() => {
            EncryptedStorage.setItem(LOC_PERM_ASKED_KEY, '1').catch(() => {});
          });
        }
        return { enabled: false };
      }
      if (Platform.OS === 'ios') {
        // requestAuthorization prompts on first call; later calls return cached status
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth === 'granted') {
          const coords = await getCoordsFix();
          return coords
            ? { enabled: true, lat: coords.lat, lng: coords.lng }
            : { enabled: true };
        }
        return { enabled: false };
      }
      return { enabled: false };
    } catch {
      return { enabled: false };
    }
  }

  // auto-scroll when keyboard opens so last message stays visible
  useEffect(() => {
    if (kbVisible) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [kbVisible]);

  async function sendMessage(text) {
    const messageText = (text || input).trim();
    if (!messageText || isSending) return;

    if (!isAuthenticated) {
      const authMsg = lang === 'ar'
        ? 'يجب تسجيل الدخول أولاً لاستخدام المساعد. يرجى تسجيل الدخول من صفحة الملف الشخصي.'
        : 'You need to be logged in to use the assistant. Please log in from the Profile tab.';
      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}`,
        type: 'bot',
        text: authMsg,
        suggestions: [],
        locations: [],
      }]);
      return;
    }

    const userMsg = { id: `u-${Date.now()}`, type: 'user', text: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const location = await getLocationInfo();
      const response = await api.sendChatMessage(messageText, lang, location);
      const botMsg = {
        id: `b-${Date.now()}`,
        type: 'bot',
        text: response.response,
        suggestions: response.suggestions || [],
        locations: response.locations || [],
      };
      setMessages((prev) => [...prev, botMsg]);
      announce(response.response);
    } catch {
      const errText = lang === 'ar'
        ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
        : 'Sorry, something went wrong. Please try again.';
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, type: 'bot', text: errText, suggestions: [] }]);
      announce(errText);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }

  // dock to keyboard top when visible, else rest above tab bar
  const tabBarSpace = Math.max(insets.bottom, 8) + 78;
  const targetBottom = useSharedValue(tabBarSpace);

  useEffect(() => {
    const target = kbVisible ? kbHeight + 8 : tabBarSpace;
    if (prefersReducedMotion) {
      targetBottom.value = target;
    } else {
      targetBottom.value = withSpring(target, theme.motion.spring.snappy);
    }
  }, [kbHeight, kbVisible, prefersReducedMotion, tabBarSpace]);

  const inputBarAnimStyle = useAnimatedStyle(() => ({
    bottom: targetBottom.value,
  }));

  // bottom padding so messages aren't hidden behind the input bar
  const scrollBottomPadding = (kbVisible ? kbHeight : tabBarSpace) + 72;

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView
        style={styles.root}
        edges={['top', 'left', 'right']}
      >
        <View style={styles.header}>
          <Text style={{
            fontSize: scale(theme.fontSizes.xxxl),
            fontWeight: theme.fontWeights.heavy,
            color: theme.color.text,
            fontFamily: theme.fontFamily,
            textAlign: 'center',
          }} accessibilityRole="header">
            {t('chatbotTitle')}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: scrollBottomPadding,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((msg, i) => (
            <StaggeredReveal key={msg.id} index={Math.min(i, 6)} from="bottom">
              <MessageBubble
                message={msg}
                onSuggestionPress={sendMessage}
                onLocationPress={openLocationDetail}
              />
            </StaggeredReveal>
          ))}
          {isSending ? <TypingIndicator /> : null}
        </ScrollView>

        <Animated.View
          style={[
            styles.inputBarWrapper,
            inputBarAnimStyle,
          ]}
        >
          <ThemeCard style={[
            {
              backgroundColor: theme.glassUI ? theme.color.floatingSurface : theme.color.surface,
              borderColor: theme.color.border,
              borderRadius: theme.radii.pill,
              borderWidth: StyleSheet.hairlineWidth,
              ...theme.elevation.md,
            },
          ]}>
            <View style={[styles.inputBar, { borderWidth: 0 }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.color.text,
                    fontSize: scale(theme.fontSizes.md),
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: theme.fontFamily,
                  },
                ]}
                placeholder={t('chatPlaceholder')}
                placeholderTextColor={theme.color.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                accessibilityLabel={t('chatPlaceholder')}
                accessibilityHint={lang === 'ar'
                  ? 'اكتب رسالتك للمساعد'
                  : 'Type your message to the assistant'}
                multiline
                maxLength={500}
                blurOnSubmit={false}
              />
              <AnimatedPressable
                onPress={() => sendMessage()}
                disabled={!input.trim() || isSending}
                accessibilityLabel={lang === 'ar' ? 'إرسال الرسالة' : 'Send message'}
                accessibilityHint={lang === 'ar'
                  ? 'يرسل الرسالة للمساعد'
                  : 'Sends your message to the assistant'}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: input.trim() ? theme.color.brand : theme.color.border,
                    opacity: input.trim() ? 1 : 0.5,
                  },
                ]}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={theme.color.textOnBrand}
                  style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                />
              </AnimatedPressable>
            </View>
          </ThemeCard>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function MessageBubble({ message, onSuggestionPress, onLocationPress }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  const isUser = message.type === 'user';

  return (
    <View style={[
      styles.bubbleRow,
      { justifyContent: isUser ? 'flex-end' : 'flex-start' },
    ]}>
      <View style={{ maxWidth: '92%' }}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? theme.color.brand : theme.color.surface,
              borderColor: isUser ? 'transparent' : theme.color.border,
              borderTopRightRadius: isUser ? 4 : theme.radii.lg,
              borderTopLeftRadius: isUser ? theme.radii.lg : 4,
              borderBottomLeftRadius: theme.radii.lg,
              borderBottomRightRadius: theme.radii.lg,
              ...theme.elevation.sm,
            },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${isUser
            ? (lang === 'ar' ? 'أنت قلت' : 'You said')
            : (lang === 'ar' ? 'المساعد قال' : 'Assistant said')}: ${message.text}`}
        >
          <Text style={{
            color: isUser ? theme.color.textOnBrand : theme.color.text,
            fontSize: scale(theme.fontSizes.md),
            lineHeight: scale(theme.fontSizes.md) * 1.4,
            fontFamily: theme.fontFamily,
          }}>
            {message.text}
          </Text>
        </View>

        {!isUser && message.locations?.length > 0 ? (
          <View style={{ marginTop: 8, gap: 10 }}>
            {message.locations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onPress={() => onLocationPress?.(loc.id)}
              />
            ))}
          </View>
        ) : null}

        {!isUser && message.suggestions?.length > 0 ? (
          <View style={styles.suggestionRow}>
            {message.suggestions.map((sug, i) => (
              <Chip
                key={i}
                label={sug}
                onPress={() => onSuggestionPress(sug)}
                size="sm"
                tone="brand"
                accessibilityHint={lang === 'ar'
                  ? 'يرسل هذا الاقتراح كسؤال'
                  : 'Sends this suggestion as a question'}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}


function humanizeFeature(key, t) {
  // fall back to snake_case → Title Case for keys not in the dictionary
  const translated = t ? t(key) : key;
  if (translated && translated !== key) return translated;
  return key
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function LocationCard({ location, onPress }) {
  const { theme, scale } = useAccessibility();
  const { t, lang } = useLanguage();

  const isArabicMode = lang === 'ar';
  const primaryName = isArabicMode
    ? (location.name_ar || location.name)
    : (location.name || location.name_ar);
  const secondaryName = isArabicMode
    ? location.name
    : location.name_ar;
  const showSecondaryName =
    secondaryName && secondaryName !== primaryName;

  const address = isArabicMode
    ? (location.address_ar || location.address)
    : (location.address || location.address_ar);

  const features = Array.isArray(location.features) ? location.features : [];
  const shownFeatures = features.slice(0, 3);
  const extraFeatureCount = Math.max(0, features.length - shownFeatures.length);

  const photoUri = location.photo
    ? `${getUploadsBase()}/${location.photo}`
    : null;

  const avg = Number(location.avg_rating) || 0;
  const reviewCount = Number(location.review_count) || 0;
  const hasRatings = avg > 0 || reviewCount > 0;
  const filledStars = Math.round(avg);

  const distance = (typeof location.distance_km === 'number'
    && Number.isFinite(location.distance_km))
    ? location.distance_km
    : null;

  const a11yLabel = [
    primaryName,
    address,
    hasRatings
      ? `${avg.toFixed(1)} ${isArabicMode ? 'من 5' : 'out of 5'}, ${reviewCount} ${reviewCount === 1 ? (isArabicMode ? 'مراجعة' : 'review') : (isArabicMode ? 'مراجعات' : 'reviews')}`
      : (isArabicMode ? 'لا توجد تقييمات بعد' : 'No ratings yet'),
    distance != null
      ? `${distance.toFixed(1)} ${isArabicMode ? 'كم بعيد' : 'km away'}`
      : null,
    location.is_verified ? (isArabicMode ? 'موثق' : 'verified') : null,
  ].filter(Boolean).join('. ');

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={isArabicMode
        ? 'يفتح تفاصيل الموقع على الخريطة'
        : 'Opens this location on the map'}
      style={[
        styles.locationCard,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
          ...theme.elevation.sm,
        },
      ]}
    >
      <View>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.locationCardPhoto}
            resizeMode="cover"
            accessible={false}
          />
        ) : (
          <View style={[
            styles.locationCardPhoto,
            styles.locationCardPhotoPlaceholder,
            { backgroundColor: theme.categoryColor[location.category] || theme.color.brand },
          ]}>
            <Ionicons
              name={theme.categoryIcon[location.category] || 'pin'}
              size={44}
              color="#FFFFFF"
            />
          </View>
        )}
        {location.is_verified ? (
          <View
            style={[
              styles.verifiedBadge,
              { backgroundColor: theme.color.success || theme.color.brand },
            ]}
            accessible={false}
          >
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            <Text style={{
              color: '#FFFFFF',
              fontSize: scale(theme.fontSizes.xs),
              fontWeight: theme.fontWeights.bold,
              fontFamily: theme.fontFamily,
              marginLeft: 4,
            }}>
              {isArabicMode ? 'موثق' : 'Verified'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.locationCardBody}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: scale(theme.fontSizes.md),
            fontWeight: theme.fontWeights.bold,
            color: theme.color.text,
            fontFamily: theme.fontFamily,
          }}
        >
          {primaryName}
        </Text>

        {showSecondaryName ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: scale(theme.fontSizes.xs),
              color: theme.color.textMuted,
              fontFamily: theme.fontFamily,
              marginTop: 2,
            }}
          >
            {secondaryName}
          </Text>
        ) : null}

        {address ? (
          <Text
            numberOfLines={2}
            style={{
              fontSize: scale(theme.fontSizes.xs),
              color: theme.color.textMuted,
              fontFamily: theme.fontFamily,
              marginTop: 6,
            }}
          >
            {address}
          </Text>
        ) : null}

        <View style={styles.locationCardRow}>
          {hasRatings ? (
            <>
              <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= filledStars ? 'star' : 'star-outline'}
                    size={13}
                    color={i <= filledStars ? theme.color.star : theme.color.starEmpty}
                  />
                ))}
              </View>
              <Text style={{
                fontSize: scale(theme.fontSizes.xs),
                fontWeight: theme.fontWeights.semibold,
                color: theme.color.text,
                fontFamily: theme.fontFamily,
                marginLeft: 6,
              }}>
                {avg.toFixed(1)}
              </Text>
              <Text style={{
                fontSize: scale(theme.fontSizes.xs),
                color: theme.color.textMuted,
                fontFamily: theme.fontFamily,
                marginLeft: 4,
              }}>
                ({reviewCount})
              </Text>
            </>
          ) : (
            <Text style={{
              fontSize: scale(theme.fontSizes.xs),
              color: theme.color.textMuted,
              fontFamily: theme.fontFamily,
              fontStyle: 'italic',
            }}>
              {isArabicMode ? 'لا توجد تقييمات بعد' : 'No ratings yet'}
            </Text>
          )}
        </View>

        {distance != null ? (
          <View style={styles.locationCardRow}>
            <Ionicons name="navigate-outline" size={13} color={theme.color.textMuted} />
            <Text style={{
              fontSize: scale(theme.fontSizes.xs),
              color: theme.color.textMuted,
              fontFamily: theme.fontFamily,
              marginLeft: 4,
            }}>
              {`${distance.toFixed(1)} ${isArabicMode ? 'كم' : 'km away'}`}
            </Text>
          </View>
        ) : null}

        {(shownFeatures.length > 0 || extraFeatureCount > 0) ? (
          <View style={styles.locationCardFeatureRow}>
            {shownFeatures.map((f) => (
              <View
                key={f}
                style={[styles.featureChip, { backgroundColor: theme.color.brandMuted }]}
              >
                <Text style={{
                  fontSize: scale(theme.fontSizes.xs),
                  color: theme.color.textBrand,
                  fontFamily: theme.fontFamily,
                  fontWeight: theme.fontWeights.semibold,
                }}>
                  {humanizeFeature(f, t)}
                </Text>
              </View>
            ))}
            {extraFeatureCount > 0 ? (
              <View
                style={[styles.featureChip, { backgroundColor: theme.color.border }]}
              >
                <Text style={{
                  fontSize: scale(theme.fontSizes.xs),
                  color: theme.color.textMuted,
                  fontFamily: theme.fontFamily,
                  fontWeight: theme.fontWeights.semibold,
                }}>
                  {`+${extraFeatureCount} ${isArabicMode ? 'المزيد' : 'more'}`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}


function TypingIndicator() {
  const { theme, prefersReducedMotion } = useAccessibility();
  const { lang } = useLanguage();
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const anim = (sv, delay) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 240 }),
            withTiming(0.3, { duration: 240 }),
          ), -1, false);
      }, delay);
    };
    anim(d1, 0);
    anim(d2, 100);
    anim(d3, 200);
  }, [prefersReducedMotion]);

  const s1 = useAnimatedStyle(() => ({ opacity: prefersReducedMotion ? 0.6 : d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: prefersReducedMotion ? 0.6 : d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: prefersReducedMotion ? 0.6 : d3.value }));

  return (
    <View style={[styles.bubbleRow, { justifyContent: 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            borderTopLeftRadius: 4,
            borderTopRightRadius: theme.radii.lg,
            borderBottomLeftRadius: theme.radii.lg,
            borderBottomRightRadius: theme.radii.lg,
            ...theme.elevation.sm,
          },
        ]}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={lang === 'ar' ? 'المساعد يكتب' : 'Assistant is typing'}
      >
        <Animated.View style={[styles.dot, { backgroundColor: theme.color.textMuted }, s1]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.color.textMuted }, s2]} />
        <Animated.View style={[styles.dot, { backgroundColor: theme.color.textMuted }, s3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  messages: { flex: 1 },

  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm + 2 },
  bubble: {
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },


  locationCard: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  locationCardPhoto: {
    width: '100%',
    height: 140,
  },
  locationCardPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardBody: {
    padding: spacing.md,
  },
  locationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationCardFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: 10,
  },
  featureChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radii.sm,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },


  suggestionRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.xs + 2, marginTop: spacing.sm, paddingHorizontal: spacing.xxs,
  },

  dot: { width: 6, height: 6, borderRadius: radii.pill },

  // bottom is animated by reanimated so the bar tracks keyboard/tab-bar
  inputBarWrapper: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg,
    paddingBottom: spacing.md + 1,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  input: {
    flex: 1, padding: 0, paddingVertical: spacing.xs + 2,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: radii.pill,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: spacing.sm,
  },
});


