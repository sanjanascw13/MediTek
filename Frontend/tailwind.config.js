/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        meditek: {
          sidebar: '#131b14',
          sidebarActive: '#a3e635',
          sidebarActiveText: '#142008',
          sidebarHover: '#1c281e',
          heroFrom: '#0f1711',
          heroTo: '#172419',
          lime: '#84cc16',
          limeLight: '#ecfccb',
          darkBg: '#0b0f0c',
          cardDark: '#161f18',
          borderDark: '#223125',
          lightBg: '#f6f8f6',
          primary: '#16a34a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

