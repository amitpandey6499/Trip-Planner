/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A',
        },
        teal: {
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        surface: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
        'soft-lg': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        'elevated': '0 20px 30px -5px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}
