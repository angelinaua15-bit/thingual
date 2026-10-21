import { useColorScheme } from 'react-native';
import { useApp } from '../store/useApp';

const light = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F1ED',
  text: '#141414',
  textSecondary: '#6B6B6B',
  textTertiary: '#9C9A94',
  divider: '#E8E6E1',
  accent: '#3B5BDB',
  accentSoft: 'rgba(59,91,219,0.10)',
  onAccent: '#FFFFFF',
  drop: '#FF6B35',
  dropSoft: 'rgba(255,107,53,0.12)',
  success: '#2F9E44',
  successSoft: 'rgba(47,158,68,0.12)',
  error: '#E03131',
  errorSoft: 'rgba(224,49,49,0.10)',
  overlay: 'rgba(14,14,14,0.45)',
  scrim: 'rgba(0,0,0,0.55)',
  /** deep brand surface for hero cards and the main buttons */
  ink: '#0F2E33',
  mapStyle: 'light' as 'light' | 'dark',
};

/** Brand: deep green → deep navy (the logo background). */
export const BRAND = { green: '#0F5240', navy: '#0B2350', deep: '#0C2A33', grad: ['#0E3B32', '#0B2238', '#0A1A33'] as const };

const dark: typeof light = {
  background: '#0B2129',
  surface: '#112E36',
  surfaceAlt: '#17363F',
  text: '#EEF4F1',
  textSecondary: '#9FB5B0',
  textTertiary: '#6D8682',
  divider: '#21414A',
  accent: '#7C9BFF',
  accentSoft: 'rgba(124,155,255,0.16)',
  onAccent: '#0B2129',
  drop: '#FF8A5B',
  dropSoft: 'rgba(255,138,91,0.16)',
  success: '#51CF66',
  successSoft: 'rgba(81,207,102,0.16)',
  error: '#FF6B6B',
  errorSoft: 'rgba(255,107,107,0.14)',
  overlay: 'rgba(3,14,18,0.6)',
  scrim: 'rgba(3,14,18,0.7)',
  ink: '#EEF4F1',
  mapStyle: 'dark',
};

export type Colors = typeof light;

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 };
export const radius = { s: 12, m: 16, l: 20, xl: 28, pill: 999 };

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  title: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  headline: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

export function useTheme() {
  const system = useColorScheme();
  const pref = useApp((s) => s.settings.theme);
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { c: isDark ? dark : light, isDark };
}
export const TAB_BAR_HEIGHT = 84;
