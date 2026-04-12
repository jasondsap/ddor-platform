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
        ddor: {
          navy: '#0E2235',
          blue: '#1A73A8',
          teal: '#2BA5B5',
          light: '#F0F7FA',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
