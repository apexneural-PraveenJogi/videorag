/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Film-room" palette — committed tokens. Cool midnight ground, soft
        // off-white text, a single warm projector-amber accent (the "light").
        ink: {
          900: '#0B0E14', // ground
          800: '#10141D',
          700: '#151A23', // surface / panels
          600: '#1C2230', // raised
          500: '#2A3242', // hairline / timeline track
          400: '#3A4357',
        },
        mist: {
          100: '#E7E9EE', // primary text
          300: '#AEB4C2', // secondary text
          500: '#737B8C', // muted / captions
        },
        amber: {
          // projector light
          400: '#FFD27D',
          500: '#F5C451',
          600: '#E9B23A',
        },
        // brand alias kept so existing app components still resolve.
        brand: {
          50: '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.28em',
      },
      keyframes: {
        'gradient-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.08)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.15' },
        },
      },
      animation: {
        'gradient-drift': 'gradient-drift 18s ease-in-out infinite',
        scan: 'scan 2.4s linear infinite',
        blink: 'blink 1.1s steps(1) infinite',
      },
    },
  },
  plugins: [],
}
