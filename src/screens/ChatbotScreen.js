import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { colors, spacing, borderRadius, fontSizes, fontWeights } from '../utils/theme';

export default function ChatbotScreen() {
  const { t, lang, isRTL } = useLanguage();
  const scrollViewRef = useRef(null);

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
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(text) {
    const messageText = (text || inputText).trim();
    if (!messageText || isSending) return;

    // Add user message
    const userMsg = { id: Date.now().toString(), type: 'user', text: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await api.sendChatMessage(messageText, lang);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: response.response,
        suggestions: response.suggestions || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: lang === 'ar'
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Sorry, something went wrong. Please try again.',
        suggestions: [],
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }

  function handleSuggestion(suggestion) {
    sendMessage(suggestion);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles" size={24} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>{t('chatbotTitle')}</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id}>
            <View
              style={[
                styles.messageBubble,
                msg.type === 'user' ? styles.userBubble : styles.botBubble,
                isRTL && { alignSelf: msg.type === 'user' ? 'flex-start' : 'flex-end' },
              ]}
            >
              {msg.type === 'bot' && (
                <View style={styles.botIconSmall}>
                  <Ionicons name="chatbubble-ellipses" size={14} color={colors.white} />
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.type === 'user' ? styles.userText : styles.botText,
                  isRTL && { textAlign: 'right' },
                ]}
              >
                {msg.text}
              </Text>
            </View>

            {/* Suggestion buttons */}
            {msg.type === 'bot' && msg.suggestions?.length > 0 && (
              <View style={[styles.suggestionsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {msg.suggestions.map((suggestion, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionBtn}
                    onPress={() => handleSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Typing indicator */}
        {isSending && (
          <View style={[styles.messageBubble, styles.botBubble]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputArea}>
        <TextInput
          style={[styles.chatInput, isRTL && { textAlign: 'right' }]}
          placeholder={t('chatPlaceholder')}
          placeholderTextColor={colors.mediumGrey}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isSending}
        >
          <Ionicons
            name={isRTL ? 'arrow-back' : 'arrow-forward'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.grey },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  // ── Messages ──
  messagesContainer: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  messageBubble: {
    maxWidth: '82%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  botIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  userText: { color: colors.white },
  botText: { color: colors.black },

  // ── Suggestions ──
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  suggestionBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // ── Input area ──
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGrey,
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.grey,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
