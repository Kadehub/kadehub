/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontWeight: {
        normal:    '400',
        medium:    '500',
        semibold:  '600', // brand default
        bold:      '700',
        extrabold: '800',
      },
      colors: {
        navy:  { DEFAULT: '#0F172A', mid: '#1E293B', light: '#334155' },
        teal:  { DEFAULT: '#00796B', dark: '#00695C', light: '#E0F2F1', mid: '#26A69A' },
        amber: { DEFAULT: '#FFB703', dark: '#B45309', light: '#FFF8E1' },
        coral: { DEFAULT: '#C92A2A', light: '#FFF0F0' },
        ink: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          // 400/500 are text greys: both keep >= 4.5:1 contrast on white, ink-50 and ink-100 (WCAG AA)
          400: '#5E6E82',
          500: '#56657A',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        teal:  '0 2px 8px rgb(0 150 136 / 0.3)',
        amber: '0 2px 8px rgb(255 183 3 / 0.35)',
        modal: '0 20px 60px -10px rgb(0 0 0 / 0.2)',
        btn:   '0 1px 2px 0 rgb(0 0 0 / 0.08)',
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
