/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Тёмная тема включается атрибутом <html data-theme="dark"> (ставит useTelegram).
  darkMode: ['selector', "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // Фирменный янтарно-золотой акцент (оригинальный, в духе премиального fintech)
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f5b301',
          600: '#d99700',
          700: '#a97400',
          800: '#7c5500',
          900: '#5c3f00',
        },
        // Семантические токены, завязанные на Telegram theme params (см. index.css)
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        hairline: 'var(--hairline)',
      },
      borderRadius: {
        xl2: '1.375rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -12px rgba(16,24,40,0.12)',
        float: '0 10px 30px -8px rgba(245,179,1,0.35)',
      },
      fontFamily: {
        sans: ['-apple-system', 'system-ui', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ring-fill': {
          '0%': { strokeDashoffset: 'var(--ring-start)' },
          '100%': { strokeDashoffset: 'var(--ring-end)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.25s ease both',
      },
    },
  },
  plugins: [],
}
