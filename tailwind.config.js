/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hind: ['Hind', 'sans-serif'],
        baloo: ['"Baloo 2"', 'sans-serif'],
      },
      animation: {
        'bus-idle': 'busIdle 3.5s ease-in-out infinite',
        'bus-honk': 'busHonk 0.6s ease-in-out',
        'vinyl-spin': 'spin 2.2s linear infinite',
      },
      keyframes: {
        busIdle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        busHonk: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        }
      }
    },
  },
  plugins: [],
}
