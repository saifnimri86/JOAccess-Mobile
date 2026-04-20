/**
 * JOAccess Design System v2
 * =========================
 * A complete, token-based design system built around a refined maroon
 * brand identity with subtle glassmorphism and smooth spring motion.
 *
 * Everything a screen needs comes from here. No one-off hex codes in screens.
 *
 * Structure:
 *   - palette       : raw color values (never import these directly in screens)
 *   - colors        : semantic color tokens (light mode)
 *   - colorsDark    : semantic color tokens (high-contrast / dark mode)
 *   - spacing       : 4pt-grid spacing scale
 *   - radii         : border radius scale
 *   - fontSizes     : type scale
 *   - fontWeights   : weight scale
 *   - elevation     : platform-aware shadow presets (cards, modals, FABs)
 *   - glass         : glassmorphism preset layer configs
 *   - motion        : animation timing and spring configs
 *   - categoryColor : category → accent color lookup
 *   - featureIcon   : accessibility feature → Ionicon name lookup
 *
 * Helper: buildTheme(isHighContrast) returns a fully-resolved theme object
 *   that screens can consume via a single import. This is what
 *   AccessibilityContext exposes as `theme`.
 */

import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Raw palette — internal only. Don't reference `palette.*` in screens.
// ─────────────────────────────────────────────────────────────
const palette = {
  // Maroon family — the brand
  maroon900: '#4A0000',
  maroon800: '#600000',
  maroon700: '#800000', // THE brand color. Never change this literal.
  maroon600: '#9A1C1C',
  maroon500: '#B33838',
  maroon100: '#F4E3E3',
  maroon50:  '#FBF3F3',

  // Warm ivory (a quieter off-white than pure #FFFFFF — reduces eye strain)
  ivory:     '#FAF7F5',
  ivoryDim:  '#F2EDE9',
  bone:      '#EDE6DF',

  // Neutrals
  ink900:    '#1A1512',  // warm near-black (has a whisper of maroon in it)
  ink700:    '#3D3633',
  ink500:    '#6B6360',
  ink300:    '#A8A19D',
  ink100:    '#D8D2CE',

  // Pure
  white:     '#FFFFFF',
  black:     '#000000',

  // Dark mode surfaces (for high-contrast)
  dark900:   '#0A0707',
  dark800:   '#141010',
  dark700:   '#1F1A1A',
  dark600:   '#2B2424',

  // Semantic
  green700:  '#1E6B3A',
  green100:  '#DFF3E4',
  amber700:  '#92651A',
  amber100:  '#FBF0D4',
  red700:    '#B0282D',
  red100:    '#F7D9DB',
  blue700:   '#1F5FA8',
  blue100:   '#D9E6F6',

  // Accent (used sparingly for stars, highlights)
  gold:      '#E0B24A',
  goldDim:   '#C79635',
};

