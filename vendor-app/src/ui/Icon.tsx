import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Line icons in one style (24-unit grid, 2-unit round strokes; shapes from Lucide, ISC licence). Use these instead of
 * emoji or text arrows, which every phone draws differently.
 */
const ICONS = {
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  back: ['M12 19l-7-7 7-7', 'M19 12H5'],
  chevronLeft: ['M15 18l-6-6 6-6'],
  chevronRight: ['M9 18l6-6-6-6'],
  chevronDown: ['M6 9l6 6 6-6'],
  dishes: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'],
  orders: ['M5 2v20l2-1.5L9 22l2-1.5L13 22l2-1.5L17 22l2-1.5V2l-2 1.5L15 2l-2 1.5L11 2 9 3.5 7 2Z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  settings: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  ],
  qr: ['M21 16h-3a2 2 0 0 0-2 2v3', 'M21 21v.01', 'M12 7v3a2 2 0 0 1-2 2H7', 'M3 12h.01', 'M12 3h.01', 'M12 16v.01', 'M16 12h1', 'M21 12v.01', 'M12 21v-1'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  pin: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'],
  sort: ['M21 16l-4 4-4-4', 'M17 20V4', 'M3 8l4-4 4 4', 'M7 4v16'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  up: ['M5 12l7-7 7 7', 'M12 19V5'],
  down: ['M12 5v14', 'M19 12l-7 7-7-7'],
  plus: ['M5 12h14', 'M12 5v14'],
  check: ['M20 6 9 17l-5-5'],
  star: [
    'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
  ],
  search: ['m21 21-4.3-4.3'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  image: ['M16 5h6', 'M19 2v6', 'M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5', 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'],
  bell: ['M10.268 21a2 2 0 0 0 3.464 0', 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'],
} as const;

/** Extra shapes that aren't paths. */
const EXTRAS: Partial<Record<IconName, 'gear' | 'qr' | 'pin' | 'search' | 'image'>> = {
  settings: 'gear',
  qr: 'qr',
  pin: 'pin',
  search: 'search',
  image: 'image',
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = colors.primary, filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  const extra = EXTRAS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map(d => (
        <Path key={d} d={d} fill={filled ? color : 'none'} />
      ))}
      {extra === 'gear' ? <Circle cx={12} cy={12} r={3} /> : null}
      {extra === 'pin' ? <Circle cx={12} cy={10} r={3} /> : null}
      {extra === 'search' ? <Circle cx={11} cy={11} r={8} /> : null}
      {extra === 'image' ? <Circle cx={9} cy={9} r={2} /> : null}
      {extra === 'qr' ? (
        <>
          <Rect x={3} y={3} width={5} height={5} rx={1} />
          <Rect x={16} y={3} width={5} height={5} rx={1} />
          <Rect x={3} y={16} width={5} height={5} rx={1} />
        </>
      ) : null}
    </Svg>
  );
}
