import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1F66FF', light: '#E9F0FF', dark: '#0D47A1' },
        accent: { pink: '#FF2D55', purple: '#7C3AED', violet: '#8B5CF6' },
        surface: '#FFFFFF',
        muted: '#666666',
        faint: '#999999',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1F66FF 0%, #7C3AED 50%, #FF2D55 100%)',
        'hero-mesh': 'radial-gradient(at 20% 80%, #1F66FF44 0%, transparent 50%), radial-gradient(at 80% 20%, #7C3AED44 0%, transparent 50%), radial-gradient(at 50% 50%, #FF2D5522 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.6s ease-out',
        'slide-up-delayed': 'slide-up 0.8s ease-out 0.2s both',
        'fade-in': 'fade-in 0.8s ease-out',
        'counter': 'counter 2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card': '0 4px 24px -2px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 12px 40px -4px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 40px rgba(31, 102, 255, 0.15)',
        'glow-purple': '0 0 40px rgba(124, 58, 237, 0.15)',
      },
    },
  },
  plugins: [],
};
export default config;
