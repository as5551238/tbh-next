/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0c12',
        surface: '#13161f',
        'surface-2': '#1a1e2b',
        'surface-3': '#222739',
        border: '#272d42',
        'border-2': '#333a52',
        primary: '#7b6cf0',
        'primary-2': '#a99cf7',
        accent: '#00d4aa',
        danger: '#ff5c6a',
        warn: '#ffc44d',
        success: '#22c984',
        it: '#4facfe',
        manuf: '#f5a623',
        edu: '#4ecdc4',
        finance: '#a78bfa',
        text: '#eaecf4',
        'text-2': '#9ca3b8',
        'text-3': '#7d869e',
      },
      fontFamily: {
        sans: ['-apple-system', 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      borderRadius: {
        lg: '16px',
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