// ─────────────────────────────────────────────────────────────
// Semantic tokens — these ARE what screens use.
// `colors.light` and `colors.dark` are mirror-structured so any
// style written with `theme.color.xxx` works in both modes.
// ─────────────────────────────────────────────────────────────
const colorsLight = {
  // Brand
  brand:           palette.maroon700,
  brandHover:      palette.maroon800,
  brandMuted:      palette.maroon100,
  brandOnBrand:    palette.white,       // text/icon color when on a brand-filled surface

  // Surfaces (background layers, lowest → highest)
  bg:              palette.ivory,        // app background
  bgSunken:        palette.ivoryDim,     // recessed areas (e.g., under a card stack)
  surface:         palette.white,        // standard card surface
  surfaceElevated: palette.white,        // modals, popovers
  surfaceOverlay:  'rgba(26, 21, 18, 0.48)',  // dimmed backdrop behind modals
  // In light mode this equals surface — the lifted-floating distinction only
  // matters in HC where the app bg is pitch black. Kept present so callers
  // don't need Platform/mode branches.
  floatingSurface: palette.white,

  // Glass (background colors used WITH the BlurView layer)
  glassBg:         'rgba(255, 255, 255, 0.72)',
  glassBgStrong:   'rgba(255, 255, 255, 0.88)',
  glassBorder:     'rgba(128, 0, 0, 0.08)',

  // Text
  text:            palette.ink900,
  textMuted:       palette.ink500,
  textDim:         palette.ink300,
  textOnBrand:     palette.white,
  textBrand:       palette.maroon700,   // use instead of `brand` when tinting text

  // Borders & dividers
  border:          palette.ink100,
  borderStrong:    palette.ink300,
  divider:         'rgba(26, 21, 18, 0.06)',

  // Interactive
  pressedTint:     'rgba(128, 0, 0, 0.08)',   // overlay color on press
  focusRing:       palette.maroon500,

  // Feedback
  success:         palette.green700,
  successBg:       palette.green100,
  warning:         palette.amber700,
  warningBg:       palette.amber100,
  danger:          palette.red700,
  dangerBg:        palette.red100,
  info:            palette.blue700,
  infoBg:          palette.blue100,

  // Stars
  star:            palette.gold,
  starDim:         palette.goldDim,
  starEmpty:       palette.ink100,

  // Status badges
  verifiedBg:      palette.green100,
  verifiedText:    palette.green700,
  unverifiedBg:    palette.amber100,
  unverifiedText:  palette.amber700,
};

const colorsDark = {
  // Brand
  brand:           palette.maroon500,        // lighter in dark mode for legibility
  brandHover:      palette.maroon600,
  brandMuted:      'rgba(179, 56, 56, 0.18)',
  brandOnBrand:    palette.white,

  // Surfaces
  bg:              palette.dark900,
  bgSunken:        palette.black,
  surface:         palette.dark800,
  surfaceElevated: palette.dark700,
  surfaceOverlay:  'rgba(0, 0, 0, 0.72)',
  // Lifted near-black used by floating UI (tab bar, chat input). Sits between
  // dark900 and dark600 — visibly distinguishable from the pitch-black app
  // bg without looking grey. Only consumed by specific floating surfaces, not
  // by ThemeCard in general.
  floatingSurface: '#332A2A',

  // Glass
  glassBg:         'rgba(20, 16, 16, 0.72)',
  glassBgStrong:   'rgba(20, 16, 16, 0.88)',
  // Neutral grey, parallel to light mode's subtle warm-ink border.
  // No red strokes in HC glass mode — they were fighting with the brand pills.
  glassBorder:     'rgba(245, 239, 236, 0.14)',

  // Text
  text:            '#F5EFEC',
  textMuted:       '#B8AFAB',
  textDim:         '#7D7571',
  textOnBrand:     palette.white,
  textBrand:       palette.maroon500,

  // Borders
  border:          palette.dark600,
  borderStrong:    '#3A3030',
  divider:         'rgba(245, 239, 236, 0.08)',

  // Interactive
  pressedTint:     'rgba(179, 56, 56, 0.14)',
  focusRing:       palette.maroon500,

  // Feedback — lighter/more saturated in dark mode
  success:         '#4FB06E',
  successBg:       'rgba(79, 176, 110, 0.16)',
  warning:         '#E0B24A',
  warningBg:       'rgba(224, 178, 74, 0.16)',
  danger:          '#E8636B',
  dangerBg:        'rgba(232, 99, 107, 0.16)',
  info:            '#5FA0E8',
  infoBg:          'rgba(95, 160, 232, 0.16)',

  // Stars
  star:            palette.gold,
  starDim:         palette.goldDim,
  starEmpty:       palette.dark600,

  // Badges
  verifiedBg:      'rgba(79, 176, 110, 0.16)',
  verifiedText:    '#4FB06E',
  unverifiedBg:    'rgba(224, 178, 74, 0.16)',
  unverifiedText:  '#E0B24A',
};

