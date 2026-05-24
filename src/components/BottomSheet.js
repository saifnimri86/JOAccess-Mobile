import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, Dimensions, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, ScrollView as RNGHScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedPressable from './AnimatedPressable';
import { useAccessibility } from '../context/AccessibilityContext';
import GlassCard from './GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useKeyboardHeight from '../hooks/useKeyboardHeight';

const { height: SCREEN_H } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 1500;

export default function BottomSheet({
  visible,
  onClose,
  height = 'auto',
  title,
  children,
  scrollable = false,
  blocking = true,
  footer,
  avoidKeyboard = false,
}) {
  const { theme, prefersReducedMotion, announce } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { height: kbHeight } = useKeyboardHeight();

  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const maxAnimHeight = useSharedValue(SCREEN_H * 0.85);
  // docks sheet bottom above keyboard when avoidKeyboard is on
  const kbLift = useSharedValue(0);

  useEffect(() => {
    if (!avoidKeyboard) { kbLift.value = 0; return; }
    const target = kbHeight > 0 ? Math.max(0, kbHeight - insets.bottom) : 0;
    if (prefersReducedMotion) {
      kbLift.value = target;
    } else {
      kbLift.value = withTiming(target, { duration: 220 });
    }
  }, [kbHeight, avoidKeyboard, prefersReducedMotion, insets.bottom]);

  useEffect(() => {
    if (visible) {
      if (prefersReducedMotion) {
        translateY.value = 0;
        backdropOpacity.value = 1;
        maxAnimHeight.value = SCREEN_H * 0.85;
      } else {
        translateY.value = withSpring(0, theme.motion.spring.firm);
        backdropOpacity.value = withTiming(1, { duration: 220 });
        maxAnimHeight.value = withSpring(SCREEN_H * 0.85, theme.motion.spring.firm);
      }
      isExpanded.value = false;
      if (title) announce(title);
    } else {
      // reset for next open; modal handles the close visual
      translateY.value = SCREEN_H;
      backdropOpacity.value = 0;
      isExpanded.value = false;
    }
  }, [visible]);

  const handleClose = () => {
    if (prefersReducedMotion) {
      onClose();
      return;
    }
    // animate down then unmount via onClose
    translateY.value = withTiming(SCREEN_H, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 180 });
  };

  // Drag-to-dismiss and drag-to-expand
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isExpanded.value) {
        if (e.translationY > 0) {
          // Pulling down from 100%. Shrink the maxHeight back down to 85% proportionally
          const newHeight = Math.max(SCREEN_H * 0.85, SCREEN_H - e.translationY);
          maxAnimHeight.value = newHeight;

          // If dragged beyond the 15% distance, translate it downwards instead
          if (e.translationY > SCREEN_H * 0.15) {
            translateY.value = e.translationY - (SCREEN_H * 0.15);
            backdropOpacity.value = Math.max(0, 1 - translateY.value / 400);
          } else {
            translateY.value = 0;
            backdropOpacity.value = 1;
          }
        } else {
          // Dragging up while at 100%, rubber-band
          translateY.value = e.translationY * 0.25;
        }
      } else {
        // We are currently at the resting 85% / auto state
        if (e.translationY < 0) {
          // Dragging UP to expand: Increase maxHeight from 85% towards 100%
          const newHeight = Math.min(SCREEN_H, (SCREEN_H * 0.85) - e.translationY);
          maxAnimHeight.value = newHeight;
          
          if (newHeight >= SCREEN_H) {
             // Reached 100%, extra drag translates up (rubber band)
             translateY.value = ((SCREEN_H * 0.85) - e.translationY - SCREEN_H) * 0.25 * -1;
          } else {
             translateY.value = 0;
          }
          backdropOpacity.value = 1;
        } else {
          // dragging down from 85% to close
          translateY.value = e.translationY;
          backdropOpacity.value = Math.max(0, 1 - e.translationY / 400);
        }
      }
    })
    .onEnd((e) => {
      if (isExpanded.value) {
        const effectiveTranslation = e.translationY - (SCREEN_H * 0.15);
        if (effectiveTranslation > DISMISS_THRESHOLD || (e.velocityY > DISMISS_VELOCITY && e.translationY > 0)) {
           isExpanded.value = false;
           translateY.value = withTiming(SCREEN_H, { duration: 220 }, (finished) => {
             if (finished) runOnJS(onClose)();
           });
           backdropOpacity.value = withTiming(0, { duration: 200 });
        } else if (e.translationY > SCREEN_H * 0.08) {
           isExpanded.value = false;
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H * 0.85, theme.motion.spring.snappy);
        } else {
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H, theme.motion.spring.snappy);
        }
      } else {
        if (e.translationY > DISMISS_THRESHOLD || (e.velocityY > DISMISS_VELOCITY && e.translationY > 0)) {
           translateY.value = withTiming(SCREEN_H, { duration: 220 }, (finished) => {
             if (finished) runOnJS(onClose)();
           });
           backdropOpacity.value = withTiming(0, { duration: 200 });
        } else if (e.translationY < -SCREEN_H * 0.05) {
           isExpanded.value = true;
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H, theme.motion.spring.snappy);
        } else {
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H * 0.85, theme.motion.spring.snappy);
           backdropOpacity.value = withTiming(1, { duration: 180 });
        }
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => {
    let currentHeight = height === 'auto' ? undefined : Math.min(height, SCREEN_H * 0.85);

    return {
      transform: [{ translateY: translateY.value - kbLift.value }],
      maxHeight: maxAnimHeight.value,
      ...(height !== 'auto' ? { height: isExpanded.value ? maxAnimHeight.value : currentHeight } : {})
    };
  });

  const Content = scrollable ? RNGHScrollView : View;
  const contentProps = scrollable
    ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityHint="Dismisses the panel"
          onPress={blocking ? handleClose : undefined}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.color.surfaceOverlay },
              backdropStyle,
            ]}
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>

        <GestureDetector gesture={panGesture}>
            <Animated.View
            style={[
              styles.sheetShadow,
              sheetStyle,
              // shadow on outer layer only — inner clip would crop it
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
                elevation: 16,
              },
            ]}
            accessibilityViewIsModal
          >
            <View
              style={[
                styles.sheetClip,
                {
                  borderTopLeftRadius: theme.radii.xxl,
                  borderTopRightRadius: theme.radii.xxl,
                  // glass mode lets GlassCard provide the bg blur
                  backgroundColor: theme.glassUI ? 'transparent' : theme.color.surfaceElevated,
                  paddingBottom: Math.max(0, insets.bottom),
                },
              ]}
            >
              {theme.glassUI ? (
                <GlassCard
                  intensity="heavy"
                  borderless
                  style={{
                    borderTopLeftRadius: theme.radii.xxl,
                    borderTopRightRadius: theme.radii.xxl,
                  }}
                >
                  <SheetBody
                    title={title}
                    handleClose={handleClose}
                    scrollable={scrollable}
                    Content={Content}
                    contentProps={contentProps}
                    footer={footer}
                    theme={theme}
                  >
                    {children}
                  </SheetBody>
                </GlassCard>
              ) : (
                <SheetBody
                  title={title}
                  handleClose={handleClose}
                  scrollable={scrollable}
                  Content={Content}
                  contentProps={contentProps}
                  footer={footer}
                  theme={theme}
                >
                  {children}
                </SheetBody>
              )}
            </View>

            {/* covers the gap when sheet drags upward past resting position */}
            <View style={[
              styles.extensionBlock,
              { backgroundColor: theme.glassUI ? 'transparent' : theme.color.surfaceElevated }
            ]}>
              {theme.glassUI && (
                <GlassCard intensity="heavy" borderless style={StyleSheet.absoluteFill} />
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // outer carries the shadow; no overflow:hidden so it isn't clipped
  sheetShadow: {
    width: '100%',
  },
  // inner clips content and carries the top corner radius
  sheetClip: {
    overflow: 'hidden',
  },
  extensionBlock: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: Dimensions.get('window').height,
  },
  handleArea: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

function SheetBody({ title, handleClose, scrollable, Content, contentProps, footer, theme, children }) {
  return (
    <>
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: theme.color.borderStrong }]} />
      </View>

      {title ? (
        <View style={[styles.header, { borderBottomColor: theme.color.divider }]}>
          <Text
            style={{
              fontSize: theme.fontSizes.xl,
              fontWeight: theme.fontWeights.bold,
              color: theme.color.text,
              fontFamily: theme.fontFamily,
              flex: 1,
            }}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <AnimatedPressable
            onPress={handleClose}
            accessibilityLabel="Close panel"
            hitSlop={12}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={24} color={theme.color.textMuted} />
          </AnimatedPressable>
        </View>
      ) : null}

      <Content
        style={styles.body}
        contentContainerStyle={scrollable ? { paddingBottom: theme.spacing.xxl } : undefined}
        {...contentProps}
      >
        {children}
      </Content>

      {footer ? (
        <View style={[styles.footer, { borderTopColor: theme.color.divider }]}>
          {footer}
        </View>
      ) : null}
    </>
  );
}
