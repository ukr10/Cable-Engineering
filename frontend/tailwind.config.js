/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#071021",
          900: "#0C1B2A",
          850: "#0f2540",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
        }
      },
      fontFamily: {
        sans: ["Inter", "Poppins", "sans-serif"],
      }
    },
  },
  plugins: [],
}
