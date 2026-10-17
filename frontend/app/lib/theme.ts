import type { CSSProperties } from 'react';
import type { Vendor, StoreTheme } from './api';

/** The vendor's colour pair as the CSS variables the storefront styles use (globals.css defaults to Sky). */
export function themeStyle(vendor?: Pick<Vendor, 'theme'> | null): CSSProperties | undefined {
  if (!vendor?.theme) return undefined;
  return { '--store-sky': vendor.theme.light, '--store-ink': vendor.theme.dark } as CSSProperties;
}

/** The last store's colours, kept so every other page (home, policies, the first paint of the next page) wears them. */
export const THEME_KEY = 'foodcart.theme';
const HEX = /^#[0-9a-f]{6}$/i;

/** Runs before the page paints (layout.tsx), so there is no flash of the default colours. Keep it in step with applyTheme. */
export const THEME_BOOT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem('${THEME_KEY}')||'null');var h=/^#[0-9a-f]{6}$/i;if(t&&h.test(t.light)&&h.test(t.dark)){var s=document.documentElement.style;s.setProperty('--store-sky',t.light);s.setProperty('--store-ink',t.dark);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t.light);}}catch(e){}`;

/** A store (or order) page calls this once it knows the vendor: remembers the colours and colours the whole page, even the phone's browser bar. */
export function applyTheme(theme?: StoreTheme | null) {
  if (!theme || !HEX.test(theme.light) || !HEX.test(theme.dark)) return;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ light: theme.light, dark: theme.dark }));
  } catch {
    // storage blocked: this page is still coloured by its own inline style
  }
  const root = document.documentElement.style;
  root.setProperty('--store-sky', theme.light);
  root.setProperty('--store-ink', theme.dark);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme.light);
}
