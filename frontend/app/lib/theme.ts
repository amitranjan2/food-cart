import type { CSSProperties } from 'react';
import type { Vendor } from './api';

/** The vendor's colour pair as the CSS variables the storefront styles use (globals.css defaults to Sky). */
export function themeStyle(vendor?: Pick<Vendor, 'theme'> | null): CSSProperties | undefined {
  if (!vendor?.theme) return undefined;
  return { '--store-sky': vendor.theme.light, '--store-ink': vendor.theme.dark } as CSSProperties;
}
