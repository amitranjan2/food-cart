import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}'], theme: { extend: {
  colors: {
    ink:'#18231e', lime:'#d5ff3f', cream:'#fffdf5', clay:'#ef6045',
    store: { sky:'#b3d8fa', ink:'#30404e', name:'#3b4957', muted:'#717c86', card:'#eeeeee', chip:'#e2e4e7' },
  },
  fontSize: { '2xs': ['11px', { lineHeight: '1.35' }] },
} }, plugins: [] } satisfies Config;
