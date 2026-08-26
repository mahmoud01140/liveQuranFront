/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D9E75',
          50: '#E1F5EE',
          100: '#C3EBD9',
          200: '#87D7B4',
          300: '#4BC28E',
          400: '#1D9E75',
          500: '#167A5B',
          600: '#0F5740',
          700: '#083325',
          800: '#041A13',
          900: '#020D09',
        },
        teacher: {
          DEFAULT: '#534AB7',
          light: '#EDE9FF',
        },
        senior: {
          DEFAULT: '#BA7517',
          light: '#FEF3E2',
        },
        quran: {
          green: '#1D9E75',
          gold: '#C9A227',
          dark: '#1A1A2E',
          surface: '#16213E',
        },
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'Cairo', 'sans-serif'],
        quran: ['Amiri', 'Scheherazade New', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseGreen: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(29,158,117,0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(29,158,117,0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backgroundImage: {
        'gradient-quran': 'linear-gradient(135deg, #1D9E75 0%, #0F5740 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A227 0%, #BA7517 100%)',
      },
      boxShadow: {
        'green':     '0 4px 20px rgba(29, 158, 117, 0.30)',
        'green-lg':  '0 8px 40px rgba(29, 158, 117, 0.40)',
        'card':      '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover':'0 8px 24px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        quranTheme: {
          'primary': '#1D9E75',
          'primary-content': '#ffffff',
          'secondary': '#534AB7',
          'secondary-content': '#ffffff',
          'accent': '#C9A227',
          'neutral': '#1A1A2E',
          'base-100': '#ffffff',
          'base-200': '#F8FFFE',
          'base-300': '#E1F5EE',
          'info': '#3B82F6',
          'success': '#1D9E75',
          'warning': '#BA7517',
          'error': '#EF4444',
        },
      },
    ],
    darkTheme: 'quranTheme',
  },
};
