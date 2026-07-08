/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Тёмная тема включается атрибутом <html data-theme="dark"> (ставит useTelegram).
  darkMode: ['selector', "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // ── Дизайн-система «Электрик» (токены завязаны на CSS-переменные, см. index.css) ──
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        inverse: 'var(--surface-inverse)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        onaccent: 'var(--on-accent)',
        'accent-soft': 'var(--accent-soft)',
        // «lime» — денежно-позитивный цвет (теперь мятный), завязан на токен
        lime: 'var(--lime)',
        income: 'var(--income)',
        expense: 'var(--expense)',
        line: 'var(--border)',

        // ── Обратная совместимость со старыми классами (алиасы на новые токены) ──
        'surface-2': 'var(--surface-2)',
        'ink-muted': 'var(--text-muted)',
        hairline: 'var(--border)',
        // Любой оставшийся brand-* красится акцентом, а не янтарём.
        brand: {
          50: 'var(--accent-soft)',
          100: 'var(--accent-soft)',
          200: 'var(--border)',
          300: 'var(--accent)',
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent)',
          800: 'var(--accent)',
          900: 'var(--accent)',
        },
      },
      borderRadius: {
        card: '20px',
        lg2: '24px',
        pill: '999px',
        xl2: '1.375rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      maxWidth: {
        app: '28rem',
      },
      fontFamily: {
        sans: ['Onest', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Unbounded', 'Onest', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'none' },
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
        rise: 'rise 0.35s cubic-bezier(0.2,0.8,0.2,1) both',
        'fade-in': 'fade-in 0.25s ease both',
      },
    },
  },
  plugins: [],
}
