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
  // Brand (website html.dark tokens)
  primary: '#4B8FEB',
  primaryLight: '#0A1E42',
  primaryDark: '#0050d8',
  primaryMid: '#6BA3F2',
  primarySoft: '#0D2A5C',
  primaryGlow: '#6BA3F2',
  accent: '#fbbf24',

  // Semantic status (lightened inks, translucent fills)
  success: '#4ade80',
  successLight: 'rgba(34, 197, 94, 0.16)',
  warning: '#fbbf24',
  warningLight: 'rgba(217, 119, 6, 0.18)',
  warningSoft: 'rgba(194, 65, 12, 0.22)',
  warningDeep: '#fdba74',
  warningBorder: 'rgba(251, 146, 60, 0.45)',
  danger: '#f87171',
  dangerLight: 'rgba(220, 38, 38, 0.2)',
  dangerSoft: 'rgba(153, 27, 27, 0.24)',
  dangerDeep: '#fca5a5',
  dangerBorder: 'rgba(252, 165, 165, 0.4)',
  criticalBg: '#7f1d1d',
  criticalText: '#fecaca',
  orangeSoft: 'rgba(249, 115, 22, 0.14)',
  orangeBorder: 'rgba(253, 186, 116, 0.4)',
  orangeInk: '#fdba74',
  amberBorder: 'rgba(253, 230, 138, 0.4)',
  amberInk: '#fde68a',
  redWash: 'rgba(239, 68, 68, 0.12)',

  // Ink / neutrals flipped for navy surfaces
  ink: '#f1f5f9',
  inkMuted: '#94a3b8',
  gray50: '#0F2347',
  gray100: '#132A52',
  gray200: '#1E3A66',
  gray300: '#2C4A7A',
  gray400: '#8FA3C4',
  gray500: '#94a3b8',
  gray600: '#B0BFD6',
  gray700: '#CBD5E1',
  gray800: '#E2E8F0',
  gray900: '#F1F5F9',

  white: '#ffffff',
  black: '#000000',

  // Surfaces & chrome (navy body like website dark)
  surface: '#0A1E42',
  pageBg: '#010B1F',
  borderBrand: 'rgba(75, 143, 235, 0.15)',
  borderBrandStrong: 'rgba(75, 143, 235, 0.28)',
  focusRing: 'rgba(75, 143, 235, 0.35)',
  shadowBrand: '#000000',
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
