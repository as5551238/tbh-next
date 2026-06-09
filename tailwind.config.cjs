/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Design Token → Tailwind映射 (经验教训L6转化) */
        bg: 'var(--bg-surface)',
        surface: 'var(--bg-surface-elevated)',
        'surface-2': 'var(--bg-surface-hover)',
        'surface-3': '#222739',
        border: 'var(--border-default)',
        'border-2': '#333a52',
        primary: 'var(--bg-primary)',
        'primary-2': 'var(--bg-primary-hover)',
        'primary-foreground': 'var(--bg-primary-foreground)',
        accent: '#00d4aa',
        danger: 'var(--status-danger)',
        warn: 'var(--status-warning)',
        success: 'var(--status-success)',
        info: 'var(--status-info)',
        it: '#4facfe',
        manuf: '#f5a623',
        edu: '#4ecdc4',
        finance: '#a78bfa',
        text: 'var(--text-primary)',
        'text-2': 'var(--text-secondary)',
        'text-3': 'var(--text-tertiary)',
        /* Brand palette */
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
      },
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
      },
      fontSize: {
        xs: 'var(--font-xs)',
        sm: 'var(--font-sm)',
        base: 'var(--font-base)',
        lg: 'var(--font-lg)',
        xl: 'var(--font-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      fontFamily: {
        sans: ['-apple-system', 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px rgba(0,212,170,0.3)' },
          '50%': { opacity: '0.5', boxShadow: '0 0 2px rgba(0,212,170,0.1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
