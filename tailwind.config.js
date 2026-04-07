/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        goal: {
          green: '#22c55e',
          red: '#ef4444',
          gray: '#6b7280',
        },
      },
    },
  },
  plugins: [],
}
