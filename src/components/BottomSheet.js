/**
 * BottomSheet
 * ===========
 * A custom bottom sheet with spring-physics entrance/exit.
 *
 * Why not the `@gorhom/bottom-sheet` library?
 *   It's excellent but it's another 100KB dependency and the project already
 *   has react-native-reanimated + gesture-handler. This component does 95% of
 *   what we need (slide up, tap-to-dismiss, drag-handle indicator) in ~150
 *   lines and no new deps.
 *
 * Behavior:
 *   - Slides up from the bottom with a spring (or instantly if reducedMotion)
 *   - Backdrop fades to 48% black
 *   - Tapping the backdrop closes it
 *   - Draggable down to dismiss (threshold: 120px or fling velocity)
 *   - Max height: 85% of the screen
 *   - Drag-handle bar at the top for affordance
 *
 * Props:
 *   visible         boolean
 *   onClose         function
 *   height          number | 'auto' (default 'auto' — content-sized up to 85%)
 *   title           string — optional, renders a header with close button
 *   children        ReactNode
 *   scrollable      boolean (default false) — wraps children in ScrollView
 *   blocking        boolean (default true) — tap-backdrop-to-close toggle
 *   footer          ReactNode — sticky footer (action buttons etc.)
 *
 * Accessibility:
 *   - Modal with accessibilityViewIsModal
 *   - announce() called on open/close via the close/open effects
 *   - Backdrop has accessible=false so the native reader skips it
 */

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
}) {
  const { theme, prefersReducedMotion, announce } = useAccessibility();
  const insets = useSafeAreaInsets();

  // Start with the sheet off-screen
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const maxAnimHeight = useSharedValue(SCREEN_H * 0.85);

  useEffect(() => {
    if (visible) {
      // Open animation
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
      // Close animation — handled by Modal unmount, just reset for next open
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
    // Animate down then actually unmount via onClose()
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
          // Dragging down from 85% to close
          translateY.value = e.translationY;
          backdropOpacity.value = Math.max(0, 1 - e.translationY / 400);
        }
      }
    })
    .onEnd((e) => {
      if (isExpanded.value) {
        // Check if we should close entirely
        const effectiveTranslation = e.translationY - (SCREEN_H * 0.15);
        if (effectiveTranslation > DISMISS_THRESHOLD || (e.velocityY > DISMISS_VELOCITY && e.translationY > 0)) {
           isExpanded.value = false;
           translateY.value = withTiming(SCREEN_H, { duration: 220 }, (finished) => {
             if (finished) runOnJS(onClose)();
           });
           backdropOpacity.value = withTiming(0, { duration: 200 });
        } else if (e.translationY > SCREEN_H * 0.08) { // A lighter threshold to return to 85%
           isExpanded.value = false;
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H * 0.85, theme.motion.spring.snappy);
        } else {
           // Snap back to 100%
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H, theme.motion.spring.snappy);
        }
      } else {
        if (e.translationY > DISMISS_THRESHOLD || (e.velocityY > DISMISS_VELOCITY && e.translationY > 0)) {
           translateY.value = withTiming(SCREEN_H, { duration: 220 }, (finished) => {
             if (finished) runOnJS(onClose)();
           });
           backdropOpacity.value = withTiming(0, { duration: 200 });
        } else if (e.translationY < -SCREEN_H * 0.05) { // Threshold to expand
           isExpanded.value = true;
           translateY.value = withSpring(0, theme.motion.spring.snappy);
           maxAnimHeight.value = withSpring(SCREEN_H, theme.motion.spring.snappy);
        } else {
           // Snap back to 85%
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
      transform: [{ translateY: translateY.value }],
      maxHeight: maxAnimHeight.value,
      // If they used a fixed height, animate it towards SCREEN_H smoothly when expanded
      ...(height !== 'auto' ? { height: isExpanded.value ? maxAnimHeight.value : currentHeight } : {})
    };
  });

  // We explicitly use standard views/scrollviews. The parent GestureDetector
  // naturally grabs dragging on the sheet surface. 
  const Content = scrollable ? RNGHScrollView : View;
  const contentProps = scrollable
    ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}     // Android hardware back button
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.root}>
        {/* Backdrop — plain Pressable (no scale animation on a full-screen element) */}
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

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
            <Animated.View
            style={[
              styles.sheetShadow,
              sheetStyle,
              // Shadow lives on THIS layer only — outer, no clipping. That's
              // the fix for the "dim patches bleeding onto the sheet body"
              // bug. Previously the shadow was on the ThemeCard inside a
              // clipping wrapper, and Android rendered it inside the
              // children's bounds when the surface was translucent.
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
              // Inner clipping layer: holds the rounded top corners and clips
              // the body content, but carries no shadow of its own.
              style={[
                styles.sheetClip,
                {
                  borderTopLeftRadius: theme.radii.xxl,
                  borderTopRightRadius: theme.radii.xxl,
                  // In non-glass mode, this View IS the sheet surface.
                  // In glass mode the GlassCard inside provides the blur
                  // so we don't paint a bg here (would cover the blur).
                  backgroundColor: theme.glassUI ? 'transparent' : theme.color.surfaceElevated,
                  paddingBottom: Math.max(0, insets.bottom),
                },
              ]}
            >
              {theme.glassUI ? (
                // Glass mode — real blur, nothing covering it.
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
                // Solid mode — content sits directly on the opaque bg.
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
            
            {/* 
              Extension view: If the user drags the sheet *upwards* (negative translateY), 
              the bottom of the sheet pulls up from the bottom of the screen. 
              This absolute block covers that empty space securely into the void. 
            */}
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
  // Outer wrapper — carries ONLY the shadow. No overflow:hidden here, because
  // that would clip the shadow we just defined. Width is full so transforms
  // happen over the full sheet area.
  sheetShadow: {
    width: '100%',
  },
  // Inner wrapper — carries the rounded top corners and clips content. No
  // shadow here (the outer handles it). Background is painted by a separate
  // absoluteFill layer so the blur can sit on top of an opaque base.
  sheetClip: {
    overflow: 'hidden',
  },
  // Covers the gap created if the sheet is forcefully dragged upward
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

// ══════════════════════════════════════════════════════════════════════
// SheetBody — shared body layout. Used inside either a GlassCard (glass
// mode) or directly on the opaque base (solid mode). Factored out so the
// two code paths don't duplicate the header/body/footer structure.
// ══════════════════════════════════════════════════════════════════════
function SheetBody({ title, handleClose, scrollable, Content, contentProps, footer, theme, children }) {
  return (
    <>
      {/* Drag handle */}
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: theme.color.borderStrong }]} />
      </View>

      {/* Optional header */}
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

      {/* Body */}
      <Content
        style={styles.body}
        contentContainerStyle={scrollable ? { paddingBottom: theme.spacing.xxl } : undefined}
        {...contentProps}
      >
        {children}
      </Content>

      {/* Optional sticky footer */}
      {footer ? (
        <View style={[styles.footer, { borderTopColor: theme.color.divider }]}>
          {footer}
        </View>
      ) : null}
    </>
  );
}
