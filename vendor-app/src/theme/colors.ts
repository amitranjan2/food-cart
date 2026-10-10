/**
 * The vendor app's one palette ("slate on sky"). Rules, see DESIGN.md:
 * page behind everything → surface for cards and sheets → tint for fields and rows inside a surface.
 * Use these names, never hex values, in screens.
 */
export const colors = {
  // Surfaces
  page: '#d8ecff',
  surface: '#ffffff',
  tint: '#eaf3fb',
  line: '#d3e1ed',
  scrim: 'rgba(30,42,54,0.45)',
  // Ink
  primary: '#3d5366',
  onPrimary: '#ffffff',
  text: '#2f4254',
  muted: '#637a8d',
  faint: '#8fa3b4',
  link: '#2f6bff',
  // Meaning
  success: '#1a8a4a',
  successBg: '#e1f5e8',
  danger: '#d8424a',
  dangerBg: '#fdecec',
  warning: '#a8670c',
  warningBg: '#fff3d6',
  info: '#2f6bff',
  infoBg: '#e7f1ff',
  orange: '#c8641c',
  orangeBg: '#fff0e2',
  purple: '#7c4ddb',
  purpleBg: '#f3e8ff',
  /** The ★ on special dishes. */
  special: '#f79009',
  // Food marks (Indian veg / non-veg convention)
  veg: '#009b59',
  nonVeg: '#dd3f43',
  egg: '#e0a100',
} as const;

export type ColorName = keyof typeof colors;
