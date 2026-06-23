/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Bento / 3D-SaaS palette — tokens remapped by ROLE so existing usages
        // re-theme automatically. Depth comes from card-bg contrast on the
        // steel page ground, never from shadows or borders.
        //   ink-*   = grounds & card surfaces
        //   mist-*  = text on light
        //   amber-* = the accent (now BLUE)
        //   night-* = dark cards (#111)
        ink: {
          900: '#D6DDE8', // page background (steel blue-gray)
          800: '#FFFFFF', // white card
          700: '#E8ECF2', // mid card
          600: 'rgba(0,0,0,0.08)', // border color (spec)
          500: 'rgba(0,0,0,0.08)', // hairline
          400: '#B8C2D0', // stronger muted edge
        },
        mist: {
          100: '#111111', // text primary
          300: '#555555', // text secondary
          500: '#888888', // text muted
        },
        amber: {
          400: '#60A5FA', // light accent
          500: '#3B82F6', // accent (spec)
          600: '#2563EB', // accent hover / active
        },
        brand: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        night: {
          900: '#111111', // dark card (spec)
          950: '#0A0A0A',
          line: 'rgba(255,255,255,0.10)', // hairline on dark
        },
        fog: '#A1A1AA', // muted text on dark cards
        accent: '#3B82F6',
        steel: '#D6DDE8',
      },
      fontFamily: {
        // Space Grotesk everywhere, Inter fallback (spec global rule).
        sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Big, tight, heavy hero scale.
        'display-2xl': ['clamp(2.75rem, 6vw, 4rem)', { lineHeight: '1.05', fontWeight: '700' }], // hero H1
        'display-xl': ['2rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      letterSpacing: {
        eyebrow: '0.1em', // section label (spec)
      },
      borderRadius: {
        card: '20px', // cards (spec)
        pill: '50px', // pill buttons (spec)
        badge: '8px', // small badges/tags (spec)
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'spin-slow': 'spin 22s linear infinite',
      },
    },
  },
  plugins: [],
}
