/**
 * JOAccess Design Theme
 * =====================
 * Matches the web version's CSS variables exactly.
 * Maroon (#800000) is the primary brand color.
 */

export const colors = {
  // ── Primary brand ──
  primary: '#800000',         // --primary-red
  primaryLight: '#A00000',    // --primary-red-light
  primaryDark: '#600000',     // --primary-red-dark

  // ── Neutrals ──
  white: '#FFFFFF',
  black: '#000000',
  grey: '#F5F4F9',            // --grey (background)
  darkGrey: '#666666',        // --dark-grey
  lightGrey: '#E0E0E0',      // --light-grey
  mediumGrey: '#999999',

  // ── Semantic ──
  success: '#155724',
  successBg: '#D4EDDA',
  warning: '#856404',
  warningBg: '#FFF3CD',
  danger: '#DC3545',
  dangerBg: '#F8D7DA',
  info: '#0C5460',
  infoBg: '#D1ECF1',

  // ── Shadows (for StyleSheet) ──
  shadow: 'rgba(128, 0, 0, 0.1)',
  shadowMd: 'rgba(128, 0, 0, 0.2)',
  shadowLg: 'rgba(128, 0, 0, 0.3)',

  // ── Stars ──
  star: '#FFC107',
  starEmpty: '#DDD',

  // ── Verified / Unverified badge ──
  verifiedBg: '#D4EDDA',
  verifiedText: '#155724',
  unverifiedBg: '#FFF3CD',
  unverifiedText: '#856404',

  // ── Category icon colors ──
  categoryColors: {
    'Restaurants & Cafes': '#E74C3C',
    'Shopping Malls': '#9B59B6',
    Supermarkets: '#3498DB',
    Healthcare: '#E74C3C',
    Educational: '#F39C12',
    'Government Buildings': '#2C3E50',
    'Religious Places': '#1ABC9C',
    Transportation: '#3498DB',
    'Tourist Attractions': '#E67E22',
    'Beauty & Wellness': '#E91E63',
    Parks: '#27AE60',
    Entertainment: '#8E44AD',
    Hotels: '#2980B9',
    'Banks & ATMs': '#34495E',
    'Sports & Fitness': '#D35400',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export default { colors, spacing, borderRadius, fontSizes, fontWeights };
