/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Cutting Room" palette — committed tokens. Deep blue-graphite ground
        // (the dark editing suite), soft off-white text, a single warm
        // projector-amber accent (the "light"). Boldness is spent on motion +
        // type, so amber is the only vivid hue; everything else is structure.
        ink: {
          900: '#0A0C12', // ground (deep blue-graphite)
          800: '#12161F', // surface
          700: '#161B26', // panels
          600: '#1C2230', // raised
          500: '#2A3242', // hairline / timeline track
          400: '#3A4357',
        },
        mist: {
          100: '#E8EAF0', // primary text
          300: '#AEB4C2', // secondary text
          500: '#8A93A6', // muted / captions
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
        // Archivo (heavy, wide, technical-editorial) carries the personality;
        // Inter stays the neutral body workhorse; IBM Plex Mono is the
        // timecode/data voice — the heartbeat of the product.
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Fluid display scale — the type IS the design here.
        'display-2xl': ['clamp(3rem, 9vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.03em' }],
        'display-xl': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '0.95', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
      },
      letterSpacing: {
        eyebrow: '0.32em',
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
        // filmstrip marquee — "questions you can ask" scrolling like a reel
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'gradient-drift': 'gradient-drift 18s ease-in-out infinite',
        scan: 'scan 2.4s linear infinite',
        blink: 'blink 1.1s steps(1) infinite',
        marquee: 'marquee 38s linear infinite',
      },
    },
  },
  plugins: [],
}
