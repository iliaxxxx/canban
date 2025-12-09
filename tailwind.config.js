/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zinc-950': '#09090b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bebas: ['Bebas Neue', 'cursive'],
        merriweather: ['Merriweather', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        oswald: ['Oswald', 'sans-serif'],
        raleway: ['Raleway', 'sans-serif'],
        caveat: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
