/**
 * ChatbotScreen (Phase 1.5 edits — keyboard fix)
 * ==============================================
 * Changes from previous:
 *   - Input bar now uses useKeyboardHeight hook to track the keyboard
 *     position directly. It animates up/down with the keyboard smoothly
 *     instead of being covered or floating awkwardly.
 *   - Removed KeyboardAvoidingView wrapper (was fighting with the
 *     floating tab bar / absolute-positioned input bar).
 *   - Input bar bottom position: max(insets.bottom, 8) + 78 when
 *     keyboard hidden (above tab bar), or keyboardHeight + 8 when shown
 *     (docked to keyboard top).
 *   - Auto-scrolls messages to bottom when keyboard opens so the latest
 *     message is always visible.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withSpring,
} from 'react-native-reanimated';

import { useLanguage } from '../context/LanguageContext';
import { useAccessibility } from '../context/AccessibilityContext';
import useKeyboardHeight from '../hooks/useKeyboardHeight';
import * as api from '../services/api';

import AnimatedPressable from '../components/AnimatedPressable';
import Chip from '../components/Chip';
import StaggeredReveal from '../components/StaggeredReveal';
import ThemeCard from '../components/ThemeCard';

export default function ChatbotScreen() {
  const { t, lang, isRTL } = useLanguage();
  const { theme, scale, announce, prefersReducedMotion } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { height: kbHeight, isVisible: kbVisible } = useKeyboardHeight();
  const scrollRef = useRef(null);

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

  // Auto-scroll when keyboard opens so last message is visible
  useEffect(() => {
    if (kbVisible) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [kbVisible]);

  async function sendMessage(text) {
    const messageText = (text || input).trim();
    if (!messageText || isSending) return;

    const userMsg = { id: `u-${Date.now()}`, type: 'user', text: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const response = await api.sendChatMessage(messageText, lang);
      const botMsg = {
        id: `b-${Date.now()}`,
        type: 'bot',
        text: response.response,
        suggestions: response.suggestions || [],
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

  // ─── Animated position for input bar ───
  // When kbVisible: dock to keyboard top (kbHeight from bottom + a tiny gap)
  // When hidden: rest above tab bar (safe-area + 78px)
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

  // Space to leave at bottom of scroll so last messages aren't hidden
  // behind the input bar. When keyboard is up, scroll padding grows.
  const scrollBottomPadding = (kbVisible ? kbHeight : tabBarSpace) + 72;

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <SafeAreaView
        style={styles.root}
        edges={['top', 'left', 'right']}
      >
        {/* Header */}
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

        {/* Messages */}
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
              <MessageBubble message={msg} onSuggestionPress={sendMessage} />
            </StaggeredReveal>
          ))}
          {isSending ? <TypingIndicator /> : null}
        </ScrollView>

        {/* Input bar — animated position tracks keyboard */}
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

function MessageBubble({ message, onSuggestionPress }) {
  const { theme, scale } = useAccessibility();
  const { lang } = useLanguage();
  const isUser = message.type === 'user';

  return (
    <View style={[
      styles.bubbleRow,
      { justifyContent: isUser ? 'flex-end' : 'flex-start' },
    ]}>
      <View style={{ maxWidth: '82%' }}>
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
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  messages: { flex: 1 },

  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },

  suggestionRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 6, marginTop: 8, paddingHorizontal: 2,
  },

  dot: { width: 6, height: 6, borderRadius: 3 },

  // Absolutely positioned — the `bottom` is animated by Reanimated.
  // This means the input bar never leaves the viewport and always sits
  // exactly where we want it regardless of keyboard/tab-bar state.
  inputBarWrapper: {
    position: 'absolute',
    left: 16, right: 16,
    paddingBottom: 13,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  input: {
    flex: 1, padding: 0, paddingVertical: 6,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
});
