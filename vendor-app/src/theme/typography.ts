import type { TextStyle } from 'react-native';
import { colors } from './colors';

/** The type scale. Nothing smaller than 11 px; labels are sentence case except `overline`. */
export const typography = {
  display: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: colors.text },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, fontWeight: '500', color: colors.text },
  bodyStrong: { fontSize: 14, fontWeight: '700', color: colors.text },
  small: { fontSize: 13, fontWeight: '500', lineHeight: 18, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '600', color: colors.muted },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.muted },
} satisfies Record<string, TextStyle>;
