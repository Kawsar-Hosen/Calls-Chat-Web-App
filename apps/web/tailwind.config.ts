import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1F66FF', light: '#E9F0FF', dark: '#0D47A1' },
        surface: '#FFFFFF',
        muted: '#666666',
        faint: '#999999',
      },
    },
  },
  plugins: [],
};
export default config;
