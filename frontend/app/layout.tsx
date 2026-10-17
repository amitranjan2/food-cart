import './globals.css';
import type { Metadata, Viewport } from 'next';
import { THEME_BOOT_SCRIPT } from './lib/theme';

export const metadata: Metadata = { title: 'Supr-Mama', description: 'Order from your neighbourhood food stalls', manifest: '/manifest.webmanifest' };
export const viewport: Viewport = { themeColor: '#b3d8fa' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets the remembered colours on <html> before first paint, so React must not complain about the changed style.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
