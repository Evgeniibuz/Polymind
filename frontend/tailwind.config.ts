import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Polymarket blue family — primary brand
        poly: {
          DEFAULT: '#2D9CDB',     // Polymarket sky blue (от лого)
          deep: '#1B7CB8',
          dark: '#0F5C8E',
          light: '#5BB4E0',
          glow: 'rgba(45, 156, 219, 0.18)',
          mist: 'rgba(45, 156, 219, 0.06)',
        },
        // Editorial dark
        ink: {
          DEFAULT: '#0A0E1A',
          soft: '#1A1F2E',
          mute: '#2A2F3B',
        },
        // Neutrals — refined scale
        bone: '#FAFAF7',          // off-white paper
        chalk: '#F4F4EF',
        line: '#E5E5DF',
        // Semantic
        positive: '#00A86B',
        negative: '#E14B4B',
        amber: '#D97706',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-instrument)', 'ui-serif', 'Georgia'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['clamp(3.5rem, 9vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
        'hero': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '0.96', letterSpacing: '-0.035em' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'marquee': 'marquee 60s linear infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'tick': 'tick 1s ease-out both',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        'marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'shimmer': { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'tick': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      boxShadow: {
        'card': '0 1px 0 rgba(255,255,255,1) inset, 0 0 0 1px rgba(10,14,26,0.04), 0 24px 60px -20px rgba(10,14,26,0.08), 0 4px 12px -2px rgba(10,14,26,0.04)',
        'poly-btn': '0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 0 0 1px rgba(45,156,219,0.9), 0 12px 32px -8px rgba(45,156,219,0.5), 0 4px 12px -2px rgba(45,156,219,0.3)',
        'poly-btn-hover': '0 1px 0 rgba(255,255,255,0.3) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 0 0 1px rgba(45,156,219,0.95), 0 18px 40px -8px rgba(45,156,219,0.6), 0 6px 16px -2px rgba(45,156,219,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
