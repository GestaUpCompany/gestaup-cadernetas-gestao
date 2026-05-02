/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a3a2a',
        secondary: '#2a4a3a',
        accent: '#f59e0b',
      },
    },
  },
  plugins: [],
}
