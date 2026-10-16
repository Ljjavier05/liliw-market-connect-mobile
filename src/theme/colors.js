/**
 * Brand tokens aligned with liliw-market-connect DESIGN.md / index.css.
 * Light + dark palettes share the same keys; dark values follow the
 * website's `html.dark` tokens (navy body, #4B8FEB primary).
 */
export const lightColors = {
  // Brand
  primary: '#0050d8',
  primaryLight: '#E8F5FF',
  primaryDark: '#003EAA',
  primaryMid: '#4B8FEB',
  primarySoft: '#B8D9FF',
  primaryGlow: '#6BA3F2',
  accent: '#f59e0b',

  // Semantic status
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef3c7',
  warningSoft: '#ffedd5',
  warningDeep: '#c2410c',
  warningBorder: '#fb923c',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  dangerSoft: '#fff1f2',
  dangerDeep: '#991b1b',
  dangerBorder: '#fca5a5',
  criticalBg: '#7f1d1d',
  criticalText: '#fecaca',
  orangeSoft: '#fff7ed',
  orangeBorder: '#fed7aa',
  orangeInk: '#9a3412',
  amberBorder: '#fde68a',
  amberInk: '#92400e',
  redWash: '#fff5f5',

  // Ink / slate neutrals (website slate scale)
  ink: '#0f172a',
  inkMuted: '#64748b',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',

  white: '#ffffff',
  black: '#000000',

  // Surfaces & chrome
  surface: '#ffffff',
  pageBg: '#E8F5FF',
  borderBrand: 'rgba(0, 80, 216, 0.12)',
  borderBrandStrong: 'rgba(0, 80, 216, 0.22)',
  focusRing: 'rgba(0, 80, 216, 0.35)',
  shadowBrand: '#0050d8',
};

export const darkColors = {
  // Brand (vibrant electric accent that pops against dark charcoal)
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.12)',
  primaryDark: '#2563EB',
  primaryMid: '#60A5FA',
  primarySoft: 'rgba(59, 130, 246, 0.18)',
  primaryGlow: '#93C5FD',
  accent: '#F59E0B',

  // Semantic status (subtle translucent pills, high readability)
  success: '#34D399',
  successLight: 'rgba(16, 185, 129, 0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(245, 158, 11, 0.14)',
  warningSoft: 'rgba(245, 158, 11, 0.18)',
  warningDeep: '#FDBA74',
  warningBorder: 'rgba(251, 146, 60, 0.35)',
  danger: '#F87171',
  dangerLight: 'rgba(239, 68, 68, 0.14)',
  dangerSoft: 'rgba(239, 68, 68, 0.2)',
  dangerDeep: '#FCA5A5',
  dangerBorder: 'rgba(248, 113, 113, 0.35)',
  criticalBg: '#450A0A',
  criticalText: '#FECACA',
  orangeSoft: 'rgba(249, 115, 22, 0.14)',
  orangeBorder: 'rgba(253, 186, 116, 0.3)',
  orangeInk: '#FDBA74',
  amberBorder: 'rgba(253, 230, 138, 0.3)',
  amberInk: '#FDE68A',
  redWash: 'rgba(239, 68, 68, 0.1)',

  // Neutral inks & dark scales (modern obsidian & charcoal, no saturated navy)
  ink: '#F8FAFC',
  inkMuted: '#94A3B8',
  gray50: '#111318',       // Slightly elevated dark background / input fills
  gray100: '#181B22',      // Nested card background, chip background
  gray200: '#232733',      // Subtle borders & card outlines
  gray300: '#323746',      // Form borders & dividers
  gray400: '#64748B',      // Placeholder text & inactive icons
  gray500: '#94A3B8',      // Secondary text
  gray600: '#CBD5E1',      // Semi-bold labels
  gray700: '#E2E8F0',      // High-emphasis text
  gray800: '#F1F5F9',      // Near-white text
  gray900: '#FFFFFF',      // Pure white text

  white: '#FFFFFF',
  black: '#000000',

  // Surfaces & chrome (Modern deep charcoal & graphite — clean, sleek, eye-friendly)
  surface: '#14171F',      // Cards, tab bar, header bar, modal surfaces
  pageBg: '#0B0D13',       // Main screen canvas (smooth deep obsidian)
  borderBrand: 'rgba(255, 255, 255, 0.08)',
  borderBrandStrong: 'rgba(255, 255, 255, 0.15)',
  focusRing: 'rgba(59, 130, 246, 0.45)',
  shadowBrand: 'rgba(0, 0, 0, 0.65)',
};

// Backward-compatible static export (light). Themed code should use
// useTheme() from context/ThemeContext instead.
export const colors = lightColors;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
