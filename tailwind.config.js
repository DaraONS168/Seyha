/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: { 18: '4.5rem' },
      fontFamily: { sans: ['Noto Sans Khmer', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04)' },
    },
  },
  plugins: [],
}