// ─────────────────────────────────────────────────────────────
// Backwards-compat legacy export
// Other screens still import `{ colors }` from this file. Keep it.
// Once the migration is complete we can drop this block.
// ─────────────────────────────────────────────────────────────
export const colors = {
  primary:       palette.maroon700,
  primaryLight:  palette.maroon500,
  primaryDark:   palette.maroon800,
  white:         palette.white,
  black:         palette.ink900,
  grey:          palette.ivoryDim,
  darkGrey:      palette.ink500,
  lightGrey:     palette.ink100,
  mediumGrey:    palette.ink300,
  success:       palette.green700,
  successBg:     palette.green100,
  warning:       palette.amber700,
  warningBg:     palette.amber100,
  danger:        palette.red700,
  dangerBg:      palette.red100,
  info:          palette.blue700,
  infoBg:        palette.blue100,
  shadow:        'rgba(128, 0, 0, 0.10)',
  shadowMd:      'rgba(128, 0, 0, 0.18)',
  shadowLg:      'rgba(128, 0, 0, 0.28)',
  star:          palette.gold,
  starEmpty:     palette.ink100,
  verifiedBg:    palette.green100,
  verifiedText:  palette.green700,
  unverifiedBg:  palette.amber100,
  unverifiedText:palette.amber700,
  categoryColors: {
    'Restaurants & Cafes': '#C85250',
    'Shopping Malls':      '#8C5AA8',
    'Supermarkets':        '#3E8BC9',
    'Healthcare':          '#D9484F',
    'Educational':         '#D9902C',
    'Government Buildings':'#364B5E',
    'Religious Places':    '#17A899',
    'Transportation':      '#2F7EBF',
    'Tourist Attractions': '#D97531',
    'Beauty & Wellness':   '#CC458D',
    'Parks':               '#2A9D5F',
    'Entertainment':       '#7B4098',
    'Hotels':              '#2370A8',
    'Banks & ATMs':        '#3C4E64',
    'Sports & Fitness':    '#C25917',
  },
};

// ─────────────────────────────────────────────────────────────
// Spacing — 4pt grid. Use these, never raw numbers in styles.
// ─────────────────────────────────────────────────────────────
export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

// ─────────────────────────────────────────────────────────────
// Border radius
// ─────────────────────────────────────────────────────────────
export const radii = {
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   28,
  pill:  999,
};

// Legacy alias, other screens import `borderRadius`
export const borderRadius = radii;

// ─────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────
export const fontSizes = {
  xs:    11,
  sm:    13,
  md:    15,
  lg:    17,
  xl:    20,
  xxl:   24,
  xxxl:  32,
  hero:  40,
};

export const fontWeights = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

