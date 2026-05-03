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
        white: '#ffffff',
        accent: '#FACC15',
        'gray-50': '#f9fafb',
        'gray-100': '#f3f4f6',
        'gray-500': '#6b7280',
        'gray-800': '#1f2937',
      },
    },
  },
  plugins: [],
}
