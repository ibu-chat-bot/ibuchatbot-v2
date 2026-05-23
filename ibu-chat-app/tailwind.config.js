/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ibu: {
          blue: "#1a3a6b",
          navy: "#1a3a6b",
          gold: "#c8a951",
        }
      }
    },
  },
  plugins: [],
}
