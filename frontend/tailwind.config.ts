import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm near-black surfaces with brushed-metal greys
        bg: {
          DEFAULT: '#0c0a09',
          soft: '#14110e',
          card: '#1a1613',
          hover: '#241f1a',
        },
        line: '#352c25',
        // Orange is the single accent — everything "alive" glows orange
        brand: {
          DEFAULT: '#f97316',
          light: '#fb923c',
          deep: '#c2540a',
          soft: '#2a190d',
        },
        // Status stays inside the black/grey/orange family:
        // bright orange = good, amber = partial, burnt ember = failed/critical
        ok: '#f97316',
        warn: '#e0a44a',
        bad: '#b1471f',
        muted: '#8a7d6e',
      },
      fontFamily: {
        sans: ['Jost', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Skeuomorphic raised panel: top light-line + soft drop + deep cast
        raised:
          'inset 0 1px 0 0 rgba(255,236,214,0.06), 0 1px 2px rgba(0,0,0,0.55), 0 14px 28px -14px rgba(0,0,0,0.85)',
        // Pressed / sunken surface
        inset:
          'inset 0 2px 6px rgba(0,0,0,0.65), inset 0 1px 0 rgba(0,0,0,0.5)',
        // Glossy orange control
        glow:
          'inset 0 1px 0 rgba(255,220,180,0.5), 0 2px 5px rgba(0,0,0,0.5), 0 8px 18px -6px rgba(249,115,22,0.45)',
        // Embossed metal plate (logo)
        plate:
          'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'card-sheen': 'linear-gradient(180deg, #221c17 0%, #15110e 100%)',
        'soft-sheen': 'linear-gradient(180deg, #1b1713 0%, #110d0b 100%)',
        'metal': 'linear-gradient(180deg, #2c2520 0%, #1b1612 100%)',
        'orange-gloss':
          'linear-gradient(180deg, #fb9447 0%, #f97316 52%, #e0620a 100%)',
        'sunken': 'linear-gradient(180deg, #100c09 0%, #1a1511 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
