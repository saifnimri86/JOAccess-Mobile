import React, { useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { useAccessibility } from '../context/AccessibilityContext';
import AnimatedPressable from './AnimatedPressable';

export default function AppDialog({ title, message, buttons, onDismiss }) {
  const { theme, scale, prefersReducedMotion } = useAccessibility();
  const btns = buttons?.length ? buttons : [{ text: 'OK' }];

  const opacity = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const cardTranslateY = useSharedValue(10);

  useEffect(() => {
    if (prefersReducedMotion) {
      opacity.value = 1;
      cardScale.value = 1;
      cardTranslateY.value = 0;
    } else {
      opacity.value = withTiming(1, { duration: 160 });
      cardScale.value = withSpring(1, theme.motion.spring.snappy);
      cardTranslateY.value = withSpring(0, theme.motion.spring.snappy);
    }
  }, []);

  function handleDismiss() {
    if (prefersReducedMotion) {
      onDismiss();
      return;
    }
    opacity.value = withTiming(0, { duration: 130 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
    cardScale.value = withTiming(0.9, { duration: 130 });
    cardTranslateY.value = withTiming(6, { duration: 130 });
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const hasCancel = btns.some(b => b.style === 'cancel');
      if (hasCancel || btns.length === 1) handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [btns]);

  function handlePress(btn) {
    btn.onPress?.();
    handleDismiss();
  }

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
    opacity: opacity.value,
  }));

  const cancelBtn = btns.find(b => b.style === 'cancel');
  const horizontal = btns.length <= 2;

  return (
    <Modal
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelBtn || btns.length === 1) handleDismiss();
      }}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.surfaceOverlay }, backdropStyle]}
      />
      {cancelBtn && <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />}

      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View style={[{ borderRadius: theme.radii.xl }, theme.elevation.xl, cardStyle]}>
          <View style={[styles.card, { backgroundColor: theme.color.surface, borderRadius: theme.radii.xl }]}>
            <View style={styles.content}>
              <Text style={{
                fontSize: scale(theme.fontSizes.lg),
                fontWeight: theme.fontWeights.bold,
                color: theme.color.text,
                fontFamily: theme.fontFamily,
                textAlign: 'center',
              }}>
                {title}
              </Text>
              {!!message && (
                <Text style={{
                  fontSize: scale(theme.fontSizes.md),
                  color: theme.color.textMuted,
                  fontFamily: theme.fontFamily,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: scale(theme.fontSizes.md) * 1.55,
                }}>
                  {message}
                </Text>
              )}
            </View>

            <View style={[styles.divH, { backgroundColor: theme.color.border }]} />

            <View style={[styles.btnRow, horizontal && styles.btnRowH]}>
              {btns.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const color = isDestructive
                  ? theme.color.danger
                  : isCancel ? theme.color.textMuted : theme.color.brand;

                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <View style={[
                        horizontal ? styles.divV : styles.divH,
                        { backgroundColor: theme.color.border },
                      ]} />
                    )}
                    <AnimatedPressable
                      style={[styles.btn, horizontal && { flex: 1 }]}
                      onPress={() => handlePress(btn)}
                      accessibilityLabel={btn.text}
                    >
                      <Text style={{
                        fontSize: scale(theme.fontSizes.md),
                        fontWeight: isCancel ? theme.fontWeights.regular : theme.fontWeights.bold,
                        color,
                        fontFamily: theme.fontFamily,
                        textAlign: 'center',
                      }}>
                        {btn.text}
                      </Text>
                    </AnimatedPressable>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  card: {
    width: '100%',
    minWidth: 270,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  divH: { height: StyleSheet.hairlineWidth },
  divV: { width: StyleSheet.hairlineWidth },
  btnRow: {},
  btnRowH: { flexDirection: 'row' },
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
