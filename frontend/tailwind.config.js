/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#feefd6',
          200: '#fcdcac',
          300: '#fac177',
          400: '#f79940',
          500: '#f5781a',
          600: '#e65c10',
          700: '#be4610',
          800: '#973715',
          900: '#7b2f14',
          950: '#431608',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [],
}