// ─────────────────────────────────────────────────────────────
// Elevation presets (shadows). Use these instead of inline shadowColor etc.
// Each level is a style object you can spread into a View style.
//
// Example:
//   <View style={[styles.card, elevation.md]} />
// ─────────────────────────────────────────────────────────────
export const elevation = {
  // No shadow (flat)
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Subtle (search bar, chips)
  sm: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  // Standard cards
  md: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  // Floating action buttons, raised elements
  lg: {
    shadowColor: palette.maroon800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  // Modals, bottom sheets
  xl: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ─────────────────────────────────────────────────────────────
// Glass presets — paired with a <BlurView> layer underneath
// ─────────────────────────────────────────────────────────────
export const glass = {
  // Light translucent surface over any background
  light: {
    blurType: 'light',
    blurAmount: 24,
    reducedTransparencyFallbackColor: colorsLight.surface,
  },
  dark: {
    blurType: 'dark',
    blurAmount: 28,
    reducedTransparencyFallbackColor: colorsDark.surface,
  },
  // Very heavy blur (e.g., behind bottom sheet, almost opaque)
  heavy: {
    blurType: 'xlight',
    blurAmount: 40,
    reducedTransparencyFallbackColor: palette.ivory,
  },
};

// ─────────────────────────────────────────────────────────────
// Motion tokens
// Durations are in ms. Springs follow react-native-reanimated's withSpring() API.
//
// IMPORTANT: When `reducedMotion` is on, screens should either:
//   - use `motion.instant` (0ms), or
//   - skip the animation entirely and apply the final value directly.
// ─────────────────────────────────────────────────────────────
export const motion = {
  // Durations
  instant:   0,
  fast:      150,
  normal:    240,
  slow:      380,
  slower:    560,

  // Spring configs (for withSpring)
  spring: {
    // Gentle, most UI movements
    gentle:   { damping: 18, stiffness: 140, mass: 1 },
    // Snappier, for state changes like filter toggles
    snappy:   { damping: 15, stiffness: 220, mass: 1 },
    // Bouncy, for delightful reveals (success states)
    bouncy:   { damping: 10, stiffness: 180, mass: 1 },
    // Firm, for modals snapping into place
    firm:     { damping: 22, stiffness: 260, mass: 1 },
  },

  // Stagger for list reveals (index * staggerStep ms)
  staggerStep: 40,
};

// ─────────────────────────────────────────────────────────────
// Category → color lookup (refined palette, not gaudy)
// ─────────────────────────────────────────────────────────────
export const categoryColor = {
  'Restaurants & Cafes': '#C85250',
  'Shopping Malls':      '#8C5AA8',
  'Supermarkets':        '#3E8BC9',
  'Healthcare':          '#D9484F',
  'Educational':         '#D9902C',
  'Government Buildings':'#364B5E',
  'Religious Places':    '#17A899',
  'Transportation':      '#2F7EBF',
  'Tourist Attractions': '#D97531',
  'Beauty & Wellness':   '#CC458D',
  'Parks':               '#2A9D5F',
  'Entertainment':       '#7B4098',
  'Hotels':              '#2370A8',
  'Banks & ATMs':        '#3C4E64',
  'Sports & Fitness':    '#C25917',
};

// ─────────────────────────────────────────────────────────────
// Category → Ionicon name
// ─────────────────────────────────────────────────────────────
export const categoryIcon = {
  'Restaurants & Cafes':  'restaurant',
  'Shopping Malls':       'bag-handle',
  'Supermarkets':         'cart',
  'Healthcare':           'medkit',
  'Educational':          'school',
  'Government Buildings': 'business',
  'Religious Places':     'flower',
  'Transportation':       'bus',
  'Tourist Attractions':  'camera',
  'Beauty & Wellness':    'sparkles',
  'Parks':                'leaf',
  'Entertainment':        'film',
  'Hotels':               'bed',
  'Banks & ATMs':         'card',
  'Sports & Fitness':     'barbell',
};

// ─────────────────────────────────────────────────────────────
// Accessibility feature → Ionicon name
// ─────────────────────────────────────────────────────────────
export const featureIcon = {
  wheelchair_ramp:      'accessibility',
  accessible_restroom:  'male-female',
  braille_signage:      'finger-print',
  accessible_parking:   'car',
  elevator:             'swap-vertical',
  audio_assistance:     'volume-high',
  wide_doorways:        'resize',
  automatic_doors:      'enter',
};

// ─────────────────────────────────────────────────────────────
// buildTheme() — the function AccessibilityContext calls to produce
// a single `theme` object per render. Screens consume `theme.color`,
// `theme.spacing`, `theme.radii` etc. This way one hook change →
// entire app re-themes instantly.
// ─────────────────────────────────────────────────────────────
function applyColorBlindness(colorStr, mode) {
  if (!colorStr || mode === 'none') return colorStr;
  
  let r, g, b, a = 1;
  let isRgba = false;

  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0]+hex[0], 16);
      g = parseInt(hex[1]+hex[1], 16);
      b = parseInt(hex[2]+hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      if (hex.length === 8) {
        a = parseInt(hex.substring(6, 8), 16) / 255;
        isRgba = true;
      }
    } else {
      return colorStr;
    }
  } else if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/(\d+(\.\d+)?)/g);
    if (!parts || parts.length < 3) return colorStr;
    r = parseFloat(parts[0]);
    g = parseFloat(parts[1]);
    b = parseFloat(parts[2]);
    if (parts.length > 3) {
       a = parseFloat(parts[3]);
       isRgba = true;
    }
  } else {
    return colorStr;
  }

  let newR = r, newG = g, newB = b;
  if (mode === 'protanopia') {
    newR = 0.567 * r + 0.433 * g + 0 * b;
    newG = 0.558 * r + 0.442 * g + 0 * b;
    newB = 0 * r + 0.242 * g + 0.758 * b;
  } else if (mode === 'deuteranopia') {
    newR = 0.625 * r + 0.375 * g + 0 * b;
    newG = 0.7 * r + 0.3 * g + 0 * b;
    newB = 0 * r + 0.3 * g + 0.7 * b;
  } else if (mode === 'tritanopia') {
    newR = 0.95 * r + 0.05 * g + 0 * b;
    newG = 0 * r + 0.433 * g + 0.567 * b;
    newB = 0 * r + 0.475 * g + 0.525 * b;
  } else if (mode === 'achromatopsia') {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    newR = lum;
    newG = lum;
    newB = lum;
  }

  newR = Math.min(255, Math.max(0, Math.round(newR)));
  newG = Math.min(255, Math.max(0, Math.round(newG)));
  newB = Math.min(255, Math.max(0, Math.round(newB)));

  if (isRgba || a < 1) {
    return `rgba(${newR}, ${newG}, ${newB}, ${a})`;
  } else {
    const toHex = (c) => {
      const h = c.toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`.toUpperCase();
  }
}

export function buildTheme(isHighContrast = false, dyslexiaFont = false, colorBlindMode = 'none', glassUI = false) {
  const baseColor = isHighContrast ? colorsDark : colorsLight;
  
  // High contrast residue fix part 1: Deep copy to prevent mutations from sticking
  const color = JSON.parse(JSON.stringify(baseColor));
  const mappedCategoryColor = JSON.parse(JSON.stringify(categoryColor));
  const dynamicElevation = JSON.parse(JSON.stringify(elevation));

  if (isHighContrast) {
    Object.keys(dynamicElevation).forEach(key => {
       if (dynamicElevation[key]) {
         dynamicElevation[key].shadowColor = '#000000';
       }
    });
  }

  // If a colorBlindMode is selected, run mathematically precise accessible matrix filters over ALL of the app's colors instantly
  if (colorBlindMode !== 'none') {
    Object.keys(color).forEach(key => {
      if (typeof color[key] === 'string') {
        color[key] = applyColorBlindness(color[key], colorBlindMode);
      }
    });
    Object.keys(mappedCategoryColor).forEach(key => {
      if (typeof mappedCategoryColor[key] === 'string') {
        mappedCategoryColor[key] = applyColorBlindness(mappedCategoryColor[key], colorBlindMode);
      }
    });
    Object.keys(dynamicElevation).forEach(key => {
      if (dynamicElevation[key] && dynamicElevation[key].shadowColor) {
        dynamicElevation[key].shadowColor = applyColorBlindness(dynamicElevation[key].shadowColor, colorBlindMode);
      }
    });
  }

  const defaultFont = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  return {
    mode:         isHighContrast ? 'dark' : 'light',
    color,
    spacing,
    radii,
    elevation: dynamicElevation,
    glass:        isHighContrast ? glass.dark : glass.light,
    motion,
    fontSizes,
    fontWeights,
    fontFamily:   dyslexiaFont ? 'monospace' : defaultFont,
    categoryColor: mappedCategoryColor,
    categoryIcon,
    featureIcon,
    glassUI,
  };
}

export default {
  colors,
  spacing,
  radii,
  borderRadius,
  fontSizes,
  fontWeights,
  elevation,
  glass,
  motion,
  categoryColor,
  categoryIcon,
  featureIcon,
  buildTheme,
};
