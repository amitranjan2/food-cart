import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}'], theme: { extend: {
  colors: {
    ink:'#18231e', lime:'#d5ff3f', cream:'#fffdf5', clay:'#ef6045',
    store: { sky:'var(--store-sky)', ink:'var(--store-ink)', name:'var(--store-ink)', muted:'var(--store-muted)', card:'var(--store-tint)', chip:'var(--store-tint)' },
  },
  fontSize: { '2xs': ['11px', { lineHeight: '1.35' }] },
} }, plugins: [] } satisfies Config;
