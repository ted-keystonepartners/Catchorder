/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SUIT', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb74d',
          400: '#ff9800',
          500: '#FF3D00',
          600: '#E65100',
          700: '#BF360C',
          800: '#9A0007',
          900: '#7B1FA2',
        },
      },
    },
  },
  plugins: [],
}