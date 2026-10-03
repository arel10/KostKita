/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ink: {
          50: '#f6f8fb',
          100: '#eef2f7',
          200: '#dde4ee',
          300: '#b9c4d4',
          400: '#8593a8',
          500: '#5d6b80',
          600: '#445166',
          700: '#2f3a4d',
          800: '#1c2536',
          900: '#0f1624',
          950: '#080d17',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,22,36,0.04), 0 4px 16px rgba(15,22,36,0.05)',
        glow: '0 8px 30px rgba(16,185,129,0.25)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(16px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
      },
      animation: {
        'fade-up': 'fadeUp .35s ease-out both',
        'slide-in': 'slideIn .3s ease-out both',
      },
    },
  },
  plugins: [],
};
