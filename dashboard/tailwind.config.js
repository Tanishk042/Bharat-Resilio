/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'resilio-primary': '#2563eb',
        'resilio-secondary': '#1e40af',
        'resilio-accent': '#f59e0b',
        'resilio-danger': '#dc2626',
        'resilio-success': '#16a34a',
      },
    },
  },
  plugins: [],
}
