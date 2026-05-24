import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, runOnJS,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedPressable from './AnimatedPressable';
import ThemeCard from './ThemeCard';
import { useAccessibility } from '../context/AccessibilityContext';
import { useLanguage } from '../context/LanguageContext';

function DropdownOption({ index, opt, selected, onPress, theme, scaleFn, textAlign, prefersReducedMotion, isLast }) {
  const translateY = useSharedValue(prefersReducedMotion ? 0 : 8);
  const opacity = useSharedValue(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const delay = Math.min(index * 40, 160);
    translateY.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 280 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 180 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <AnimatedPressable
        onPress={() => onPress(opt.value)}
        accessibilityLabel={opt.label}
        style={[
          styles.optionRow,
          {
            borderBottomColor: theme.color.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            backgroundColor: selected ? theme.color.brandMuted : 'transparent',
          },
        ]}
      >
        <Text
          style={{
            color: selected ? theme.color.textBrand : theme.color.text,
            fontSize: scaleFn(theme.fontSizes.md),
            fontFamily: theme.fontFamily,
            textAlign,
            fontWeight: selected ? 'bold' : 'normal',
          }}
        >
          {opt.label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function DropdownPicker({
  icon,
  placeholder,
  value,
  onValueChange,
  options = [],
}) {
  const { theme, scale, prefersReducedMotion } = useAccessibility();
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // force LTR so arabic doesn't flip the option list
  const textAlign = 'left';
  const selectedOption = options.find((o) => o.value === value);

  const panelScale = useSharedValue(0.96);
  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(-6);
  const chevronRot = useSharedValue(0);

  useEffect(() => {
    if (!modalVisible) return;
    panelScale.value = 0.96;
    panelOpacity.value = 0;
    panelTranslateY.value = -6;
    if (prefersReducedMotion) {
      panelScale.value = 1;
      panelOpacity.value = 1;
      panelTranslateY.value = 0;
    } else {
      panelScale.value = withSpring(1, theme.motion.spring.snappy);
      panelOpacity.value = withTiming(1, { duration: 150 });
      panelTranslateY.value = withSpring(0, theme.motion.spring.snappy);
    }
  }, [modalVisible]);

  const openDropdown = () => {
    setOpen(true);
    setModalVisible(true);
    chevronRot.value = prefersReducedMotion ? 1 : withSpring(1, theme.motion.spring.snappy);
  };

  const closeDropdown = () => {
    setOpen(false);
    chevronRot.value = prefersReducedMotion ? 0 : withSpring(0, theme.motion.spring.snappy);
    if (prefersReducedMotion) {
      setModalVisible(false);
      return;
    }
    panelScale.value = withTiming(0.96, { duration: 140 });
    panelTranslateY.value = withTiming(-6, { duration: 140 });
    panelOpacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) runOnJS(setModalVisible)(false);
    });
  };

  const handleOptionSelect = (val) => {
    onValueChange(val);
    closeDropdown();
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: panelScale.value },
      { translateY: panelTranslateY.value },
    ],
    opacity: panelOpacity.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value * 180}deg` }],
  }));

  return (
    <View style={styles.root}>
      <AnimatedPressable onPress={openDropdown}>
        <ThemeCard
          style={{
            backgroundColor: theme.color.surface,
            borderRadius: theme.radii.md,
            borderColor: open ? theme.color.brand : theme.color.border,
            borderWidth: 1.5,
          }}
        >
          {/* inner row prevents GlassCard from stacking children vertically */}
          <View style={styles.innerRow}>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={open ? theme.color.brand : theme.color.textMuted}
                style={[styles.fieldIcon, isRTL ? { marginLeft: 10, marginRight: 0 } : null]}
              />
            )}
            <Text
              style={[
                styles.input,
                {
                  color: selectedOption ? theme.color.text : theme.color.textMuted,
                  fontSize: scale(theme.fontSizes.md),
                  fontFamily: theme.fontFamily,
                  textAlign,
                },
              ]}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={18} color={theme.color.textMuted} />
            </Animated.View>
          </View>
        </ThemeCard>
      </AnimatedPressable>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeDropdown}>
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View style={[styles.modalDialogContainer, panelStyle]}>
                <ThemeCard
                  style={[
                    styles.modalDialog,
                    {
                      backgroundColor: theme.color.surface,
                      borderColor: theme.color.border,
                      borderRadius: theme.radii.lg,
                      ...theme.elevation.xl,
                    },
                  ]}
                >
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {options.map((opt, i) => (
                      <DropdownOption
                        key={opt.value}
                        index={i}
                        opt={opt}
                        selected={value === opt.value}
                        onPress={handleOptionSelect}
                        theme={theme}
                        scaleFn={scale}
                        textAlign={textAlign}
                        prefersReducedMotion={prefersReducedMotion}
                        isLast={i === options.length - 1}
                      />
                    ))}
                  </ScrollView>
                </ThemeCard>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 14, zIndex: 100 },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 12,
    minHeight: Platform.OS === 'ios' ? 44 : 48,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialogContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalDialog: {
    width: '100%',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  optionRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
