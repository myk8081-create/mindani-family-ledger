/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102033',
        navy: '#0f2a44',
        ocean: '#2563eb',
        skywash: '#eaf4ff',
        warm: '#f9735b',
        honey: '#f6b94b',
        mint: '#22c7a9',
      },
      boxShadow: {
        soft: '0 10px 28px rgba(15, 42, 68, 0.10)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
